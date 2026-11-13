
from flask import Blueprint, jsonify, request
from marshmallow import ValidationError
from app.schemas.product_schema import product_schema

products_bp = Blueprint("products", __name__)


products = {
    1: {
        "id": 1,
        "name": "Tomatoes",
        "category": "Vegetables",
        "quantity": 50,
        "unit": "kg",
        "price": 100
    },
    2: {
        "id": 2,
        "name": "Potatoes",
        "category": "Vegetables",
        "quantity": 100,
        "unit": "kg",
        "price": 80
    }
}


@products_bp.get("")
def get_products():
    """Retrieve all products."""
    return jsonify({
        "data": list(products.values())
    }), 200


@products_bp.get("/<int:product_id>")
def get_product(product_id):
    """Retrieve a single product by ID."""
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
def create_product():
    """Create a product using validated data."""

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
        **validated_data
    }

    products[product_id] = new_product

    return jsonify({
        "message": "Product created successfully",
        "data": new_product
    }), 201, {
        "Location": f"/api/products/{product_id}"
    }


@products_bp.put("/<int:product_id>")
def update_product(product_id):
    """Replace an existing product using validated data."""

    product = products.get(product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

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
        **validated_data
    }

    products[product_id] = updated_product

    return jsonify({
        "message": "Product updated successfully",
        "data": updated_product
    }), 200




@products_bp.delete("/<int:product_id>")
def delete_product(product_id):
    """Delete a product from temporary mock storage."""

    product = products.get(product_id)

    if product is None:
        return jsonify({
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": "Product not found"
            }
        }), 404

    del products[product_id]

    return "", 204
