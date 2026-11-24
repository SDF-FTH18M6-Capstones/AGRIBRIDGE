"""V1 account notifications, transaction resolution and operational settings."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models import User, Order, OrderIssue, Notification, AuditEvent, MarketplaceSettings, FarmerProfile
from app.services.commerce import (now, iso, settings, audit, notify, notify_admins,
                                   paid_payment, processing_payment, release_stock, record_order)
from app.routes.orders import owns_order, error_response

v1_bp = Blueprint('v1', __name__)


def current_user():
    return db.session.get(User, int(get_jwt_identity()))


def admin_user():
    user = current_user()
    return user if user.admin_profile and user.admin_profile.status == 'active' else None


def issue_data(issue):
    return {'issue_id': issue.issue_id, 'order_id': issue.order_id, 'issue_type': issue.issue_type,
            'reason': issue.reason, 'status': issue.status, 'resolution_note': issue.resolution_note,
            'refund_reference': issue.refund_reference, 'created_at': iso(issue.created_at),
            'reviewed_at': iso(issue.reviewed_at), 'order_status': issue.order.order_status}


@v1_bp.get('/notifications')
@jwt_required()
def notifications():
    rows = Notification.query.filter_by(user_id=current_user().user_id).order_by(Notification.notification_id.desc()).limit(200).all()
    return jsonify(data=[{'notification_id': row.notification_id, 'title': row.title,
                          'message': row.message, 'link': row.link, 'created_at': iso(row.created_at),
                          'read_at': iso(row.read_at)} for row in rows])


@v1_bp.patch('/notifications/<int:notification_id>')
@jwt_required()
def read_notification(notification_id):
    row = Notification.query.filter_by(notification_id=notification_id, user_id=current_user().user_id).first()
    if not row:
        return error_response('NOT_FOUND', 'Notification not found', 404)
    row.read_at = row.read_at or now()
    db.session.commit()
    return jsonify(message='Notification marked read')


@v1_bp.get('/order-issues')
@jwt_required()
def issues():
    user = current_user()
    if admin_user():
        rows = OrderIssue.query.order_by(OrderIssue.issue_id.desc()).all()
    else:
    
        rows = [row for row in OrderIssue.query.order_by(OrderIssue.issue_id.desc()).all()
                if owns_order(user, row.order)]
    return jsonify(data=[issue_data(row) for row in rows])


@v1_bp.post('/orders/<int:order_id>/issues')
@jwt_required()
def request_resolution(order_id):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {'issue_type', 'reason'}:
        return error_response('INVALID_REQUEST', 'Submit issue_type and reason', 400)
    reason = payload.get('reason')
    if payload['issue_type'] not in ('cancellation', 'refund', 'payment') or not isinstance(reason, str) or not 5 <= len(reason.strip()) <= 2000:
        return error_response('INVALID_REQUEST', 'Choose a request type and explain the issue (5–2000 characters)', 400)
    user = current_user()
    order = db.session.scalar(select(Order).where(Order.order_id == order_id).with_for_update())
    if not order or not owns_order(user, order):
        return error_response('NOT_FOUND', 'Order not found', 404)
    if order.order_status in ('cancelled', 'rejected', 'expired') and not paid_payment(order) and not processing_payment(order):
        return error_response('ORDER_CLOSED', 'This order is already closed', 409)
    if OrderIssue.query.filter_by(order_id=order_id, status='open').first():
        return error_response('OPEN_REQUEST', 'An open resolution request already exists for this order', 409)
    issue = OrderIssue(order_id=order_id, requested_by=user.user_id, issue_type=payload['issue_type'], reason=reason.strip())
    db.session.add(issue); db.session.flush()
    record_order(order, 'resolution_requested', user.user_id, reason.strip())
    notify_admins('Order resolution requested', f'Order #{order_id} needs review: {payload["issue_type"]}.')
    db.session.commit()
    return jsonify(data=issue_data(issue)), 201


@v1_bp.patch('/admin/order-issues/<int:issue_id>')
@jwt_required()
def resolve_issue(issue_id):
    user = admin_user()
    if not user:
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) - {'decision', 'note', 'refund_reference', 'refund_verified', 'restock_confirmed'}:
        return error_response('INVALID_REQUEST', 'Invalid resolution payload', 400)
    decision, note = payload.get('decision'), payload.get('note')
    if decision not in ('reject', 'cancel', 'refund_verified', 'resolved') or not isinstance(note, str) or not 5 <= len(note.strip()) <= 2000:
        return error_response('INVALID_REQUEST', 'Choose a decision and record a resolution note', 400)
    issue = db.session.get(OrderIssue, issue_id)
    if not issue:
        return error_response('NOT_FOUND', 'Resolution request not found', 404)
    
    order = db.session.scalar(select(Order).where(Order.order_id == issue.order_id).with_for_update().execution_options(populate_existing=True))
    issue = db.session.scalar(select(OrderIssue).where(OrderIssue.issue_id == issue_id).with_for_update().execution_options(populate_existing=True))
    if issue.status != 'open':
        return error_response('ALREADY_RESOLVED', 'This request has already been reviewed', 409)
    payment = paid_payment(order)
    if decision == 'cancel':
        if payment or processing_payment(order) or order.order_status not in ('pending', 'confirmed'):
            return error_response('PAYMENT_REQUIRES_REVIEW', 'Reconcile or verify a refund before cancellation', 409)
        release_stock(order)
        order.order_status = 'cancelled'
    elif decision == 'refund_verified':
        reference = payload.get('refund_reference')
        if not payment or payload.get('refund_verified') is not True or not isinstance(reference, str) or not 3 <= len(reference.strip()) <= 100:
            return error_response('REFUND_VERIFICATION_REQUIRED', 'Confirm the external refund and provide its reference', 400)
        
        payment.payment_status = 'refunded'
        if payload.get('restock_confirmed') is True:
            release_stock(order)
        order.order_status = 'cancelled'
        issue.refund_reference = reference.strip()
    elif decision == 'resolved' and processing_payment(order):
        return error_response('PROVIDER_UNCONFIRMED', 'A processing charge must be reconciled before closing this request', 409)
    issue.status = 'rejected' if decision == 'reject' else 'resolved'
    issue.resolution_note = note.strip()
    issue.reviewed_by, issue.reviewed_at = user.user_id, now()
    record_order(order, 'resolution_'+decision, user.user_id, note.strip())
    audit('order_issue', issue_id, decision, user.user_id, refund_reference=issue.refund_reference)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error_response('DUPLICATE_REFERENCE', 'That refund reference has already been recorded', 409)
    return jsonify(data=issue_data(issue))


@v1_bp.get('/admin/settings')
@jwt_required()
def get_settings():
    if not admin_user():
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    value = settings()
    return jsonify(data={'confirmation_hours': value.confirmation_hours, 'payment_hours': value.payment_hours})


@v1_bp.put('/admin/settings')
@jwt_required()
def update_settings():
    user = admin_user()
    if not user:
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or set(payload) != {'confirmation_hours', 'payment_hours'} or any(type(payload[key]) is not int for key in payload):
        return error_response('INVALID_SETTINGS', 'Submit integer confirmation_hours and payment_hours', 400)
    if not 1 <= payload['confirmation_hours'] <= 72 or not 1 <= payload['payment_hours'] <= 24:
        return error_response('INVALID_SETTINGS', 'Confirmation must be 1–72 hours; payment must be 1–24 hours', 400)
    value = db.session.scalar(select(MarketplaceSettings).where(MarketplaceSettings.settings_id == 1).with_for_update())
    if not value:
        value = MarketplaceSettings(settings_id=1); db.session.add(value)
    value.confirmation_hours, value.payment_hours = payload['confirmation_hours'], payload['payment_hours']
    audit('settings', 1, 'deadlines_updated', user.user_id, **payload)
    db.session.commit()
    return jsonify(data=payload)


@v1_bp.get('/admin/audit')
@jwt_required()
def audit_history():
    if not admin_user():
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    rows = AuditEvent.query.order_by(AuditEvent.event_id.desc()).limit(200).all()
    return jsonify(data=[{'event_id': row.event_id, 'actor_id': row.actor_id, 'entity_type': row.entity_type,
                          'entity_id': row.entity_id, 'action': row.action, 'details': row.details,
                          'created_at': iso(row.created_at)} for row in rows])


@v1_bp.patch('/admin/farmers/<int:farmer_id>/suspend')
@jwt_required()
def suspend_farmer(farmer_id):
    user = admin_user()
    if not user:
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    payload = request.get_json(silent=True)
    reason = payload.get('reason') if isinstance(payload, dict) else None
    if not isinstance(reason, str) or not 5 <= len(reason.strip()) <= 1000:
        return error_response('REASON_REQUIRED', 'Explain why selling access is being suspended', 400)
    farmer = db.session.scalar(select(FarmerProfile).where(FarmerProfile.farmer_id == farmer_id).with_for_update())
    if not farmer:
        return error_response('NOT_FOUND', 'Farmer not found', 404)
    farmer.verification_status = 'suspended'
    audit('farmer', farmer_id, 'suspended', user.user_id, reason=reason.strip())
    notify(farmer.user_id, 'Farmer access suspended', reason.strip()+' You can update your farm details and request verification again.', '/profile')
    db.session.commit()
    return jsonify(message='New sales blocked. Existing orders remain available for resolution.')


@v1_bp.post('/admin/payments/<int:payment_id>/reconcile')
@jwt_required()
def admin_reconcile_payment(payment_id):
    from app.models import Payment
    from app.routes.payments import reconcile_paystack
    if not admin_user():
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    payment = db.session.get(Payment, payment_id)
    if not payment:
        return error_response('NOT_FOUND', 'Payment not found', 404)
    payload = request.get_json(silent=True)
    if payload not in (None, {}):
        return error_response('INVALID_REQUEST', 'Reconciliation uses the saved server reference; replacement references are not accepted', 400)
    return reconcile_paystack(payment)


@v1_bp.patch('/admin/products/<int:product_id>/archive')
@jwt_required()
def archive_listing(product_id):
    from app.models import Product
    user = admin_user()
    if not user:
        return error_response('FORBIDDEN', 'Active administrator access is required', 403)
    payload = request.get_json(silent=True)
    reason = payload.get('reason') if isinstance(payload, dict) else None
    if not isinstance(reason, str) or not 5 <= len(reason.strip()) <= 1000:
        return error_response('REASON_REQUIRED', 'Record a reason for archiving this listing', 400)
    product = db.session.scalar(select(Product).where(Product.product_id == product_id).with_for_update())
    if not product:
        return error_response('NOT_FOUND', 'Product not found', 404)
    product.status = 'inactive'
    audit('product', product_id, 'archived', user.user_id, reason=reason.strip())
    notify(product.farmer.user_id, 'Listing archived', f'{product.product_name}: {reason.strip()}', '/profile')
    db.session.commit()
    return jsonify(message='Listing archived. Existing orders retain their agreed details.')
