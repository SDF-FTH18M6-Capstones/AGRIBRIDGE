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
        "paid_at": (
            payment.paid_at.isoformat()
            if payment.paid_at is not None
            else None
        ),
    }


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

        if order.order_status == "cancelled":
            db.session.rollback()
            return payment_error(
                "ORDER_CANCELLED",
                "Payments cannot be created for cancelled orders",
                409,
            )

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

        reference = data.get("transaction_reference")

        if reference is not None:
            reference = reference.strip()

            if not reference:
                db.session.rollback()
                return payment_error(
                    "INVALID_REFERENCE",
                    "Transaction reference cannot be blank",
                    400,
                )

            duplicate = db.session.scalar(
                select(Payment.payment_id)
                .where(Payment.transaction_reference == reference)
            )

            if duplicate is not None:
                db.session.rollback()
                return payment_error(
                    "DUPLICATE_REFERENCE",
                    "Transaction reference already exists",
                    409,
                )

        payment = Payment(
            order_id=order.order_id,
            payment_method=data["payment_method"],
            transaction_reference=reference,
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
        "message": "Payment initiated successfully",
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
