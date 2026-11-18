
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.schemas.product_schema import product_schema


products_bp = Blueprint("products", __name__)


products = {
    1: {
        "id": 1,
        "owner_id": "1",
        "name": "Tomatoes",
        "category": "Vegetables",
        "quantity": 50,
        "unit": "kg",
        "price": 100
    },
    2: {
        "id": 2,
        "owner_id": "2",
        "name": "Potatoes",
        "category": "Vegetables",
        "quantity": 100,
        "unit": "kg",
        "price": 80
    }
}


@products_bp.get("")
def get_products():
    return jsonify({
        "data": list(products.values())
    }), 200


@products_bp.get("/<int:product_id>")
def get_product(product_id):
    product = products.get(product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    return jsonify({
        "data": product
    }), 200


@products_bp.post("")
@jwt_required()
def create_product():
    user_id = str(get_jwt_identity())

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object"
            }
        }), 400

    try:
        validated_data = product_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid product data",
                "fields": error.messages
            }
        }), 400

    product_id = max(products.keys(), default=0) + 1

    new_product = {
        "id": product_id,
        **validated_data,
        "owner_id": user_id
    }

    products[product_id] = new_product

    return jsonify({
        "message": "Product created successfully",
        "data": new_product
    }), 201, {
        "Location": f"/api/products/{product_id}"
    }


@products_bp.put("/<int:product_id>")
@jwt_required()
def update_product(product_id):
    user_id = str(get_jwt_identity())

    product = products.get(product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    if product.get("owner_id") != user_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to update this product"
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
        validated_data = product_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid product data",
                "fields": error.messages
            }
        }), 400

    updated_product = {
        "id": product_id,
        **validated_data,
        "owner_id": product["owner_id"]
    }

    products[product_id] = updated_product

    return jsonify({
        "message": "Product updated successfully",
        "data": updated_product
    }), 200


@products_bp.delete("/<int:product_id>")
@jwt_required()
def delete_product(product_id):
    user_id = str(get_jwt_identity())

    product = products.get(product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    if product.get("owner_id") != user_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to delete this product"
            }
        }), 403

    del products[product_id]

    return "", 204
