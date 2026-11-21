from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models import (
    ADMIN_STATUSES,
    ORDER_STATUSES,
    PAYMENT_STATUSES,
    PRODUCT_STATUSES,
    REQUEST_STATUSES,
    Admin,
    BuyerProfile,
    BuyerRequest,
    FarmerProfile,
    Order,
    Payment,
    Product,
    User,
)


dashboards_bp = Blueprint("dashboards", __name__)


def error_response(code, message, status_code):
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


def get_current_user():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None

    return db.session.get(User, user_id)


def status_counts(model, status_column, statuses, filters=()):
    query = db.session.query(
        status_column,
        func.count(),
    )

    for condition in filters:
        query = query.filter(condition)

    results = query.group_by(status_column).all()

    counts = {
        status: 0
        for status in statuses
    }

    for status, count in results:
        counts[status] = count

    return counts

def order_summary(filters=()):
    query = db.session.query(
        func.count(Order.order_id),
        func.coalesce(func.sum(Order.total_amount), 0),
    )

    for condition in filters:
        query = query.filter(condition)

    total, amount = query.one()

    return {
        "total": total,
        "total_amount": float(amount),
        "by_status": status_counts(
            Order,
            Order.order_status,
            ORDER_STATUSES,
            filters,
        ),
    }


def payment_summary(order_filter=None):
    query = db.session.query(
        func.count(Payment.payment_id),
        func.coalesce(func.sum(Payment.amount), 0),
    ).join(
        Order,
        Payment.order_id == Order.order_id,
    )

    if order_filter is not None:
        query = query.filter(order_filter)

    total, amount = query.one()

    grouped_query = db.session.query(
        Payment.payment_status,
        func.count(Payment.payment_id),
        func.coalesce(func.sum(Payment.amount), 0),
    ).join(
        Order,
        Payment.order_id == Order.order_id,
    )

    if order_filter is not None:
        grouped_query = grouped_query.filter(order_filter)

    grouped_results = grouped_query.group_by(
        Payment.payment_status
    ).all()

    by_status = {
        status: {
            "count": 0,
            "amount": 0.0,
        }
        for status in PAYMENT_STATUSES
    }

    for status, count, status_amount in grouped_results:
        by_status[status] = {
            "count": count,
            "amount": float(status_amount),
        }

    paid_amount = by_status["paid"]["amount"]

    return {
        "total": total,
        "total_amount": float(amount),
        "paid_amount": paid_amount,
        "by_status": by_status,
    }


def product_summary(farmer_id=None):
    filters = []

    if farmer_id is not None:
        filters.append(Product.farmer_id == farmer_id)

    total_query = db.session.query(
        func.count(Product.product_id)
    )

    for condition in filters:
        total_query = total_query.filter(condition)

    return {
        "total": total_query.scalar() or 0,
        "by_status": status_counts(
            Product,
            Product.status,
            PRODUCT_STATUSES,
            filters,
        ),
    }


def request_summary(buyer_id=None):
    filters = []

    if buyer_id is not None:
        filters.append(BuyerRequest.buyer_id == buyer_id)

    total_query = db.session.query(
        func.count(BuyerRequest.request_id)
    )

    for condition in filters:
        total_query = total_query.filter(condition)

    return {
        "total": total_query.scalar() or 0,
        "by_status": status_counts(
            BuyerRequest,
            BuyerRequest.status,
            REQUEST_STATUSES,
            filters,
        ),
    }


@dashboards_bp.get("/farmer")
@jwt_required()
def farmer_dashboard():
    user = get_current_user()

    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "User account not found",
            404,
        )

    if user.role is None or user.role.role_name != "farmer":
        return error_response(
            "FORBIDDEN",
            "A farmer account is required to access this dashboard",
            403,
        )

    farmer = user.farmer_profile

    if farmer is None:
        return error_response(
            "FARMER_PROFILE_REQUIRED",
            "A farmer profile is required",
            403,
        )

    order_filter = Order.farmer_id == farmer.farmer_id

    return jsonify({
        "data": {
            "products": product_summary(farmer.farmer_id),
            "orders": order_summary((order_filter,)),
            "payments": payment_summary(order_filter),
        }
    }), 200


@dashboards_bp.get("/buyer")
@jwt_required()
def buyer_dashboard():
    user = get_current_user()

    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "User account not found",
            404,
        )

    if user.role is None or user.role.role_name != "buyer":
        return error_response(
            "FORBIDDEN",
            "A buyer account is required to access this dashboard",
            403,
        )

    buyer = user.buyer_profile

    if buyer is None:
        return error_response(
            "BUYER_PROFILE_REQUIRED",
            "A buyer profile is required",
            403,
        )

    order_filter = Order.buyer_id == buyer.buyer_id

    return jsonify({
        "data": {
            "requests": request_summary(buyer.buyer_id),
            "orders": order_summary((order_filter,)),
            "payments": payment_summary(order_filter),
        }
    }), 200


@dashboards_bp.get("/admin")
@jwt_required()
def admin_dashboard():
    user = get_current_user()

    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "User account not found",
            404,
        )

    if user.role is None or user.role.role_name != "admin":
        return error_response(
            "FORBIDDEN",
            "Administrator access is required",
            403,
        )

    admin = user.admin_profile

    if admin is None or admin.status not in ADMIN_STATUSES:
        return error_response(
            "ADMIN_ACCESS_DENIED",
            "An active administrator profile is required",
            403,
        )

    return jsonify({
        "data": {
            "users": {
                "total": db.session.query(
                    func.count(User.user_id)
                ).scalar() or 0,
            },
            "farmers": {
                "total": db.session.query(
                    func.count(FarmerProfile.farmer_id)
                ).scalar() or 0,
            },
            "buyers": {
                "total": db.session.query(
                    func.count(BuyerProfile.buyer_id)
                ).scalar() or 0,
            },
            "products": product_summary(),
            "requests": request_summary(),
            "orders": order_summary(),
            "payments": payment_summary(),
        }
    }), 200