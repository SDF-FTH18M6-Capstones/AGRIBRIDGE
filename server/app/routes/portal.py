"""Database-backed portal resources; authorization is always server side."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select
from app.extensions import db
from app.models import User, FarmerProfile, BuyerProfile, FieldOfficer, FarmerVerification, Order, Payment
from app.routes.orders import serialize_order
from app.routes.payments import serialize_payment
from app.routes.farmer_verifications import serialize_verification

portal_bp = Blueprint('portal', __name__)


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def is_admin(user):
    return user and user.admin_profile and user.admin_profile.status == 'active'


def denied():
    return jsonify(error={'code': 'FORBIDDEN', 'message': 'Active administrator access is required'}), 403


@portal_bp.get('/admin/<resource>')
@jwt_required()
def admin_resources(resource):
    if not is_admin(current_user()):
        return denied()
    if resource == 'products':
        from app.models import Product
        from app.schemas.product_schema import product_search_schema
        rows = product_search_schema.dump(Product.query.order_by(Product.product_id.desc()).all())
    elif resource == 'orders':
        rows = [serialize_order(row) for row in db.session.scalars(select(Order).order_by(Order.order_id.desc())).all()]
    elif resource == 'payments':
        rows = [serialize_payment(row) for row in db.session.scalars(select(Payment).order_by(Payment.payment_id.desc())).all()]
    elif resource == 'farmers':
        rows = [{'farmer_id': p.farmer_id, 'full_name': p.user.full_name, 'email': p.user.email,
                 'farm_name': p.farm_name, 'location': p.location, 'verification_status': p.verification_status}
                for p in FarmerProfile.query.order_by(FarmerProfile.farmer_id).all()]
    elif resource == 'buyers':
        rows = [{'buyer_id': p.buyer_id, 'full_name': p.user.full_name, 'business_name': p.business_name,
                 'location': p.location, 'buyer_type': p.buyer_type} for p in BuyerProfile.query.all()]
    elif resource == 'field-officers':
        rows = [{'field_officer_id': p.field_officer_id, 'full_name': p.user.full_name,
                 'email': p.user.email, 'staff_number': p.staff_number, 'status': p.status, 'coverage': p.coverage or []}
                for p in FieldOfficer.query.all()]
    else:
        return jsonify(error={'message': 'Resource not found'}), 404
    return jsonify(data=rows)


@portal_bp.get('/field-officer/verifications')
@jwt_required()
def assigned_verifications():
    user = current_user()
    officer = user.field_officer
    if not officer or officer.status != 'active':
        return jsonify(error={'message': 'An active field officer account is required'}), 403
    rows = FarmerVerification.query.filter_by(field_officer_id=officer.field_officer_id).all()
    return jsonify(data=[serialize_verification(row) for row in rows])


@portal_bp.get('/payments')
@jwt_required()
def list_payments():
    user = current_user()
    query = select(Payment).join(Order)
    view = request.args.get("view")
    if view not in (None, "buyer", "farmer"):
        return jsonify(error={"message": "Invalid payment view"}), 400
    filters = []
    if user.buyer_profile and view != "farmer":
        filters.append(Order.buyer_id == user.buyer_profile.buyer_id)
    if user.farmer_profile and view != "buyer":
        filters.append(Order.farmer_id == user.farmer_profile.farmer_id)
    if not filters:
        return jsonify(error={"message": "A matching profile is required"}), 403
    from sqlalchemy import or_
    query = query.where(or_(*filters))
    return jsonify(data=[serialize_payment(p) for p in db.session.scalars(query.order_by(Payment.payment_id.desc())).all()])


@portal_bp.get('/farmers/<int:farmer_id>')
def public_farmer(farmer_id):
    farmer = db.session.get(FarmerProfile, farmer_id)
    if not farmer:
        return jsonify(error={'message': 'Farmer not found'}), 404
    return jsonify(data={'farmer_id': farmer.farmer_id, 'farm_name': farmer.farm_name,
                         'location': farmer.location, 'description': farmer.description,
                         'verification_status': farmer.verification_status})


@portal_bp.patch('/account')
@jwt_required()
def update_account():
    from sqlalchemy.exc import IntegrityError
    import re
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) - {'full_name', 'phone_number'}:
        return jsonify(error={'message': 'Only full_name and phone_number are accepted'}), 400
    name = payload.get('full_name')
    phone = payload.get('phone_number')
    if not isinstance(name, str) or not 2 <= len(name.strip()) <= 100:
        return jsonify(error={'message': 'Full name must contain 2–100 characters'}), 400
    if phone is not None and (not isinstance(phone, str) or not re.fullmatch(r'(?:\+254|254|0)[17]\d{8}', phone.strip())):
        return jsonify(error={'message': 'Enter a valid Kenyan mobile number'}), 400
    user = current_user()
    user.full_name = name.strip()
    user.phone_number = phone.strip() if phone else None
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(error={'message': 'Phone number is already registered'}), 409
    from app.routes.profiles import get_user_data
    return jsonify(data=get_user_data(user))


@portal_bp.post('/admin/field-officers')
@jwt_required()
def create_officer():
    from app.schemas.user_schema import UserSchema
    from app.models import Role
    from marshmallow import ValidationError
    from sqlalchemy.exc import IntegrityError
    if not is_admin(current_user()):
        return denied()
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error={'message': 'A JSON object is required'}), 400
    staff = payload.get('staff_number')
    if not isinstance(staff, str) or not 1 <= len(staff.strip()) <= 100:
        return jsonify(error={'message': 'A staff number of 1–100 characters is required'}), 400
    try:
        values = UserSchema().load({key: value for key, value in payload.items() if key != 'staff_number'})
    except ValidationError as error:
        return jsonify(error={'message': 'Invalid officer account', 'details': error.messages}), 400
    try:
        role = Role.query.filter_by(role_name='field-officer').first()
        if not role:
            role = Role(role_name='field-officer'); db.session.add(role); db.session.flush()
        user = User(full_name=values['full_name'].strip(), email=values['email'], role=role)
        user.set_password(values['password']); db.session.add(user); db.session.flush()
        officer = FieldOfficer(user_id=user.user_id, staff_number=staff.strip(), status='active')
        db.session.add(officer); db.session.commit()
        return jsonify(data={'field_officer_id': officer.field_officer_id}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify(error={'message': 'Email or staff number already exists'}), 409


@portal_bp.patch('/admin/field-officers/<int:officer_id>/coverage')
@jwt_required()
def officer_coverage(officer_id):
    if not is_admin(current_user()): return denied()
    from app.services.locations import COUNTIES, SUBCOUNTIES
    payload=request.get_json(silent=True) or {}
    rows=payload.get('coverage') if isinstance(payload,dict) else None
    if not isinstance(rows,list) or len(rows)>50: return jsonify(error={'message':'Provide at most 50 coverage areas.'}),400
    for row in rows:
        if not isinstance(row,dict) or row.get('county_code') not in COUNTIES: return jsonify(error={'message':'Select a valid coverage county.'}),400
        sub=row.get('subcounty_code')
        if sub and (sub not in SUBCOUNTIES or SUBCOUNTIES[sub]['county_code']!=row['county_code']): return jsonify(error={'message':'Coverage subcounty does not belong to this county.'}),400
    officer=db.session.get(FieldOfficer,officer_id)
    if not officer: return jsonify(error={'message':'Officer not found.'}),404
    officer.coverage=[{k:r[k] for k in ['county_code','subcounty_code'] if r.get(k)} for r in rows]
    db.session.commit()
    return jsonify(message='Coverage updated.',data=officer.coverage)
