"""Acceptance/security coverage for topics 1–4. No shared DB or provider traffic."""
from datetime import timedelta
from io import BytesIO
from unittest.mock import patch
import pytest
from PIL import Image
from pypdf import PdfWriter
from app import create_app
from app.extensions import db
from app.models import (User, BuyerProfile, FarmerProfile, FieldOfficer, Admin, AuthSession,
                        MediaAsset, FarmerVerification, PasswordResetToken, Product, Category)
from app.services.commerce import now, aware
from app.services.locations import DATA
from app.services.sessions import digest

PASSWORD='HarvestFields2026!'

@pytest.fixture
def env():
    app=create_app({'TESTING':True,'SQLALCHEMY_DATABASE_URI':'sqlite:///:memory:','SECRET_KEY':'x'*40,
                    'JWT_SECRET_KEY':'y'*40,'BCRYPT_LOG_ROUNDS':4,'MAIL_SERVER':None,
                    'CLOUDINARY_CLOUD_NAME':'test-cloud','CLOUDINARY_API_KEY':'test-key','CLOUDINARY_API_SECRET':'test-secret'})
    with app.app_context():
        db.create_all();users={}
        for name in ['buyer','farmer','other','officer','admin']:
            user=User(full_name=name.title(),email=f'{name}@example.com');user.set_password(PASSWORD)
            db.session.add(user);db.session.flush();users[name]=user
        county='047';sub=next(row['code'] for row in DATA['subcounties'] if row['county_code']==county)
        ward=next(row['code'] for row in DATA['wards'] if row['sub_county_code']==sub)
        fp=FarmerProfile(user_id=users['farmer'].user_id,farm_name='Test farm',location='Nairobi',county_code=county,subcounty_code=sub,
                         ward_code=ward,town='Nairobi',latitude=-1.286,longitude=36.817,directions='Follow the main road',landmark='Water tower',land_tenure='owner')
        db.session.add_all([fp,BuyerProfile(user_id=users['buyer'].user_id,buyer_type='individual',location='Nairobi'),
                            FieldOfficer(user_id=users['officer'].user_id,staff_number='TOPICS-1'),Admin(user_id=users['admin'].user_id)])
        db.session.commit()
        client=app.test_client();headers={}
        for name in users:
            result=client.post('/api/login',headers={'X-Tab-ID':name+'-tab'},json={'email':users[name].email,'password':PASSWORD})
            assert result.status_code==200,result.json
            headers[name]={'Authorization':'Bearer '+result.json['data']['access_token'],'X-Tab-ID':name+'-tab'}
        yield app,client,users,headers
        db.session.remove();db.drop_all()


def login(env,name,tab):
    _,client,users,_=env
    response=client.post('/api/login',headers={'X-Tab-ID':tab},json={'email':users[name].email,'password':PASSWORD})
    assert response.status_code==200,response.json
    data=response.json['data'];return data,{'Authorization':'Bearer '+data['access_token'],'X-Tab-ID':tab}


def photo():
    data=BytesIO();Image.new('RGB',(40,40),'green').save(data,format='JPEG');data.seek(0);return data


def pdf():
    data=BytesIO();writer=PdfWriter();writer.add_blank_page(width=200,height=200);writer.write(data);data.seek(0);return data


def upload(env,purpose='farm_photo',who='farmer',scan='approved',**extra):
    _,client,_,headers=env
    def provider(file,**options):
        assert options['type']=='authenticated' and 'moderation' not in options
        return {'public_id':options['public_id'],'type':'authenticated','asset_id':'cloud-'+options['public_id'],
                'moderation':[]}
    with patch('cloudinary.uploader.upload',side_effect=AssertionError('Unexpected remote upload')) as remote:
        response=client.post('/api/media',headers=headers[who],data={'purpose':purpose,'file':(photo(),'farm.jpg'),**extra},content_type='multipart/form-data')
        remote.assert_not_called()
    assert response.status_code==201,response.json
    if scan=='rejected':
        asset=db.session.get(MediaAsset,response.json['data']['asset_id']);asset.scan_status='rejected';db.session.commit()
    return response.json['data']


def application(env,tenure='owner'):
    _,client,users,headers=env
    users['farmer'].farmer_profile.land_tenure=tenure;db.session.commit()
    purposes={'owner':['land_title'],'lease':['lease','ownership_support'],'family':['authorization','ownership_support']}[tenure]
    assets=[upload(env)['asset_id'] for _ in range(3)]+[upload(env,purpose=purpose)['asset_id'] for purpose in purposes]
    response=client.post('/api/farmer-verifications',headers=headers['farmer'],json={'farm_location':'Nairobi test farm','asset_ids':assets})
    assert response.status_code==201,response.json
    return response.json['data'],assets


def test_location_reference_parent_links_and_private_coordinates(env):
    _,client,users,headers=env
    result=client.get('/api/locations').json['data'];assert len(result['counties'])==47
    assert len(result['wards'])==1450
    county={r['code'] for r in result['counties']};sub={r['code']:r for r in result['subcounties']}
    assert all(row['county_code'] in county for row in sub.values())
    assert all(sub[row['sub_county_code']]['county_code']==row['county_code'] for row in result['wards'])
    public=client.get(f'/api/farmers/{users["farmer"].farmer_profile.farmer_id}').json['data']
    assert 'latitude' not in public and 'longitude' not in public and 'directions' not in public
    assert client.get('/api/profiles/me',headers=headers['farmer']).json['data']['farmer_profile']['latitude']==-1.286


def test_buyer_structured_location_required_and_cannot_cross_counties(env):
    _,client,_,headers=env
    path='/api/profiles/me';payload={'profile_type':'buyer','buyer_type':'individual','location':'Nairobi','town':'Nairobi'}
    assert client.put(path,headers=headers['other'],json=payload).status_code==400
    assert client.put(path,headers=headers['other'],json={**payload,'county_code':'001','subcounty_code':'04701'}).status_code==400
    response=client.put(path,headers=headers['other'],json={**payload,'county_code':'047','subcounty_code':'04701'})
    assert response.status_code==200 and response.json['user']['capabilities']['buyer']


def test_farm_draft_allowed_but_missing_or_nonfinite_pin_cannot_submit(env):
    _,client,users,headers=env
    users['farmer'].farmer_profile.latitude=None;db.session.commit()
    response=client.post('/api/farmer-verifications',headers=headers['farmer'],json={'farm_location':'Nairobi','asset_ids':[]})
    assert response.status_code==400 and response.json['error']['code']=='FARM_LOCATION_REQUIRED'
    response=client.put('/api/profiles/me',headers=headers['other'],json={'profile_type':'farmer','farm_name':'Draft farm','location':'Nairobi'})
    assert response.status_code==200 and response.json['user']['capabilities']['farmer'] is False


@pytest.mark.parametrize('password',['onlylowercase123!','ONLYUPPERCASE123!','NoNumbersHere!!','NoSpecials12345','Short1!','Password123456!','ü'*37])
def test_password_policy_is_enforced_on_registration(env,password):
    _,client,_,_=env
    response=client.post('/api/register',headers={'X-Tab-ID':'new-tab'},json={'full_name':'New User','email':'new@example.com','password':password})
    assert response.status_code==400
    assert User.query.filter_by(email='new@example.com').first() is None


def test_registration_scope_and_confirmation_match(env):
    _,client,_,_=env
    body={'full_name':'New User','email':'new@example.com','password':PASSWORD,'role':'farmer'}
    assert client.post('/api/register',headers={'X-Tab-ID':'new'},json={**body,'confirm_password':'mismatch'}).status_code==400
    response=client.post('/api/register',headers={'X-Tab-ID':'new'},json={**body,'confirm_password':PASSWORD})
    assert response.status_code==201
    assert response.json['data']['user']['role'] is None
    assert not any(response.json['data']['user']['capabilities'].values())
    assert response.json['data']['refresh_token'] and response.json['data']['session']


def test_same_account_tabs_and_other_accounts_are_independent(env):
    _,client,users,_=env
    a,ha=login(env,'buyer','A');b,hb=login(env,'buyer','B');_,hc=login(env,'other','C')
    before=db.session.get(AuthSession,b['session']['session_id']).last_activity_at
    assert client.post('/api/sessions/activity',headers=ha,json={}).status_code==200
    assert db.session.get(AuthSession,b['session']['session_id']).last_activity_at==before
    assert client.post('/api/logout',headers=ha).status_code==200
    assert client.get('/api/profiles/me',headers=ha).status_code==401
    assert client.get('/api/profiles/me',headers=hb).status_code==200
    assert client.get('/api/profiles/me',headers=hc).status_code==200
    assert client.get('/api/profiles/me',headers={**hb,'X-Tab-ID':'wrong'}).status_code==401


def test_polling_does_not_count_as_activity_and_staff_is_stricter(env):
    _,client,_,_=env
    a,ha=login(env,'buyer','A');staff,hs=login(env,'officer','staff')
    assert a['session']['idle_minutes']==60 and staff['session']['idle_minutes']==15
    row=db.session.get(AuthSession,a['session']['session_id']);before=row.last_activity_at
    for _ in range(2): assert client.get('/api/sessions/current',headers=ha).status_code==200
    assert row.last_activity_at==before
    row.last_activity_at=now()-timedelta(minutes=61);db.session.commit()
    assert client.post('/api/sessions/activity',headers=ha,json={}).status_code==401
    staffrow=db.session.get(AuthSession,staff['session']['session_id']);staffrow.last_activity_at=now()-timedelta(minutes=16);db.session.commit()
    assert client.get('/api/sessions/current',headers=hs).status_code==401


def test_refresh_rotates_replay_revokes_only_that_session(env):
    _,client,_,_=env
    a,ha=login(env,'buyer','A');_,hb=login(env,'buyer','B')
    path='/api/sessions/refresh';body={'refresh_token':a['refresh_token']}
    renewed=client.post(path,headers={'X-Tab-ID':'A'},json=body)
    assert renewed.status_code==200 and renewed.json['data']['refresh_token']!=a['refresh_token']
    assert client.post(path,headers={'X-Tab-ID':'A'},json=body).status_code==401
    assert client.get('/api/profiles/me',headers=ha).status_code==401
    assert client.get('/api/profiles/me',headers=hb).status_code==200


def test_session_listing_revocation_and_password_confirmation(env):
    _,client,_,_=env
    a,ha=login(env,'buyer','A');b,hb=login(env,'buyer','B');c,hc=login(env,'other','C')
    rows=client.get('/api/sessions',headers=ha).json['data']
    assert not any(row['session_id']==c['session']['session_id'] for row in rows)
    assert client.delete(f'/api/sessions/{c["session"]["session_id"]}',headers=ha).status_code==404
    row=db.session.get(AuthSession,a['session']['session_id']);row.verified_at=now()-timedelta(minutes=6);db.session.commit()
    assert client.post('/api/sessions/revoke',headers=ha,json={'scope':'others'}).json['error']['code']=='REAUTH_REQUIRED'
    assert client.post('/api/sessions/reauthenticate',headers=ha,json={'password':'wrong'}).status_code==400
    assert client.post('/api/sessions/reauthenticate',headers=ha,json={'password':PASSWORD}).status_code==200
    assert client.post('/api/sessions/revoke',headers=ha,json={'scope':'others'}).status_code==200
    assert client.get('/api/profiles/me',headers=ha).status_code==200
    assert client.get('/api/profiles/me',headers=hb).status_code==401
    assert client.get('/api/profiles/me',headers=hc).status_code==200


def test_reset_revokes_access_and_refresh_and_change_requires_strong_password(env):
    _,client,users,_=env
    a,ha=login(env,'buyer','A');_,hb=login(env,'buyer','B')
    assert client.post('/api/change-password',headers=ha,json={'current_password':PASSWORD,'new_password':'weak','confirm_password':'weak'}).status_code==400
    db.session.add(PasswordResetToken(user_id=users['buyer'].user_id,token_hash=digest('reset-token'),expires_at=now()+timedelta(minutes=5)));db.session.commit()
    assert client.post('/api/reset-password',json={'token':'reset-token','new_password':'FreshHarvest2027!','confirm_new_password':'FreshHarvest2027!'}).status_code==200
    assert client.get('/api/profiles/me',headers=ha).status_code==401
    assert client.get('/api/profiles/me',headers=hb).status_code==401
    assert client.post('/api/sessions/refresh',headers={'X-Tab-ID':'A'},json={'refresh_token':a['refresh_token']}).status_code==401


def test_database_uploads_validate_content_without_provider_configuration(env):
    app,client,_,headers=env
    app.config['CLOUDINARY_API_SECRET']=None
    with patch('cloudinary.uploader.upload') as provider:
        assert client.post('/api/media',headers=headers['farmer'],data={'purpose':'farm_photo','file':(photo(),'a.jpg')}).status_code==201
        provider.assert_not_called()
    app.config['CLOUDINARY_API_SECRET']='test-secret'
    with patch('cloudinary.uploader.upload') as provider:
        assert client.post('/api/media',headers=headers['farmer'],data={'purpose':'farm_photo','file':(BytesIO(b'not an image'),'a.jpg')}).status_code==400
        provider.assert_not_called()


@pytest.mark.parametrize('tenure',['owner','lease','family'])
def test_complete_land_evidence_submits_immutable_snapshot(env,tenure):
    _,client,users,headers=env
    result,ids=application(env,tenure)
    assert result['location_snapshot']['land_tenure']==tenure
    assert result['location_snapshot']['latitude']==-1.286
    assert [asset['asset_id'] for asset in result['documents']]==ids
    assert client.delete('/api/media/'+ids[0],headers=headers['farmer']).status_code==409
    profile=users['farmer'].farmer_profile
    response=client.put('/api/profiles/me',headers=headers['farmer'],json={'farm_name':profile.farm_name,'location':profile.location,'latitude':-1.5,'profile_type':'farmer'})
    assert response.status_code==409


def test_blocked_foreign_and_incomplete_evidence_are_rejected(env):
    _,client,users,headers=env
    ids=[upload(env)['asset_id'] for _ in range(3)]+[upload(env,purpose='land_title',scan='rejected')['asset_id']]
    path='/api/farmer-verifications';payload={'farm_location':'Nairobi','asset_ids':ids}
    assert client.post(path,headers=headers['farmer'],json=payload).status_code==400
    asset=db.session.get(MediaAsset,ids[-1]);asset.scan_status='approved';asset.owner_id=users['other'].user_id;db.session.commit()
    assert client.post(path,headers=headers['farmer'],json=payload).status_code==400
    asset.owner_id=users['farmer'].user_id;db.session.commit()
    assert client.post(path,headers=headers['farmer'],json={**payload,'asset_ids':ids[1:]}).status_code==400
    assert FarmerVerification.query.count()==0


def test_private_access_and_officer_review_require_assignment_photo_and_location(env):
    _,client,users,headers=env
    result,ids=application(env);vid=result['verification_id']
    path=f'/api/farmer-verifications/{vid}';access=f'/api/media/{ids[0]}/access'
    assert client.get(access,headers=headers['other']).status_code==404
    assert client.get(access,headers=headers['officer']).status_code==404
    assert client.get(f'/api/media/{ids[0]}/public').status_code==404
    officer=users['officer'].field_officer
    assert client.patch(path,headers=headers['admin'],json={'action':'assign','field_officer_id':officer.field_officer_id}).status_code==200
    with patch('cloudinary.utils.private_download_url',return_value='https://example.invalid/temporary') as signed:
        assert client.get(access,headers=headers['officer']).status_code==200
        signed.assert_not_called()
    for asset_id in ids:
        assert client.post(f'/api/media/{asset_id}/reviews',headers=headers['officer'],json={'stage':'officer','decision':'accepted','note':'Readable and relevant evidence checked.'}).status_code==200
    report={'documents_reviewed':True,'action':'submit','recommendation':'approve','remarks':'Farm and permission to farm inspected.','visit_date':'2026-11-24T10:00:00','location_matches':True}
    assert client.patch(path,headers=headers['officer'],json=report).status_code==400
    upload(env,purpose='inspection_photo',who='officer',verification_id=str(vid))
    assert client.patch(path,headers=headers['officer'],json={**report,'location_matches':False}).status_code==400
    assert client.patch(path,headers=headers['officer'],json=report).status_code==200
    decision={'documents_reviewed':True,'action':'review','decision':'approved','remarks':'Evidence and inspection reviewed.'}
    assert client.patch(path,headers=headers['admin'],json=decision).status_code==409
    for asset in client.get('/api/farmer-verifications',headers=headers['admin']).json['data'][0]['documents']:
        assert client.post(f'/api/media/{asset["asset_id"]}/reviews',headers=headers['admin'],json={'stage':'admin','decision':'accepted','note':'Evidence and officer report checked.'}).status_code==200
    assert client.patch(path,headers=headers['admin'],json=decision).status_code==200
    assert users['farmer'].farmer_profile.verification_status=='approved'


def test_pdf_uploads_need_no_addon_and_remain_private_for_manual_review(env):
    _,client,_,headers=env
    def provider(file,**options):
        assert options['resource_type']=='raw' and 'moderation' not in options
        return {'public_id':options['public_id'],'type':'authenticated','asset_id':'pdf-asset'}
    with patch('cloudinary.uploader.upload',side_effect=provider):
        response=client.post('/api/media',headers=headers['farmer'],data={'purpose':'land_title','file':(pdf(),'deed.pdf')})
    assert response.status_code==201,response.json
    asset=db.session.get(MediaAsset,response.json['data']['asset_id'])
    assert asset.scan_status=='not_scanned'
    assert response.json['data']['review_status']=='pending'
    assert response.json['data']['can_preview'] is True
    assert client.get(f'/api/media/{asset.asset_id}/access',headers=headers['other']).status_code==404
    with patch('cloudinary.utils.private_download_url',return_value='https://example.invalid/private-document'):
        assert client.get(f'/api/media/{asset.asset_id}/access',headers=headers['farmer']).status_code==200


def test_logout_works_with_rotated_refresh_credentials_and_does_not_affect_other_tabs(env):
    _,client,_,_=env
    a,ha=login(env,'buyer','A');_,hb=login(env,'buyer','B')
    rotated=client.post('/api/sessions/refresh',headers={'X-Tab-ID':'A'},json={'refresh_token':a['refresh_token']})
    assert rotated.status_code==200
    assert client.post('/api/sessions/end',headers={'X-Tab-ID':'wrong'},json={'refresh_token':a['refresh_token']}).status_code==404
    assert client.post('/api/sessions/end',headers={'X-Tab-ID':'A'},json={'refresh_token':a['refresh_token']}).status_code==200
    assert client.get('/api/profiles/me',headers=ha).status_code==401
    assert client.get('/api/profiles/me',headers=hb).status_code==200
    assert client.post('/api/sessions/refresh',headers={'X-Tab-ID':'A'},json={'refresh_token':rotated.json['data']['refresh_token']}).status_code==401


def test_absolute_session_expiry_cannot_be_extended_by_activity(env):
    _,client,_,_=env
    data,headers=login(env,'buyer','A')
    session=db.session.get(AuthSession,data['session']['session_id'])
    session.expires_at=now()-timedelta(seconds=1);session.last_activity_at=now();db.session.commit()
    assert client.post('/api/sessions/activity',headers=headers,json={}).status_code==401
    assert client.post('/api/sessions/refresh',headers={'X-Tab-ID':'A'},json={'refresh_token':data['refresh_token']}).status_code==401


def test_validated_product_images_follow_verified_farmer_publication_rules(env):
    _,client,users,headers=env
    farmer=users['farmer'].farmer_profile;farmer.verification_status='approved'
    category=Category(category_name='Fruit');db.session.add(category);db.session.flush()
    product=Product(farmer_id=farmer.farmer_id,category_id=category.category_id,product_name='Mangoes',price=100,quantity_available=10,unit='kg',status='available')
    db.session.add(product);db.session.commit()
    result=upload(env,purpose='product_image',product_id=str(product.product_id))
    assert result['public_url'] is not None
    assert result['review_status']=='ready'
    asset=db.session.get(MediaAsset,result['asset_id'])
    with patch('cloudinary.utils.private_download_url',return_value='https://example.invalid/public-photo'):
        assert client.get(f'/api/media/{asset.asset_id}/public').status_code==200
    assert client.delete(f'/api/media/{asset.asset_id}',headers=headers['farmer']).status_code==200
    assert client.get(f'/api/media/{asset.asset_id}/public').status_code==404


def test_removed_draft_storage_cleanup_keeps_audit_metadata(env):
    _,client,_,headers=env
    result=upload(env)
    assert client.delete(f'/api/media/{result["asset_id"]}',headers=headers['farmer']).status_code==200
    from app.services.media import purge_removed_assets
    with patch('cloudinary.uploader.destroy',return_value={'result':'ok'}) as destroy:
        assert purge_removed_assets()==1
        assert purge_removed_assets()==0
        destroy.assert_not_called()
        from app.models import MediaContent
        assert db.session.get(MediaContent,result['asset_id']) is None
    stored=db.session.get(MediaAsset,result['asset_id'])
    assert stored is not None and stored.deleted_at is not None and stored.scan_status=='deleted'


def test_database_upload_needs_no_cloudinary_credentials(env):
    app,client,_,headers=env
    app.config.update(CLOUDINARY_CLOUD_NAME='',CLOUDINARY_API_KEY='',CLOUDINARY_API_SECRET='')
    with patch('cloudinary.uploader.upload',side_effect=AssertionError('No external upload permitted')):
        result=upload(env)
    from app.models import MediaContent
    asset=db.session.get(MediaAsset,result['asset_id'])
    assert asset.storage_backend=='database'
    assert db.session.get(MediaContent,asset.asset_id).data.startswith(b'\xff\xd8')
    assert client.get('/api/media/availability',headers=headers['farmer']).json['data']['available'] is True


def test_database_private_links_validate_session_permissions_and_expiry(env):
    _,client,users,headers=env
    result=upload(env);asset_id=result['asset_id']
    path=f'/api/media/{asset_id}'
    assert client.get(path+'/content').status_code==403
    url=client.get(path+'/access',headers=headers['farmer']).json['data']['url']
    response=client.get(url)
    assert response.status_code==200 and response.mimetype=='image/jpeg'
    assert response.headers['Cache-Control']=='no-store'
    assert response.headers['X-Content-Type-Options']=='nosniff'
    assert client.get(url.replace(asset_id,'wrong',1)).status_code==403
    with patch('itsdangerous.timed.time.time',return_value=now().timestamp()+121):
        assert client.get(url).status_code==403
    users['farmer'].auth_version+=1;db.session.commit()
    assert client.get(url).status_code==403


def test_database_private_links_stop_after_session_logout(env):
    _,client,_,headers=env
    result=upload(env)
    url=client.get(f'/api/media/{result["asset_id"]}/access',headers=headers['farmer']).json['data']['url']
    from flask_jwt_extended import decode_token
    session=db.session.get(AuthSession,decode_token(headers['farmer']['Authorization'].split()[1])['sid'])
    session.revoked_at=now();db.session.commit()
    assert client.get(url).status_code==403


def assign_manual_application(env):
    _,client,users,headers=env
    result,ids=application(env)
    assert client.patch(f'/api/farmer-verifications/{result["verification_id"]}',headers=headers['admin'],json={'action':'assign','field_officer_id':users['officer'].field_officer.field_officer_id}).status_code==200
    return result['verification_id'],ids


def test_manual_reviews_are_role_scoped_and_keep_decision_history(env):
    _,client,_,headers=env
    vid,ids=assign_manual_application(env)
    path=f'/api/media/{ids[0]}/reviews'
    review={'stage':'officer','decision':'rejected','note':'The photographed page is unreadable. Please replace it.'}
    assert client.post(path,headers=headers['farmer'],json=review).status_code==403
    assert client.post(path,headers=headers['other'],json=review).status_code==404
    assert client.post(path,headers=headers['officer'],json={**review,'stage':'admin'}).status_code==403
    response=client.post(path,headers=headers['officer'],json=review)
    assert response.status_code==200 and response.json['data']['review_status']=='changes_requested'
    response=client.post(path,headers=headers['officer'],json={**review,'decision':'accepted','note':'Rechecked the original page; its text is readable.'})
    assert response.status_code==200 and response.json['data']['reviews']['officer']['decision']=='accepted'
    from app.models import AuditEvent
    records=AuditEvent.query.filter_by(entity_type='media_review',entity_id=vid).order_by(AuditEvent.event_id).all()
    assert [row.details['decision'] for row in records]==['rejected','accepted']
    assert all(type(row.entity_id) is int for row in AuditEvent.query.all())


def test_officer_cannot_recommend_approval_with_unreviewed_or_rejected_evidence(env):
    _,client,_,headers=env
    vid,ids=assign_manual_application(env)
    upload(env,purpose='inspection_photo',who='officer',verification_id=str(vid))
    path=f'/api/farmer-verifications/{vid}'
    report={'action':'submit','documents_reviewed':True,'recommendation':'approve','remarks':'Farm inspected in person.','location_matches':True,'visit_date':'2026-11-24T10:00:00'}
    assert client.patch(path,headers=headers['officer'],json=report).status_code==409
    for i,asset_id in enumerate(ids):
        assert client.post(f'/api/media/{asset_id}/reviews',headers=headers['officer'],json={'stage':'officer','decision':'rejected' if i==0 else 'accepted','note':'Replace the unclear photo.' if i==0 else 'Readable evidence checked.'}).status_code==200
    assert client.patch(path,headers=headers['officer'],json=report).status_code==409
    assert client.patch(path,headers=headers['officer'],json={**report,'recommendation':'reject'}).status_code==200
    assert client.patch(path,headers=headers['admin'],json={'action':'review','decision':'rejected','documents_reviewed':True,'remarks':'Replace the first photograph and reapply.'}).status_code==200
    assert client.post(f'/api/media/{ids[0]}/reviews',headers=headers['officer'],json={'stage':'officer','decision':'accepted','note':'Attempt to change finalized review.'}).status_code==409


def test_local_pdf_script_validation_is_retained_without_external_scanning(env):
    _,client,_,headers=env
    data=BytesIO();writer=PdfWriter();writer.add_blank_page(width=200,height=200);writer.add_js("app.alert('test')");writer.write(data);data.seek(0)
    with patch('cloudinary.uploader.upload') as provider:
        response=client.post('/api/media',headers=headers['farmer'],data={'purpose':'land_title','file':(data,'script.pdf')})
        assert response.status_code==400
        provider.assert_not_called()


def test_legacy_scan_switch_does_not_disable_manual_uploads(env):
    app,_,_,_=env
    app.config['MEDIA_SCANNING_ENABLED']=False
    result=upload(env)
    assert result['can_preview'] is True and result['review_status']=='pending'
    assert 'scan_status' not in result


def test_database_pdf_roundtrip_and_legacy_cloudinary_access(env):
    _,client,_,headers=env
    document=pdf().getvalue()
    response=client.post('/api/media',headers=headers['farmer'],data={'purpose':'land_title','file':(BytesIO(document),'deed.pdf')})
    assert response.status_code==201
    asset_id=response.json['data']['asset_id']
    url=client.get(f'/api/media/{asset_id}/access',headers=headers['farmer']).json['data']['url']
    response=client.get(url)
    assert response.data==document and response.mimetype=='application/pdf'
    assert response.headers['Content-Disposition'].startswith('attachment;')
    asset=db.session.get(MediaAsset,asset_id)
    asset.storage_backend='cloudinary';asset.public_id='legacy/deed.pdf';db.session.commit()
    with patch('cloudinary.utils.private_download_url',return_value='https://example.invalid/legacy') as signed:
        result=client.get(f'/api/media/{asset_id}/access',headers=headers['farmer'])
        assert result.json['data']['url']=='https://example.invalid/legacy'
        assert signed.call_args.kwargs['type']=='authenticated'
