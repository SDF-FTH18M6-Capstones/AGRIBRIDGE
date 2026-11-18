from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, BuyerRequest, Category
from app.schemas.request_schema import BuyerRequestSchema


requests_bp = Blueprint("requests", __name__)

request_schema = BuyerRequestSchema()
requests_schema = BuyerRequestSchema(many=True)


def get_current_user():
    user_id = int(get_jwt_identity())
    return db.session.get(User, user_id)


@requests_bp.post("")
@jwt_required()
def create_request():
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    buyer_profile = user.buyer_profile

    if buyer_profile is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_REQUIRED",
                "message": "Create a buyer profile before submitting a request"
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
        validated_data = request_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "fields": error.messages
            }
        }), 400

    category = db.session.get(Category, validated_data["category_id"])

    if category is None:
        return jsonify({
            "error": {
                "code": "CATEGORY_NOT_FOUND",
                "message": "Selected category does not exist"
            }
        }), 404

    new_request = BuyerRequest(
        buyer_id=buyer_profile.buyer_id,
        category_id=category.category_id,
        product_name=validated_data["product_name"],
        quantity=validated_data["quantity"],
        unit=validated_data["unit"],
        budget=validated_data.get("budget"),
        location=validated_data["location"],
        required_date=validated_data.get("required_date"),
        status="open"
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({
        "message": "Buyer request created successfully",
        "data": request_schema.dump(new_request)
    }), 201


@requests_bp.get("")
@jwt_required()
def get_requests():
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    view = request.args.get("view")

    if view not in ["buyer", "farmer"]:
        return jsonify({
            "error": {
                "code": "INVALID_VIEW",
                "message": "View must be buyer or farmer"
            }
        }), 400

    if view == "buyer":
        if user.buyer_profile is None:
            return jsonify({
                "error": {
                    "code": "BUYER_PROFILE_REQUIRED",
                    "message": "A buyer profile is required"
                }
            }), 403

        requests_list = BuyerRequest.query.filter_by(
            buyer_id=user.buyer_profile.buyer_id
        ).order_by(BuyerRequest.request_id.desc()).all()

    else:
        if user.farmer_profile is None:
            return jsonify({
                "error": {
                    "code": "FARMER_PROFILE_REQUIRED",
                    "message": "A farmer profile is required"
                }
            }), 403

        requests_list = BuyerRequest.query.filter_by(
            status="open"
        ).order_by(BuyerRequest.request_id.desc()).all()

    return jsonify({
        "data": requests_schema.dump(requests_list)
    }), 200


@requests_bp.get("/<int:request_id>")
@jwt_required()
def get_request(request_id):
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    buyer_request = db.session.get(BuyerRequest, request_id)

    if buyer_request is None:
        return jsonify({
            "error": {
                "code": "REQUEST_NOT_FOUND",
                "message": "Buyer request not found"
            }
        }), 404

    is_owner = (
        user.buyer_profile is not None
        and buyer_request.buyer_id == user.buyer_profile.buyer_id
    )

    is_farmer = (
        user.farmer_profile is not None
        and buyer_request.status == "open"
    )

    if not is_owner and not is_farmer:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to view this request"
            }
        }), 403

    return jsonify({
        "data": request_schema.dump(buyer_request)
    }), 200


@requests_bp.put("/<int:request_id>")
@jwt_required()
def update_request(request_id):
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    if user.buyer_profile is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_REQUIRED",
                "message": "A buyer profile is required"
            }
        }), 403

    buyer_request = db.session.get(BuyerRequest, request_id)

    if buyer_request is None:
        return jsonify({
            "error": {
                "code": "REQUEST_NOT_FOUND",
                "message": "Buyer request not found"
            }
        }), 404

    if buyer_request.buyer_id != user.buyer_profile.buyer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to update this request"
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
        validated_data = request_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data",
                "fields": error.messages
            }
        }), 400

    category = db.session.get(Category, validated_data["category_id"])

    if category is None:
        return jsonify({
            "error": {
                "code": "CATEGORY_NOT_FOUND",
                "message": "Selected category does not exist"
            }
        }), 404

    for field, value in validated_data.items():
        setattr(buyer_request, field, value)

    db.session.commit()

    return jsonify({
        "message": "Buyer request updated successfully",
        "data": request_schema.dump(buyer_request)
    }), 200


@requests_bp.delete("/<int:request_id>")
@jwt_required()
def delete_request(request_id):
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    if user.buyer_profile is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_REQUIRED",
                "message": "A buyer profile is required"
            }
        }), 403

    buyer_request = db.session.get(BuyerRequest, request_id)

    if buyer_request is None:
        return jsonify({
            "error": {
                "code": "REQUEST_NOT_FOUND",
                "message": "Buyer request not found"
            }
        }), 404

    if buyer_request.buyer_id != user.buyer_profile.buyer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to delete this request"
            }
        }), 403

    db.session.delete(buyer_request)
    db.session.commit()

    return "", 204
