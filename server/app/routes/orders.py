"""Buyer reservations, farmer confirmation and buyer receipt confirmation."""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, fields, validate, ValidationError
from sqlalchemy import select, or_
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import User, Product, Order, OrderItem, Payment, FarmerProfile, BuyerProfile, AuditEvent, OrderIssue
from app.services.commerce import (now, iso, settings, expire_order, release_stock,
                                   record_order, processing_payment, paid_payment)

orders_bp = Blueprint('orders', __name__)


class CreateOrderItemSchema(Schema):
    product_id = fields.Int(required=True, strict=True, validate=validate.Range(min=1))
    quantity = fields.Decimal(required=True, as_string=True,
                              validate=validate.Range(min=Decimal('0.001'), max=Decimal('999999999.999')))


class CreateOrderSchema(Schema):
    items = fields.List(fields.Nested(CreateOrderItemSchema), required=True,
                        validate=validate.Length(min=1, max=100))
    split_by_farmer = fields.Bool(load_default=False)
    checkout_key = fields.Str(validate=validate.Regexp(r"^[a-zA-Z0-9-]{8,64}$"))


create_order_schema = CreateOrderSchema()


def error_response(code, message, status, details=None):
    return jsonify(error={'code': code, 'message': message, **({'fields': details} if details else {})}), status


def serialize_order(order):
    paid = next((p for p in order.payments if p.payment_status == 'paid'), None)
    processing = any(p.payment_status == 'pending' and p.provider_request_id for p in order.payments)
    return {
        'order_id': order.order_id, 'buyer_id': order.buyer_id, 'farmer_id': order.farmer_id,
        'buyer_name': order.buyer.user.full_name, 'farm_name': order.farmer.farm_name,
        'total_amount': str(order.total_amount), 'order_status': order.order_status,
        'payment_status': 'paid' if paid else 'processing' if processing else 'unpaid',
        'created_at': iso(order.created_at), 'confirmation_deadline': iso(order.confirmation_deadline),
        'payment_deadline': iso(order.payment_deadline), 'confirmed_at': iso(order.confirmed_at),
        'completed_at': iso(order.completed_at), 'rejection_reason': order.rejection_reason,
        'can_pay': order.order_status == 'confirmed' and not paid and not processing,
        'can_review': order.order_status == 'completed' and order.review is None,
        'has_open_issue': OrderIssue.query.filter_by(order_id=order.order_id, status='open').first() is not None,
        'items': [{'order_item_id': item.order_item_id, 'product_id': item.product_id,
                   'product_name': item.product_name, 'unit': item.unit,
                   'quantity': str(item.quantity), 'unit_price': str(item.unit_price),
                   'subtotal': str(item.subtotal)} for item in order.items],
    }


def owns_order(user, order):
    return bool((user.buyer_profile and order.buyer_id == user.buyer_profile.buyer_id) or
                (user.farmer_profile and order.farmer_id == user.farmer_profile.farmer_id))


@orders_bp.post('')
@jwt_required()
def create_order():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.buyer_profile:
        return error_response('BUYER_PROFILE_REQUIRED', 'Complete buyer details before ordering', 403)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response('INVALID_JSON', 'A JSON object is required', 400)
    try:
        data = create_order_schema.load(payload)
    except ValidationError as exc:
        return error_response('VALIDATION_ERROR', 'Invalid order data', 400, exc.messages)
    quantities = {}
    for item in data['items']:
        if item['quantity'].as_tuple().exponent < -3:
            return error_response('INVALID_QUANTITY', 'Quantity must have at most 3 decimal places', 400)
        if item['product_id'] in quantities:
            return error_response('DUPLICATE_PRODUCT', 'A product can appear only once per order', 400)
        quantities[item['product_id']] = item['quantity']
    import hashlib, json
    fingerprint = hashlib.sha256(json.dumps(sorted((key, str(value.normalize())) for key, value in quantities.items())).encode()).hexdigest()
    checkout_key = data.get('checkout_key')
    try:
        db.session.scalar(select(BuyerProfile).where(BuyerProfile.buyer_id == user.buyer_profile.buyer_id).with_for_update())
        if checkout_key:
            previous = Order.query.filter_by(buyer_id=user.buyer_profile.buyer_id, checkout_key=checkout_key).order_by(Order.order_id).all()
            if previous:
                if any(order.checkout_fingerprint != fingerprint for order in previous):
                    return error_response('CHECKOUT_KEY_REUSED', 'This checkout identifier belongs to a different cart', 409)
                result = {'orders': [serialize_order(order) for order in previous]} if data['split_by_farmer'] else serialize_order(previous[0])
                return jsonify(message='Existing checkout retrieved', data=result), 200
        existing = db.session.scalars(select(Product).where(Product.product_id.in_(quantities))).all()
        if len(existing) != len(quantities):
            return error_response('PRODUCT_NOT_FOUND', 'One or more products do not exist', 404)
        farmer_ids = sorted({p.farmer_id for p in existing})
        if len(farmer_ids) > 1 and not data['split_by_farmer']:
            return error_response('MULTIPLE_FARMERS', 'Use separate orders for each farmer', 400)
        # Serialize verification changes before taking product locks, consistently.
        farmers = db.session.scalars(select(FarmerProfile).where(FarmerProfile.farmer_id.in_(farmer_ids))
                                      .order_by(FarmerProfile.farmer_id).with_for_update()
                                      .execution_options(populate_existing=True)).all()
        if any(f.user_id == user.user_id for f in farmers):
            return error_response('SELF_PURCHASE', 'You cannot order your own produce', 403)
        if any(f.verification_status != 'approved' for f in farmers):
            return error_response('FARMER_NOT_VERIFIED', 'Orders require an approved farmer', 403)
        products = db.session.scalars(select(Product).where(Product.product_id.in_(quantities))
                                      .order_by(Product.product_id).with_for_update()
                                      .execution_options(populate_existing=True)).all()
        groups = {farmer_id: [] for farmer_id in farmer_ids}
        for product in products:
            quantity = quantities[product.product_id]
            if product.status != 'available':
                return error_response('PRODUCT_UNAVAILABLE', 'A selected product is unavailable', 409)
            if product.availability_date and product.availability_date > date.today():
                return error_response('PRODUCT_NOT_READY', 'A selected product is not available yet', 409)
            if product.quantity_available < quantity:
                return error_response('INSUFFICIENT_STOCK', f'Insufficient stock for {product.product_name}', 409)
            subtotal = (quantity * product.price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            if subtotal <= 0:
                return error_response('INVALID_SUBTOTAL', 'Order item subtotal must be positive', 400)
            groups[product.farmer_id].append((product, quantity, subtotal))
        totals = {farmer_id: sum((line[2] for line in lines), Decimal('0.00')) for farmer_id, lines in groups.items()}
        if any(total < Decimal('3.00') for total in totals.values()):
            return error_response('PAYSTACK_MINIMUM_AMOUNT', 'Each farmer order must total at least KSh 3.00 for Paystack checkout.', 400)
        if any(total > Decimal('9999999999.99') for total in totals.values()):
            return error_response('ORDER_TOTAL_TOO_LARGE', 'Order total exceeds the allowed limit', 400)
        created = []
        for farmer_id, lines in groups.items():
            order = Order(buyer_id=user.buyer_profile.buyer_id, farmer_id=farmer_id,
                          total_amount=totals[farmer_id], order_status='pending',
                          checkout_key=checkout_key, checkout_fingerprint=fingerprint,
                          confirmation_deadline=now()+timedelta(hours=settings().confirmation_hours))
            db.session.add(order); db.session.flush()
            for product, quantity, subtotal in lines:
                db.session.add(OrderItem(order_id=order.order_id, product_id=product.product_id,
                                          product_name=product.product_name, unit=product.unit,
                                          quantity=quantity, unit_price=product.price, subtotal=subtotal))
                product.quantity_available -= quantity
                if product.quantity_available == 0:
                    product.status = 'sold_out'
            record_order(order, 'placed', user.user_id, f'The farmer must confirm by {iso(order.confirmation_deadline)} before payment. Stock is reserved until that deadline.')
            created.append(order)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response('ORDER_CONFLICT', 'Order could not be created', 409)
    result = {'orders': [serialize_order(o) for o in created]} if data['split_by_farmer'] else serialize_order(created[0])
    return jsonify(message='Order submitted for farmer confirmation', data=result), 201


@orders_bp.get('')
@jwt_required()
def list_orders():
    user = db.session.get(User, int(get_jwt_identity()))
    view = request.args.get('view')
    if view not in (None, 'buyer', 'farmer'):
        return error_response('INVALID_VIEW', 'View must be buyer or farmer', 400)
    filters = []
    if user.buyer_profile and view != 'farmer':
        filters.append(Order.buyer_id == user.buyer_profile.buyer_id)
    if user.farmer_profile and view != 'buyer':
        filters.append(Order.farmer_id == user.farmer_profile.farmer_id)
    if not filters:
        return error_response('PROFILE_REQUIRED', 'Complete the relevant profile first', 403)
    orders = db.session.scalars(select(Order).where(or_(*filters)).order_by(Order.order_id.desc())).all()
    return jsonify(data=[serialize_order(o) for o in orders], count=len(orders))


@orders_bp.get('/<int:order_id>')
@jwt_required()
def get_order(order_id):
    user = db.session.get(User, int(get_jwt_identity()))
    order = db.session.get(Order, order_id)
    if not order or not owns_order(user, order):
        return error_response('ORDER_NOT_FOUND', 'Order not found', 404)
    result = serialize_order(order)
    result['history'] = [{'action': event.action, 'details': event.details, 'created_at': iso(event.created_at)}
                         for event in AuditEvent.query.filter_by(entity_type='order', entity_id=order_id).order_by(AuditEvent.event_id).all()]
    return jsonify(data=result)


@orders_bp.patch('/<int:order_id>/status')
@jwt_required()
def update_order_status(order_id):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) - {'status', 'reason'} or not isinstance(payload.get('status'), str):
        return error_response('INVALID_REQUEST', 'Submit status and an optional reason', 400)
    target = payload['status']
    if target not in ('confirmed', 'rejected', 'cancelled', 'completed'):
        return error_response('INVALID_STATUS', 'Unsupported V1 order status', 400)
    user = db.session.get(User, int(get_jwt_identity()))
    order = db.session.scalar(select(Order).where(Order.order_id == order_id).with_for_update()
                              .execution_options(populate_existing=True))
    if not order or not owns_order(user, order):
        return error_response('ORDER_NOT_FOUND', 'Order not found', 404)
    buyer = bool(user.buyer_profile and order.buyer_id == user.buyer_profile.buyer_id)
    farmer = bool(user.farmer_profile and order.farmer_id == user.farmer_profile.farmer_id)
    if expire_order(order):
        db.session.commit()
        return error_response('ORDER_EXPIRED', 'This order has expired', 409)
    if target in ('confirmed', 'rejected'):
        if not farmer:
            return error_response('FORBIDDEN', 'Only the farmer can confirm or reject', 403)
        if order.order_status != 'pending':
            return error_response('INVALID_STATUS_TRANSITION', 'Only awaiting-confirmation orders can be confirmed or rejected', 409)
        if target == 'confirmed':
            if order.farmer.verification_status != 'approved':
                return error_response('FARMER_NOT_VERIFIED', 'Farmer approval is required', 403)
            order.confirmed_at = now()
            order.payment_deadline = now()+timedelta(hours=settings().payment_hours)
        else:
            reason = payload.get('reason')
            if not isinstance(reason, str) or not 3 <= len(reason.strip()) <= 1000:
                return error_response('REASON_REQUIRED', 'Provide a rejection reason (3–1000 characters)', 400)
            order.rejection_reason = reason.strip()
            release_stock(order)
    elif target == 'cancelled':
        if not buyer:
            return error_response('FORBIDDEN', 'The buyer can cancel; farmers can reject or request resolution', 403)
        if order.order_status not in ('pending', 'confirmed'):
            return error_response('CANCELLATION_NOT_ALLOWED', 'Submit a resolution request for a paid order', 409)
        if processing_payment(order) or paid_payment(order):
            return error_response('PAYMENT_IN_PROGRESS', 'Reconcile the payment before cancellation', 409)
        release_stock(order)
    elif target == 'completed':
        if not buyer:
            return error_response('FORBIDDEN', 'Only the buyer can confirm receipt', 403)
        if order.order_status != 'paid' or not paid_payment(order):
            return error_response('INVALID_STATUS_TRANSITION', 'Receipt can only be confirmed after verified payment', 409)
        if OrderIssue.query.filter_by(order_id=order_id, status='open').first():
            return error_response('OPEN_RESOLUTION', 'Resolve the open request before completing the order', 409)
        order.completed_at = now()
    order.order_status = target
    record_order(order, 'receipt_confirmed' if target == 'completed' else target, user.user_id, order.rejection_reason if target == 'rejected' else f'Farmer confirmed. Pay by {iso(order.payment_deadline)}.' if target == 'confirmed' else None)
    db.session.commit()
    return jsonify(message='Order updated', data=serialize_order(order))
