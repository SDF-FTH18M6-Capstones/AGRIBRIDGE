"""Validated database uploads and private, audited human evidence review."""
from io import BytesIO
from uuid import uuid4
import warnings
from flask import current_app
from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader
import cloudinary.uploader
import cloudinary.utils
from app.extensions import db
from app.models import MediaAsset, MediaContent
from app.services.commerce import now

PURPOSES = {'farm_photo','land_title','lease','authorization','ownership_support','inspection_photo','inspection_report','product_image'}
IMAGE_PURPOSES = {'farm_photo','inspection_photo','product_image'}


class MediaError(ValueError): pass


def options():
    return {name:current_app.config.get('CLOUDINARY_'+name.upper()) for name in ['cloud_name','api_key','api_secret']}


def configured(): return all(options().values())


def ready(): return True


def validated_file(file, purpose):
    raw=file.stream.read(10*1024*1024+1)
    if not raw: raise MediaError('The selected file is empty.')
    if len(raw)>10*1024*1024: raise MediaError('PDF documents must be at most 10 MB.')
    if raw.startswith(b'%PDF-'):
        if purpose in IMAGE_PURPOSES: raise MediaError('Choose a photograph, not a PDF.')
        try:
            pdf=PdfReader(BytesIO(raw),strict=True)
            if pdf.is_encrypted or not 1<=len(pdf.pages)<=100: raise ValueError()
            root=pdf.trailer['/Root']
            if any(key in root for key in ['/OpenAction','/AA']): raise ValueError()
            names=root.get('/Names',{})
            if hasattr(names,'get_object'): names=names.get_object()
            if any(key in names for key in ['/JavaScript','/EmbeddedFiles']): raise ValueError()
            for page in pdf.pages:
                if '/AA' in page: raise ValueError()
        except Exception as exc: raise MediaError('Choose a readable, unencrypted PDF without embedded scripts or attachments.') from exc
        return raw,'pdf','raw'
    if len(raw)>5*1024*1024: raise MediaError('Photographs must be at most 5 MB after compression. Choose a smaller image.')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error',Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                if image.format not in ['JPEG','PNG','WEBP']: raise ValueError()
                image.verify()
            with Image.open(BytesIO(raw)) as image:
                image.load()
                # Strip EXIF, including GPS. The approved pin is kept in private application data.
                output=BytesIO()
                if image.mode not in ['RGB','RGBA']: image=image.convert('RGB')
                image.save(output,format='PNG' if image.mode=='RGBA' else 'JPEG',**({} if image.mode=='RGBA' else {'quality':90}))
                cleaned=output.getvalue()
                if len(cleaned)>5*1024*1024: raise MediaError('This image is too large. Choose a smaller photograph.')
                return cleaned,'png' if image.mode=='RGBA' else 'jpg','image'
    except MediaError: raise
    except (ValueError,OSError,UnidentifiedImageError,Image.DecompressionBombError,Image.DecompressionBombWarning) as exc:
        raise MediaError('Choose a valid JPEG, PNG or WebP image. Export unsupported phone formats as JPEG first.') from exc


def store(file, purpose, owner_id, verification_id=None, product_id=None):
    raw,fmt,resource=validated_file(file,purpose)
    asset_id=uuid4().hex
    public_id='database/'+asset_id
    asset=MediaAsset(asset_id=asset_id,owner_id=owner_id,verification_id=verification_id,product_id=product_id,purpose=purpose,
                     public_id=public_id,storage_backend='database',resource_type=resource,delivery_type='authenticated',
                     file_format=fmt,file_size=len(raw),original_name=(file.filename or 'Upload').replace('\\','/').split('/')[-1][:200],
                     scan_status='not_scanned',page_order=0)
    if purpose=='product_image': asset.public_url=f'/api/media/{asset_id}/public'
    db.session.add(asset);db.session.flush()
    db.session.add(MediaContent(asset_id=asset_id,data=raw));db.session.flush()
    return asset


def access_url(asset):
    if asset.storage_backend == 'database':
        from flask import url_for
        from flask_jwt_extended import get_jwt
        from itsdangerous import URLSafeTimedSerializer
        claims=get_jwt()
        token=URLSafeTimedSerializer(current_app.config['SECRET_KEY'],salt='private-media-v1').dumps(
            {'asset_id':asset.asset_id,**{key:claims.get(key) for key in ['sub','sid','jti','auth_version']}})
        return url_for('media.content',asset_id=asset.asset_id,token=token)
    return cloudinary.utils.private_download_url(asset.public_id,asset.file_format,type='authenticated',
            resource_type=asset.resource_type,expires_at=int(now().timestamp())+120,attachment=asset.resource_type=='raw',**options())


def readable(asset):
    # Preserve historical rejections; new files are content-validated, not scanned.
    return not asset.deleted_at and asset.scan_status not in {'rejected','deleted'}


def review_records(verification_id):
    from flask import g, has_request_context, request
    from app.models import AuditEvent
    if has_request_context() and getattr(g,'media_review_request',None) is not request._get_current_object():
        g.media_review_request=request._get_current_object();g.media_review_cache={}
    cache=getattr(g,'media_review_cache',{}) if has_request_context() else {}
    if verification_id in cache: return cache[verification_id]
    records={}
    if verification_id:
        rows=AuditEvent.query.filter_by(entity_type='media_review',entity_id=verification_id).order_by(AuditEvent.event_id.desc()).all()
        for row in rows:
            details=row.details or {};asset_id=details.get('asset_id');stage=details.get('stage')
            if not asset_id or stage not in ['officer','admin']: continue
            records.setdefault(asset_id,{})
            if stage not in records[asset_id]:
                records[asset_id][stage]={'decision':details.get('decision'),'note':details.get('note',''),
                    'reviewer_id':row.actor_id,'reviewed_at':row.created_at.isoformat()}
    if has_request_context():
        cache[verification_id]=records;g.media_review_cache=cache
    return records


def review_status(asset,reviews=None):
    if not readable(asset): return 'blocked'
    if asset.purpose=='product_image': return 'ready'
    reviews=reviews if reviews is not None else review_records(asset.verification_id).get(asset.asset_id,{})
    if any(row['decision']=='rejected' for row in reviews.values()): return 'changes_requested'
    if reviews.get('admin',{}).get('decision')=='accepted': return 'accepted'
    if reviews.get('officer',{}).get('decision')=='accepted': return 'officer_accepted'
    return 'pending'


def review_complete(verification_id,stage,accepted=False):
    rows=MediaAsset.query.filter_by(verification_id=verification_id,deleted_at=None).all()
    if stage=='officer': rows=[row for row in rows if not row.purpose.startswith('inspection_')]
    records=review_records(verification_id)
    return bool(rows) and all(readable(row) and records.get(row.asset_id,{}).get(stage,{}).get('decision') in (['accepted'] if accepted else ['accepted','rejected']) for row in rows)


def serialize(asset):
    reviews=review_records(asset.verification_id).get(asset.asset_id,{})
    return {'asset_id':asset.asset_id,'purpose':asset.purpose,'name':asset.original_name,'format':asset.file_format,
            'bytes':asset.file_size,'review_status':review_status(asset,reviews),'reviews':reviews,
            'can_preview':readable(asset),'verification_id':asset.verification_id,
            'product_id':asset.product_id,'page_order':asset.page_order,'created_at':asset.created_at.isoformat(),
            'access_path':f'/media/{asset.asset_id}/access','public_url':asset.public_url if readable(asset) else None}


def purge_removed_assets(limit=20):
    """Clean up draft/product copies after removal; submitted evidence is retained."""
    rows=MediaAsset.query.filter(MediaAsset.deleted_at.is_not(None),MediaAsset.scan_status!='deleted').order_by(MediaAsset.updated_at).limit(limit).all()
    count=0
    for asset in rows:
        try:
            if asset.storage_backend=='database':
                MediaContent.query.filter_by(asset_id=asset.asset_id).delete()
                result={'result':'ok'}
            elif configured():
                result=cloudinary.uploader.destroy(asset.public_id,resource_type=asset.resource_type,type='authenticated',invalidate=True,timeout=15,**options())
            else:
                result={}
            if result.get('result') in ['ok','not found']:
                asset.scan_status='deleted';count+=1
        except Exception: current_app.logger.warning('Removed media %s is awaiting storage cleanup',asset.asset_id)
        asset.updated_at=now();db.session.commit()
    return count
