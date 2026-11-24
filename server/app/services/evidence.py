from sqlalchemy import select
from app.extensions import db
from app.models import MediaAsset
from app.services.locations import validate_location, validate_pin
from app.services.media import serialize, readable


def farm_snapshot(farmer):
    keys=['farm_name','county_code','subcounty_code','ward_code','town','directions','landmark','latitude','longitude','land_tenure']
    values={key:getattr(farmer,key) for key in keys}
    validate_location(values,require=True,ward_required=True);validate_pin(values)
    for field in ['directions','landmark']:
        if not isinstance(values[field],str) or len(values[field].strip())<2: raise ValueError('Add farm directions and a nearby landmark.')
    if values['land_tenure'] not in ['owner','lease','family']: raise ValueError('Select whether you own, lease or use family land.')
    return values


def bind_evidence(user, verification, ids, snapshot):
    if not isinstance(ids,list) or not 4<=len(ids)<=25 or any(not isinstance(i,str) for i in ids) or len(set(ids))!=len(ids):
        raise ValueError('Choose 3–5 farm photographs and your land evidence, in page order.')
    rows=db.session.scalars(select(MediaAsset).where(MediaAsset.asset_id.in_(ids)).order_by(MediaAsset.asset_id).with_for_update()).all()
    if len(rows)!=len(ids) or any(row.owner_id!=user.user_id or row.verification_id or row.product_id or not readable(row) for row in rows):
        raise ValueError('Use your own available draft evidence. Submitted, removed or previously blocked files cannot be reused.')
    purposes=[row.purpose for row in rows]
    if not 3<=purposes.count('farm_photo')<=5: raise ValueError('Select 3–5 farm photographs.')
    required={'owner':['land_title'],'lease':['lease','ownership_support'],'family':['authorization','ownership_support']}[snapshot['land_tenure']]
    if any(purpose not in purposes for purpose in required): raise ValueError('Upload '+', '.join(p.replace('_',' ') for p in required)+'.')
    if any(purpose not in ['farm_photo',*required] for purpose in purposes): raise ValueError('Select only farm images and the evidence required for your land arrangement.')
    for row in rows:
        row.verification_id=verification.verification_id;row.page_order=ids.index(row.asset_id)


def documents(verification_id):
    rows=MediaAsset.query.filter_by(verification_id=verification_id,deleted_at=None).order_by(MediaAsset.page_order,MediaAsset.created_at).all()
    return [serialize(row) for row in rows]
