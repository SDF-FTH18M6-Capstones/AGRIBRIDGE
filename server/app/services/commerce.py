"""V1 order transitions. Callers lock the order first and commit the whole event."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.extensions import db
from app.models import (Order, Product, Payment, MarketplaceSettings, AuditEvent,
                        Notification, Admin)


def now():
    return datetime.now(timezone.utc)


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def iso(value):
    return aware(value).isoformat() if value else None


def settings():
    value = db.session.get(MarketplaceSettings, 1)
    return value or MarketplaceSettings(settings_id=1, confirmation_hours=12, payment_hours=2)


def audit(entity_type, entity_id, action, actor_id=None, **details):
    db.session.add(AuditEvent(entity_type=entity_type, entity_id=entity_id,
                              action=action, actor_id=actor_id, details=details))


def notify(user_id, title, message, link='/profile'):
    db.session.add(Notification(user_id=user_id, title=title, message=message, link=link))


def notify_admins(title, message):
    for admin in Admin.query.filter_by(status='active').all():
        notify(admin.user_id, title, message, '/admin/exceptions')


def record_order(order, action, actor_id=None, message=None):
    audit('order', order.order_id, action, actor_id, status=order.order_status,
          message=message or '')
    title = f'Order #{order.order_id}: {action.replace("_", " ")}'
    body = message or title
    notify(order.buyer.user_id, title, body, '/buyer/orders')
    notify(order.farmer.user_id, title, body, '/farmer/orders')


def processing_payment(order):
    return db.session.scalar(select(Payment).where(
        Payment.order_id == order.order_id, Payment.payment_status == 'pending',
        Payment.provider_request_id.is_not(None),
    ).limit(1))


def paid_payment(order):
    return db.session.scalar(select(Payment).where(
        Payment.order_id == order.order_id, Payment.payment_status == 'paid',
    ).limit(1))


def release_stock(order):
    """Idempotent stock release. The order row must already be locked."""
    if order.stock_released_at:
        return
    products = db.session.scalars(select(Product).where(
        Product.product_id.in_([item.product_id for item in order.items])
    ).order_by(Product.product_id).with_for_update().execution_options(populate_existing=True)).all()
    by_id = {product.product_id: product for product in products}
    for item in order.items:
        product = by_id.get(item.product_id)
        if product:
            product.quantity_available += item.quantity
            if product.status == 'sold_out':
                product.status = 'available'
    order.stock_released_at = now()
    for payment in Payment.query.filter_by(order_id=order.order_id, payment_status='pending').all():
        if not payment.provider_request_id:
            payment.payment_status = 'failed'


def expire_order(order, at=None):
    at = at or now()
    deadline = order.confirmation_deadline if order.order_status == 'pending' else order.payment_deadline
    if order.order_status not in ('pending', 'confirmed') or not deadline or aware(deadline) > at:
        return False
    # Never release stock while the remote charge might have succeeded.
    if processing_payment(order) or paid_payment(order):
        return False
    release_stock(order)
    order.order_status = 'expired'
    record_order(order, 'expired', message='The order deadline passed. Reserved stock has been released.')
    return True


def payment_allowed(order):
    if expire_order(order):
        db.session.commit()
        return False
    return order.order_status == 'confirmed' and not paid_payment(order)


def settle_payment(payment, provider_result):
    """Only called with a result independently obtained from the provider."""
    order = db.session.scalar(select(Order).where(Order.order_id == payment.order_id)
                              .with_for_update().execution_options(populate_existing=True))
    payment = db.session.scalar(select(Payment).where(Payment.payment_id == payment.payment_id)
                                .with_for_update().execution_options(populate_existing=True))
    if payment.payment_status != 'pending':
        return payment
    from app.services.paystack import validate_result
    validate_result(payment, provider_result)
    status = provider_result.get('status')
    if status == 'success':
        payment.payment_status = 'paid'
        payment.paid_at = now()
        payment.transaction_reference = payment.provider_request_id
        if order.order_status == 'confirmed' and not order.stock_released_at:
            order.order_status = 'paid'
            record_order(order, 'payment_verified', message='Payment verified. The buyer can confirm receipt when the produce is received.')
        else:
            audit('payment', payment.payment_id, 'late_payment_verified', order_id=order.order_id)
            notify_admins('Payment needs review', f'Payment #{payment.payment_id} settled after the order changed. Reconcile before refunding.')
    elif status in {'failed', 'abandoned', 'reversed'}:
        payment.payment_status = 'failed'
        record_order(order, 'payment_failed', message='The payment attempt failed. Retry before the payment deadline or contact support.')
    db.session.flush()
    return payment


def expire_due_orders(at=None):
    """Safe to run from an independent worker with multiple PostgreSQL instances."""
    at = at or now()
    ids = db.session.scalars(select(Order.order_id).where(
        ((Order.order_status == 'pending') & (Order.confirmation_deadline <= at)) |
        ((Order.order_status == 'confirmed') & (Order.payment_deadline <= at))
    ).order_by(Order.order_id)).all()
    count = 0
    for order_id in ids:
        order = db.session.scalar(select(Order).where(Order.order_id == order_id)
                                  .with_for_update(skip_locked=True).execution_options(populate_existing=True))
        if order and expire_order(order, at):
            count += 1
        db.session.commit()
    return count
