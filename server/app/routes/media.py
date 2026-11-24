from flask import Blueprint, request, jsonify, redirect, send_file, current_app
from io import BytesIO
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select
from app.extensions import db
from app.models import User, MediaAsset, FarmerVerification, Product, ProductImage, MediaContent, AuthSession, RevokedToken
from app.services import media
from app.services.commerce import audit, now

media_bp=Blueprint('media',__name__)


def fail(message,status=400): return jsonify(error={'code':'UPLOAD_ERROR','message':message}),status


def authorized(asset,user):
    if user.admin_profile and user.admin_profile.status=='active': return True
    if asset.owner_id==user.user_id: return True
    verification=asset.verification
    return bool(verification and (verification.farmer.user_id==user.user_id or user.field_officer and user.field_officer.status=='active' and verification.field_officer_id==user.field_officer.field_officer_id))


@media_bp.get('/media/availability')
@jwt_required()
def availability():
    return jsonify(data={'available':media.ready(),'message':'Uploads are ready.' if media.ready() else 'File uploads are currently unavailable. Contact the administrator to enable secure uploads.'})


@media_bp.get('/media')
@jwt_required()
def list_media():
    uid=int(get_jwt_identity());rows=MediaAsset.query.filter_by(owner_id=uid,deleted_at=None).order_by(MediaAsset.created_at,MediaAsset.asset_id).all()
    return jsonify(data=[media.serialize(row) for row in rows])


@media_bp.post('/media')
@jwt_required()
def upload():
    user=db.session.get(User,int(get_jwt_identity()));purpose=request.form.get('purpose');file=request.files.get('file')
    if purpose not in media.PURPOSES or not file or not file.filename: return fail('Choose a file and a valid upload purpose.')
    verification_id=product_id=None
    if purpose.startswith('inspection_'):
        try: verification_id=int(request.form.get('verification_id',''))
        except ValueError: return fail('Choose an assigned verification.')
        verification=db.session.scalar(select(FarmerVerification).where(FarmerVerification.verification_id==verification_id).with_for_update().execution_options(populate_existing=True))
        if not verification or not user.field_officer or user.field_officer.status!='active' or verification.field_officer_id!=user.field_officer.field_officer_id or verification.status!='assigned':
            return fail('Only the assigned officer can upload inspection evidence before submission.',403)
    elif purpose=='product_image':
        try: product_id=int(request.form.get('product_id',''))
        except ValueError: return fail('Choose your product.')
        product=db.session.get(Product,product_id)
        if not product or not user.farmer_profile or product.farmer_id!=user.farmer_profile.farmer_id or user.farmer_profile.verification_status!='approved':
            return fail('Only the verified product owner can upload product images.',403)
    elif not user.farmer_profile: return fail('Save your farm profile before uploading verification evidence.',403)
    if not media.ready(): return fail('File uploads are currently unavailable. No file was uploaded. Contact the administrator.',503)
    try: asset=media.store(file,purpose,user.user_id,verification_id,product_id)
    except media.MediaError as exc: return fail(str(exc))
    if product_id:
        db.session.add(ProductImage(product_id=product_id,image_url=asset.public_url))
    audit('user',user.user_id,'media_uploaded',user.user_id,asset_id=asset.asset_id,purpose=purpose)
    db.session.commit()
    return jsonify(data=media.serialize(asset),message='Uploaded and content-validated. Verification evidence will be reviewed by your assigned officer and administrator.'),201


@media_bp.get('/media/<asset_id>/access')
@jwt_required()
def access(asset_id):
    user=db.session.get(User,int(get_jwt_identity()));asset=db.session.get(MediaAsset,asset_id)
    if not asset or asset.deleted_at or not authorized(asset,user): return fail('File not found.',404)
    if not media.readable(asset): return fail('This file was previously blocked. Upload a replacement.',409)
    if asset.storage_backend!='database' and not media.configured(): return fail('Legacy file storage is not configured.',503)
    audit('user',user.user_id,'media_accessed',user.user_id,asset_id=asset.asset_id);db.session.commit()
    response=jsonify(data={'url':media.access_url(asset),'expires_in':120});response.headers['Cache-Control']='no-store';return response


@media_bp.get('/media/<asset_id>/public')
def public(asset_id):
    asset=db.session.get(MediaAsset,asset_id)
    product=db.session.get(Product,asset.product_id) if asset and asset.product_id else None
    if not asset or asset.deleted_at or asset.purpose!='product_image' or not media.readable(asset) or not product or product.status=='inactive' or product.farmer.verification_status!='approved':
        return fail('Image not found.',404)
    if asset.storage_backend!='database' and not media.configured(): return fail('Legacy file storage is not configured.',503)
    if asset.storage_backend=='database': return file_response(asset)
    response=redirect(media.access_url(asset));response.headers['Cache-Control']='no-store';return response


def file_response(asset):
    content=db.session.get(MediaContent,asset.asset_id)
    if content is None: return fail('File not found.',404)
    response=send_file(BytesIO(content.data),mimetype={'jpg':'image/jpeg','png':'image/png','pdf':'application/pdf'}[asset.file_format],
        as_attachment=asset.file_format=='pdf',download_name='file.'+asset.file_format,max_age=0)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    return response


@media_bp.get('/media/<asset_id>/content')
def content(asset_id):
    """A two-minute bearer link, rechecked against current session and permissions."""
    from itsdangerous import URLSafeTimedSerializer, BadData
    from app.services.sessions import valid
    try:
        claims=URLSafeTimedSerializer(current_app.config['SECRET_KEY'],salt='private-media-v1').loads(request.args.get('token',''),max_age=120)
        user=db.session.get(User,int(claims['sub']))
    except (BadData,ValueError,TypeError,KeyError): return fail('File access has expired or is invalid.',403)
    if claims.get('asset_id')!=asset_id or not user or claims.get('auth_version')!=user.auth_version or not claims.get('jti'):
        return fail('File access has expired or is invalid.',403)
    if RevokedToken.query.filter_by(jti=claims['jti']).first(): return fail('File access has expired or is invalid.',403)
    session=db.session.get(AuthSession,claims['sid']) if claims.get('sid') else None
    if (claims.get('sid') and (not session or session.user_id!=user.user_id or not valid(session))) or (not claims.get('sid') and not current_app.testing):
        return fail('File access has expired or is invalid.',403)
    asset=db.session.get(MediaAsset,asset_id)
    if not asset or asset.storage_backend!='database' or not media.readable(asset) or not authorized(asset,user): return fail('File not found.',404)
    return file_response(asset)


@media_bp.delete('/media/<asset_id>')
@jwt_required()
def remove(asset_id):
    user=db.session.get(User,int(get_jwt_identity()))
    candidate=db.session.get(MediaAsset,asset_id)
    if not candidate or candidate.deleted_at or candidate.owner_id!=user.user_id: return fail('File not found.',404)
    if candidate.verification_id:
        db.session.scalar(select(FarmerVerification).where(FarmerVerification.verification_id==candidate.verification_id).with_for_update().execution_options(populate_existing=True))
    asset=db.session.scalar(select(MediaAsset).where(MediaAsset.asset_id==asset_id).with_for_update().execution_options(populate_existing=True))
    if asset.deleted_at: return fail('File not found.',404)
    if asset.verification_id and not (asset.purpose.startswith('inspection_') and asset.verification.status=='assigned'):
        return fail('Submitted evidence is preserved. Upload replacements in a new application after feedback.',409)
    if asset.product_id:
        ProductImage.query.filter_by(product_id=asset.product_id,image_url=asset.public_url).delete()
    asset.deleted_at=now();audit('user',user.user_id,'media_removed_from_draft',user.user_id,asset_id=asset.asset_id);db.session.commit()
    return jsonify(message='Removed from your draft.')


@media_bp.post('/media/<asset_id>/reviews')
@jwt_required()
def review_file(asset_id):
    user=db.session.get(User,int(get_jwt_identity()))
    payload=request.get_json(silent=True)
    if not isinstance(payload,dict) or set(payload)!={'stage','decision','note'} or payload.get('stage') not in ['officer','admin'] or payload.get('decision') not in ['accepted','rejected']:
        return fail('Provide the review stage, an accepted/rejected decision, and a review note.')
    note=payload.get('note')
    if not isinstance(note,str) or not 5<=len(note.strip())<=1000: return fail('Write 5–1000 characters explaining your file review.')
    candidate=db.session.get(MediaAsset,asset_id)
    if not candidate or not candidate.verification_id: return fail('Submitted evidence not found.',404)
    # Match the application -> asset lock order used by final review and removal.
    verification=db.session.scalar(select(FarmerVerification).where(FarmerVerification.verification_id==candidate.verification_id).with_for_update().execution_options(populate_existing=True))
    asset=db.session.scalar(select(MediaAsset).where(MediaAsset.asset_id==asset_id).with_for_update().execution_options(populate_existing=True))
    if not authorized(asset,user): return fail('Submitted evidence not found.',404)
    stage=payload['stage']
    if user.user_id==verification.farmer.user_id: return fail('You cannot review your own verification evidence.',403)
    if stage=='officer':
        if not user.field_officer or user.field_officer.status!='active' or verification.field_officer_id!=user.field_officer.field_officer_id or asset.purpose.startswith('inspection_'):
            return fail('Only the assigned active officer can review the farmer’s submitted evidence.',403)
        if verification.status!='assigned': return fail('Officer evidence review is closed for this application.',409)
    else:
        if not user.admin_profile or user.admin_profile.status!='active': return fail('An active administrator is required.',403)
        if verification.status not in ['assigned','submitted']: return fail('Administrator evidence review is closed for this application.',409)
    if not media.readable(asset): return fail('This file is unavailable. Ask the farmer for a replacement.',409)
    audit('media_review',verification.verification_id,'file_reviewed',user.user_id,asset_id=asset.asset_id,
          stage=stage,decision=payload['decision'],note=note.strip())
    db.session.commit()
    from flask import g
    g.media_review_cache={}
    return jsonify(message='Manual file review saved.',data=media.serialize(asset))
