from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import SavedProduct, Product, BuyerProfile
from app.schemas.saved_product_schema import (
    saved_product_schema,
    saved_product_list_schema,
)


saved_products_bp = Blueprint("saved_products", __name__)


def get_current_buyer():
    """Return the buyer profile belonging to the authenticated user."""
    user_id = int(get_jwt_identity())

    return BuyerProfile.query.filter_by(
        user_id=user_id
    ).first()


@saved_products_bp.post("")
@jwt_required()
def save_product():
    buyer = get_current_buyer()

    if buyer is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_NOT_FOUND",
                "message": "Buyer profile not found"
            }
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object"
            }
        }), 400

    try:
        validated_data = saved_product_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid saved product data",
                "details": error.messages
            }
        }), 400

    product = db.session.get(
        Product,
        validated_data["product_id"]
    )

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    existing_saved_product = SavedProduct.query.filter_by(
        buyer_id=buyer.buyer_id,
        product_id=product.product_id
    ).first()

    if existing_saved_product:
        return jsonify({
            "error": {
                "code": "PRODUCT_ALREADY_SAVED",
                "message": "You have already saved this product"
            }
        }), 409

    saved_product = SavedProduct(
        buyer_id=buyer.buyer_id,
        product_id=product.product_id
    )

    db.session.add(saved_product)

    try:
        db.session.commit()
        db.session.refresh(saved_product)
    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "error": {
                "code": "PRODUCT_ALREADY_SAVED",
                "message": "You have already saved this product"
            }
        }), 409

    return jsonify({
        "message": "Product saved successfully",
        "data": saved_product_schema.dump(saved_product)
    }), 201


@saved_products_bp.get("")
@jwt_required()
def get_saved_products():
    buyer = get_current_buyer()

    if buyer is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_NOT_FOUND",
                "message": "Buyer profile not found"
            }
        }), 403

    saved_products = SavedProduct.query.filter_by(
        buyer_id=buyer.buyer_id
    ).order_by(
        SavedProduct.created_at.desc()
    ).all()

    return jsonify({
        "data": saved_product_list_schema.dump(saved_products)
    }), 200


@saved_products_bp.delete("/<int:saved_product_id>")
@jwt_required()
def remove_saved_product(saved_product_id):
    buyer = get_current_buyer()

    if buyer is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_NOT_FOUND",
                "message": "Buyer profile not found"
            }
        }), 403

    saved_product = SavedProduct.query.filter_by(
        saved_product_id=saved_product_id,
        buyer_id=buyer.buyer_id
    ).first()

    if saved_product is None:
        return jsonify({
            "error": {
                "code": "SAVED_PRODUCT_NOT_FOUND",
                "message": "Saved product not found"
            }
        }), 404

    db.session.delete(saved_product)
    db.session.commit()

    return "", 204