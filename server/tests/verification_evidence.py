"""Explicit valid evidence fixtures for the original authorization/transition tests.

No providers are called. New upload/scan/ownership failures are exercised separately
in test_topics_1_4.py rather than bypassing production checks.
"""
from uuid import uuid4
from flask_jwt_extended import decode_token
from app.extensions import db
from app.models import User, MediaAsset, FarmerVerification
from app.services.locations import DATA


def actor(headers):
    token=(headers or {}).get('Authorization','').removeprefix('Bearer ')
    return db.session.get(User,int(decode_token(token)['sub'])) if token else None


def fixture_asset(user,purpose,verification_id=None):
    key=uuid4().hex
    asset=MediaAsset(asset_id=key,owner_id=user.user_id,purpose=purpose,public_id='test/'+key,
                     resource_type='image',delivery_type='authenticated',file_format='jpg',file_size=100,
                     original_name='Test evidence.jpg',scan_status='approved',page_order=0,verification_id=verification_id)
    db.session.add(asset);return key


def verification_payload(payload,headers):
    if not isinstance(payload,dict) or not payload.get('farm_location'): return payload
    user=actor(headers)
    if not user or not user.farmer_profile: return payload
    farmer=user.farmer_profile
    county='032';sub=next(r['code'] for r in DATA['subcounties'] if r['county_code']==county)
    ward=next(r['code'] for r in DATA['wards'] if r['sub_county_code']==sub)
    farmer.county_code=county;farmer.subcounty_code=sub;farmer.ward_code=ward
    farmer.latitude=-0.3;farmer.longitude=36.1;farmer.directions='Test directions';farmer.landmark='Test landmark';farmer.land_tenure='owner'
    ids=[fixture_asset(user,'farm_photo') for _ in range(3)]+[fixture_asset(user,'land_title')]
    db.session.commit();return {**payload,'asset_ids':ids}


def inspection_payload(payload,headers,url):
    if not isinstance(payload,dict) or payload.get('action') not in ['submit','review']: return payload
    user=actor(headers)
    try: vid=int(url.rstrip('/').rsplit('/',1)[-1])
    except ValueError: return payload
    if user and db.session.get(FarmerVerification,vid):
        from app.services.commerce import audit
        if payload['action']=='submit': fixture_asset(user,'inspection_photo',vid)
        rows=MediaAsset.query.filter_by(verification_id=vid).all()
        for row in rows:
            if payload['action']=='submit' and row.purpose.startswith('inspection_'): continue
            audit('media_review',vid,'file_reviewed',user.user_id,asset_id=row.asset_id,
                  stage='officer' if payload['action']=='submit' else 'admin',decision='accepted',note='Test fixture: evidence reviewed.')
        db.session.commit()
    if payload['action']=='review': return {'documents_reviewed':True,**payload}
    return {'documents_reviewed':True,'location_matches':True,'visit_date':'2026-11-24T09:00:00',**payload}
