"""Payment endpoints for AgriBridge."""

from decimal import Decimal

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Order, Payment, User
from app.schemas.payment_schema import PaymentSchema
from app.services.commerce import payment_allowed, settle_payment, audit, notify_admins, record_order


payments_bp = Blueprint("payments", __name__)
payment_schema = PaymentSchema()


def payment_error(code, message, status, details=None):
    error = {"code": code, "message": message}

    if details is not None:
        error["details"] = details

    return jsonify({"error": error}), status


def serialize_payment(payment):
    return {
        "payment_id": payment.payment_id,
        "order_id": payment.order_id,
        "payment_method": payment.payment_method,
        "transaction_reference": payment.transaction_reference,
        "amount": str(payment.amount),
        "payment_status": payment.payment_status,
        "provider_started": bool(payment.provider_request_id),
        "provider_reference": payment.provider_request_id if payment.payment_method == "paystack" else None,
        "authorization_url": payment.authorization_url if payment.payment_status == "pending" and payment.payment_method == "paystack" else None,
        "provider_reference_unknown": bool(payment.provider_request_id and payment.provider_request_id.startswith("awaiting:")),
        "paid_at": (
            payment.paid_at.isoformat()
            if payment.paid_at is not None
            else None
        ),
    }


@payments_bp.get('/availability')
@jwt_required()
def payment_availability():
    """Expose readiness, never credential values or the callback secret."""
    from app.services import paystack
    available = paystack.configured()
    return jsonify(data={
        'available': available,
        'provider': 'paystack', 'currency': 'KES', 'mode': 'test',
        'message': 'Paystack test checkout is available.' if available else
                   'Paystack test payments are unavailable. Ask the administrator to configure Paystack. No charge has been initiated.',
    })


@payments_bp.post("")
@jwt_required()
def create_payment():
    """Create a pending payment for an order owned by the buyer."""
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return payment_error(
            "INVALID_JSON",
            "A JSON object is required",
            400,
        )

    try:
        data = payment_schema.load(payload)
    except ValidationError as exc:
        return payment_error(
            "VALIDATION_ERROR",
            "Invalid payment details",
            400,
            exc.messages,
        )

    amount = data["amount"]

    if (
        amount != amount.quantize(Decimal("0.01"))
        or amount <= 0
    ):
        return payment_error(
            "INVALID_AMOUNT",
            "Amount must be positive with at most two decimal places",
            400,
        )

    user = db.session.get(
        User,
        int(get_jwt_identity()),
    )

    if user is None or user.buyer_profile is None:
        return payment_error(
            "BUYER_REQUIRED",
            "A buyer profile is required",
            403,
        )

    try:
        order = db.session.scalar(
            select(Order)
            .where(Order.order_id == data["order_id"])
            .with_for_update()
        )

        if (
            order is None
            or order.buyer_id != user.buyer_profile.buyer_id
        ):
            db.session.rollback()
            return payment_error(
                "ORDER_NOT_FOUND",
                "Order not found",
                404,
            )

        if not payment_allowed(order):
            db.session.commit()
            return payment_error("FARMER_CONFIRMATION_REQUIRED", "Payment is available only after farmer confirmation and before expiry", 409)
        if data["payment_method"] != "paystack":
            return payment_error("UNSUPPORTED_METHOD", "V1 supports Paystack test checkout", 400)

        if amount != order.total_amount:
            db.session.rollback()
            return payment_error(
                "AMOUNT_MISMATCH",
                "Payment amount must equal the order total",
                400,
            )

        existing = db.session.scalar(
            select(Payment)
            .where(
                Payment.order_id == order.order_id,
                Payment.payment_status.in_(["pending", "paid"]),
            )
            .limit(1)
        )

        if existing is not None:
            db.session.rollback()
            return payment_error(
                "PAYMENT_ALREADY_EXISTS",
                "An active or paid payment already exists for this order",
                409,
            )

        if data.get("transaction_reference") is not None:
            return payment_error('SERVER_REFERENCE_REQUIRED', 'Paystack references are generated by the server', 400)

        payment = Payment(
            order_id=order.order_id,
            payment_method=data["payment_method"],
            transaction_reference=None,
            amount=amount,
            payment_status="pending",
        )

        db.session.add(payment)
        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        return payment_error(
            "PAYMENT_CONFLICT",
            "Payment could not be created",
            409,
        )

    return jsonify({
        "message": "Pending payment record created",
        "data": serialize_payment(payment),
    }), 201


@payments_bp.get("/<int:payment_id>")
@jwt_required()
def get_payment(payment_id):
    """Retrieve a payment belonging to the buyer or farmer."""
    user = db.session.get(
        User,
        int(get_jwt_identity()),
    )

    if user is None:
        return payment_error(
            "USER_NOT_FOUND",
            "Authenticated user was not found",
            404,
        )

    payment = db.session.get(Payment, payment_id)

    if payment is None:
        return payment_error(
            "PAYMENT_NOT_FOUND",
            "Payment not found",
            404,
        )

    order = payment.order

    is_buyer = (
        user.buyer_profile is not None
        and user.buyer_profile.buyer_id == order.buyer_id
    )

    is_farmer = (
        user.farmer_profile is not None
        and user.farmer_profile.farmer_id == order.farmer_id
    )

    if not (is_buyer or is_farmer):
        return payment_error(
            "PAYMENT_NOT_FOUND",
            "Payment not found",
            404,
        )

    return jsonify({
        "message": "Payment retrieved successfully",
        "data": serialize_payment(payment),
    }), 200


@payments_bp.patch("/<int:payment_id>")
@jwt_required()
def update_payment(payment_id):
    """Allow an active administrator to mark a pending payment failed."""
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return payment_error(
            "INVALID_JSON",
            "A JSON object is required",
            400,
        )

    if set(payload) != {"payment_status"}:
        return payment_error(
            "INVALID_REQUEST",
            "Only payment_status is accepted",
            400,
        )

    new_status = payload["payment_status"]

    if not isinstance(new_status, str):
        return payment_error(
            "INVALID_STATUS",
            "Payment status must be a string",
            400,
        )

    if new_status != "failed":
        return payment_error(
            "VERIFICATION_REQUIRED",
            "This status requires verified payment processing",
            403,
        )

    user = db.session.get(User, int(get_jwt_identity()))

    if user is None:
        return payment_error(
            "USER_NOT_FOUND",
            "Authenticated user was not found",
            404,
        )

    if (
        user.admin_profile is None
        or user.admin_profile.status != "active"
    ):
        return payment_error(
            "FORBIDDEN",
            "Active administrator access is required",
            403,
        )

    try:
        payment = db.session.scalar(
            select(Payment)
            .where(Payment.payment_id == payment_id)
            .with_for_update()
        )

        if payment is None:
            db.session.rollback()
            return payment_error(
                "PAYMENT_NOT_FOUND",
                "Payment not found",
                404,
            )

        if payment.provider_request_id:
            db.session.rollback()
            return payment_error("PROVIDER_VERIFICATION_REQUIRED", "Reconcile the provider payment before changing its status", 409)

        if payment.payment_status != "pending":
            db.session.rollback()
            return payment_error(
                "INVALID_STATUS_TRANSITION",
                "Only pending payments can be marked failed",
                409,
            )

        payment.payment_status = "failed"
        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        return payment_error(
            "PAYMENT_UPDATE_CONFLICT",
            "Payment could not be updated",
            409,
        )

    return jsonify({
        "message": "Payment status updated successfully",
        "data": serialize_payment(payment),
    }), 200


def payment_owner(payment):
    user = db.session.get(User, int(get_jwt_identity()))
    return user and user.buyer_profile and payment.order.buyer_id == user.buyer_profile.buyer_id


@payments_bp.post('/<int:payment_id>/initiate')
@jwt_required()
def initiate_paystack(payment_id):
    from uuid import uuid4
    from app.services import paystack
    payment = db.session.get(Payment, payment_id)
    if payment is None or not payment_owner(payment):
        return payment_error('PAYMENT_NOT_FOUND', 'Payment not found', 404)
    if not paystack.configured():
        return payment_error('PROVIDER_NOT_CONFIGURED', 'Configure Paystack test checkout. No charge has been initiated.', 503)
    order = db.session.scalar(select(Order).where(Order.order_id == payment.order_id).with_for_update().execution_options(populate_existing=True))
    payment = db.session.scalar(select(Payment).where(Payment.payment_id == payment_id).with_for_update().execution_options(populate_existing=True))
    if not payment_allowed(order) or payment.payment_status != 'pending':
        return payment_error('PAYMENT_UNAVAILABLE', 'This payment cannot be initiated', 409)
    if payment.provider_request_id:
        if payment.payment_method == 'paystack' and paystack.checkout_url_allowed(payment.authorization_url):
            return jsonify(message='Continue the existing Paystack checkout.', data=serialize_payment(payment)), 200
        return payment_error('PAYMENT_ALREADY_INITIATED', 'Check the existing provider request before retrying. Contact support if its checkout is unavailable.', 409)
    # Unstarted legacy attempts can use Paystack; started legacy requests stay intact.
    payment.payment_method = 'paystack'
    payment.transaction_reference = None
    try:
        paystack.minor_units(payment.amount)
    except paystack.ProviderError as error:
        return payment_error('INVALID_PAYSTACK_AMOUNT', str(error), 400)
    payment.provider_request_id = 'AB-' + uuid4().hex
    audit('payment', payment_id, 'initiation_started', int(get_jwt_identity()), order_id=order.order_id)
    # Persist our reference BEFORE calling Paystack, including when its response times out.
    db.session.commit()
    try:
        result = paystack.initiate(payment)
        if (not isinstance(result, dict) or result.get('reference') != payment.provider_request_id
                or not paystack.checkout_url_allowed(result.get('authorization_url'))):
            raise paystack.ProviderError('Paystack returned an incomplete checkout. Check its status before retrying.')
    except paystack.ProviderRejected as error:
        order = db.session.scalar(select(Order).where(Order.order_id == payment.order_id).with_for_update().execution_options(populate_existing=True))
        payment = db.session.scalar(select(Payment).where(Payment.payment_id == payment_id).with_for_update().execution_options(populate_existing=True))
        if payment.payment_status == 'pending':
            payment.payment_status = 'failed'
            record_order(order, 'payment_failed', message='Paystack rejected checkout initialization. No successful payment has been verified.')
        db.session.commit()
        return payment_error('PROVIDER_REJECTED', str(error), 502)
    except paystack.ProviderError as error:
        notify_admins('Paystack checkout needs investigation', f'Payment #{payment_id} has an unconfirmed checkout. Verify its saved Paystack reference before allowing another attempt.')
        audit('payment', payment_id, 'provider_result_unknown', order_id=order.order_id)
        db.session.commit()
        return payment_error('PROVIDER_UNCONFIRMED', str(error), 502)
    payment = db.session.scalar(select(Payment).where(Payment.payment_id == payment_id).with_for_update().execution_options(populate_existing=True))
    payment.authorization_url = result['authorization_url']
    db.session.commit()
    return jsonify(message='Continue to Paystack to complete your test payment.', data=serialize_payment(payment)), 202


def reconcile_paystack(payment):
    from app.services import paystack
    if payment.payment_method != 'paystack':
        return payment_error('LEGACY_PAYMENT', 'This legacy provider attempt requires administrator review. It cannot be verified using Paystack.', 409)
    if payment.payment_status != 'pending':
        return jsonify(data=serialize_payment(payment)), 200
    if not paystack.configured():
        return payment_error('PROVIDER_NOT_CONFIGURED', 'Configure Paystack test checkout before reconciliation', 503)
    if not payment.provider_request_id or payment.provider_request_id.startswith('awaiting:'):
        return payment_error('PAYMENT_NOT_RECONCILABLE', 'No Paystack reference is available. Contact support if a charge was initiated.', 409)
    try:
        result = paystack.query(payment.provider_request_id)
        payment = settle_payment(payment, result)
    except paystack.ProviderError as error:
        db.session.rollback()
        return payment_error('PROVIDER_UNCONFIRMED', str(error), 502)
    db.session.commit()
    return jsonify(data=serialize_payment(payment)), 200


@payments_bp.post('/<int:payment_id>/reconcile')
@jwt_required()
def check_paystack_payment(payment_id):
    payment = db.session.get(Payment, payment_id)
    if payment is None or not payment_owner(payment):
        return payment_error('PAYMENT_NOT_FOUND', 'Payment not found', 404)
    return reconcile_paystack(payment)


@payments_bp.post('/paystack/webhook')
def paystack_webhook():
    from app.services import paystack
    if not paystack.valid_webhook(request.get_data(cache=True), request.headers):
        return payment_error('FORBIDDEN', 'Invalid webhook signature', 401)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return payment_error('INVALID_WEBHOOK', 'A JSON object is required', 400)
    data = payload.get('data')
    if payload.get('event') == 'charge.success' and isinstance(data, dict) and isinstance(data.get('reference'), str):
        payment = db.session.scalar(select(Payment).where(Payment.payment_method == 'paystack', Payment.provider_request_id == data['reference']))
        if payment and payment.payment_status == 'pending':
            # The pending reference is the durable worker queue. Acknowledge promptly;
            # the worker independently verifies it instead of trusting webhook fields.
            # Duplicate events need no further mutation or additional queue entries.
            db.session.commit()
    return jsonify(message='Webhook received'), 200
