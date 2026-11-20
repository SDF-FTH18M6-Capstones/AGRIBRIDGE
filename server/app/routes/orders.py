from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import Schema, fields, validate, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User, Product, Order, OrderItem


orders_bp = Blueprint("orders", __name__)


class CreateOrderItemSchema(Schema):
    product_id = fields.Int(required=True, strict=True)
    quantity = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=Decimal("0.001")),
    )


class CreateOrderSchema(Schema):
    items = fields.List(
        fields.Nested(CreateOrderItemSchema),
        required=True,
        validate=validate.Length(min=1),
    )


create_order_schema = CreateOrderSchema()


def error_response(code, message, status, details=None):
    error = {"code": code, "message": message}

    if details is not None:
        error["fields"] = details

    return jsonify({"error": error}), status


def serialize_order(order):
    return {
        "order_id": order.order_id,
        "buyer_id": order.buyer_id,
        "farmer_id": order.farmer_id,
        "total_amount": str(order.total_amount),
        "order_status": order.order_status,
        "items": [
            {
                "order_item_id": item.order_item_id,
                "product_id": item.product_id,
                "quantity": str(item.quantity),
                "unit_price": str(item.unit_price),
                "subtotal": str(item.subtotal),
            }
            for item in order.items
        ],
    }


@orders_bp.post("")
@jwt_required()
def create_order():
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return error_response(
            "INVALID_IDENTITY",
            "Invalid authentication identity",
            401,
        )

    user = db.session.get(User, user_id)

    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "User account not found",
            404,
        )

    if user.buyer_profile is None:
        return error_response(
            "BUYER_PROFILE_REQUIRED",
            "Complete your buyer profile before ordering",
            403,
        )

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return error_response(
            "INVALID_JSON",
            "Request body must be a JSON object",
            400,
        )

    try:
        data = create_order_schema.load(payload)
    except ValidationError as exc:
        return error_response(
            "VALIDATION_ERROR",
            "Invalid order data",
            400,
            exc.messages,
        )

    requested_items = data["items"]
    quantities = {}

    for item in requested_items:
        product_id = item["product_id"]
        quantity = item["quantity"]

        if quantity.as_tuple().exponent < -3:
            return error_response(
                "INVALID_QUANTITY",
                "Quantity must have at most 3 decimal places",
                400,
            )

        if product_id in quantities:
            return error_response(
                "DUPLICATE_PRODUCT",
                "A product can appear only once per order",
                400,
            )

        quantities[product_id] = quantity

    product_ids = sorted(quantities.keys())

    try:
        # Lock products in a consistent order to reduce
        # the risk of concurrent order deadlocks.
        products = db.session.execute(
            select(Product)
            .where(Product.product_id.in_(product_ids))
            .order_by(Product.product_id)
            .with_for_update()
        ).scalars().all()

        if len(products) != len(product_ids):
            db.session.rollback()
            return error_response(
                "PRODUCT_NOT_FOUND",
                "One or more products do not exist",
                404,
            )

        farmer_ids = {product.farmer_id for product in products}

        if len(farmer_ids) != 1:
            db.session.rollback()
            return error_response(
                "MULTIPLE_FARMERS",
                "Products in one order must belong to the same farmer",
                400,
            )

        farmer = products[0].farmer

        if farmer.verification_status != "approved":
            db.session.rollback()
            return error_response(
                "FARMER_NOT_VERIFIED",
                "Orders can only be placed with verified farmers",
                403,
            )

        total = Decimal("0.00")
        order_lines = []

        for product in products:
            quantity = quantities[product.product_id]

            if product.status != "available":
                db.session.rollback()
                return error_response(
                    "PRODUCT_UNAVAILABLE",
                    f"Product {product.product_id} is unavailable",
                    409,
                )

            if (
                product.availability_date is not None
                and product.availability_date > date.today()
            ):
                db.session.rollback()
                return error_response(
                    "PRODUCT_NOT_READY",
                    f"Product {product.product_id} is not available yet",
                    409,
                )

            if product.quantity_available < quantity:
                db.session.rollback()
                return error_response(
                    "INSUFFICIENT_STOCK",
                    f"Insufficient stock for product {product.product_id}",
                    409,
                )

            unit_price = product.price
            subtotal = (quantity * unit_price).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )

            if subtotal <= 0:
                db.session.rollback()
                return error_response(
                    "INVALID_SUBTOTAL",
                    "Order item subtotal must be positive",
                    400,
                )

            total += subtotal

            order_lines.append({
                "product_id": product.product_id,
                "quantity": quantity,
                "unit_price": unit_price,
                "subtotal": subtotal,
            })

            # Reserve stock within the same transaction.
            product.quantity_available -= quantity

            if product.quantity_available == 0:
                product.status = "sold_out"

        if total > Decimal("9999999999.99"):
            db.session.rollback()
            return error_response(
                "ORDER_TOTAL_TOO_LARGE",
                "Order total exceeds the allowed limit",
                400,
            )

        order = Order(
            buyer_id=user.buyer_profile.buyer_id,
            farmer_id=products[0].farmer_id,
            total_amount=total,
            order_status="pending",
        )

        db.session.add(order)
        db.session.flush()

        for line in order_lines:
            db.session.add(
                OrderItem(order_id=order.order_id, **line)
            )

        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        return error_response(
            "ORDER_CONFLICT",
            "Order could not be created",
            409,
        )

    saved_order = db.session.get(Order, order.order_id)

    return jsonify({
        "message": "Order created successfully",
        "data": serialize_order(saved_order),
    }), 201


@orders_bp.get("")
@jwt_required()
def list_orders():
    """List orders belonging to the authenticated buyer or farmer."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "Authenticated user was not found",
            404,
        )

    if user.buyer_profile is not None:
        orders = db.session.scalars(
            select(Order)
            .where(Order.buyer_id == user.buyer_profile.buyer_id)
            .order_by(Order.order_id.desc())
        ).all()

    elif user.farmer_profile is not None:
        orders = db.session.scalars(
            select(Order)
            .where(Order.farmer_id == user.farmer_profile.farmer_id)
            .order_by(Order.order_id.desc())
        ).all()

    else:
        return error_response(
            "PROFILE_REQUIRED",
            "A buyer or farmer profile is required",
            403,
        )

    return jsonify({
        "message": "Orders retrieved successfully",
        "data": [serialize_order(order) for order in orders],
        "count": len(orders),
    }), 200


@orders_bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id):
    """Retrieve an order only if it belongs to the current user."""
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return error_response(
            "USER_NOT_FOUND",
            "Authenticated user was not found",
            404,
        )

    order = db.session.get(Order, order_id)

    if order is None:
        return error_response(
            "ORDER_NOT_FOUND",
            "Order not found",
            404,
        )

    is_buyer = (
        user.buyer_profile is not None
        and order.buyer_id == user.buyer_profile.buyer_id
    )

    is_farmer = (
        user.farmer_profile is not None
        and order.farmer_id == user.farmer_profile.farmer_id
    )

    if not (is_buyer or is_farmer):
        return error_response(
            "ORDER_NOT_FOUND",
            "Order not found",
            404,
        )

    return jsonify({
        "message": "Order retrieved successfully",
        "data": serialize_order(order),
    }), 200


@orders_bp.patch("/<int:order_id>/status")
@jwt_required()
def update_order_status(order_id):
    """Update an order status with ownership and stock protection."""
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return error_response(
            "INVALID_JSON",
            "A JSON object is required",
            400,
        )

    if set(payload) != {"status"}:
        return error_response(
            "INVALID_REQUEST",
            "Only the status field is allowed",
            400,
        )

    new_status = payload["status"]

    if not isinstance(new_status, str):
        return error_response(
            "INVALID_STATUS",
            "Status must be a string",
            400,
        )

    transitions = {
        "pending": {"confirmed", "cancelled"},
        "confirmed": {"shipped"},
        "shipped": {"delivered"},
        "delivered": {"completed"},
        "completed": set(),
        "cancelled": set(),
    }

    if new_status not in transitions:
        return error_response(
            "INVALID_STATUS",
            "Unsupported order status",
            400,
        )

    try:
        user = db.session.get(
            User,
            int(get_jwt_identity()),
        )

        if user is None:
            return error_response(
                "USER_NOT_FOUND",
                "Authenticated user was not found",
                404,
            )

        order = db.session.scalar(
            select(Order)
            .where(Order.order_id == order_id)
            .with_for_update()
        )

        if order is None:
            return error_response(
                "ORDER_NOT_FOUND",
                "Order not found",
                404,
            )

        is_buyer = (
            user.buyer_profile is not None
            and user.buyer_profile.buyer_id == order.buyer_id
        )

        is_farmer = (
            user.farmer_profile is not None
            and user.farmer_profile.farmer_id == order.farmer_id
        )

        if not (is_buyer or is_farmer):
            return error_response(
                "ORDER_NOT_FOUND",
                "Order not found",
                404,
            )

        if new_status not in transitions[order.order_status]:
            return error_response(
                "INVALID_STATUS_TRANSITION",
                "This status transition is not allowed",
                409,
            )

        if new_status == "cancelled":
            if order.order_status != "pending":
                return error_response(
                    "CANCELLATION_NOT_ALLOWED",
                    "Only pending orders can be cancelled",
                    409,
                )

            product_ids = sorted({
                item.product_id for item in order.items
            })

            products = db.session.scalars(
                select(Product)
                .where(Product.product_id.in_(product_ids))
                .order_by(Product.product_id)
                .with_for_update()
            ).all()

            product_map = {
                product.product_id: product
                for product in products
            }

            if len(product_map) != len(product_ids):
                db.session.rollback()
                return error_response(
                    "PRODUCT_NOT_FOUND",
                    "An ordered product no longer exists",
                    409,
                )

            for item in order.items:
                product = product_map[item.product_id]
                product.quantity_available += item.quantity

                if product.status == "sold_out":
                    product.status = "available"

        elif not is_farmer:
            return error_response(
                "FORBIDDEN",
                "Only the farmer can advance order status",
                403,
            )

        order.order_status = new_status
        db.session.commit()

        return jsonify({
            "message": "Order status updated successfully",
            "data": serialize_order(order),
        }), 200

    except IntegrityError:
        db.session.rollback()
        return error_response(
            "ORDER_UPDATE_CONFLICT",
            "Order status could not be updated",
            409,
        )
