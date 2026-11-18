from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, BuyerRequest, RequestResponse
from app.schemas.request_schema import RequestResponseSchema


responses_bp = Blueprint("responses", __name__)

response_schema = RequestResponseSchema()
responses_schema = RequestResponseSchema(many=True)


def get_current_user():
    user_id = int(get_jwt_identity())
    return db.session.get(User, user_id)


@responses_bp.post("/requests/<int:request_id>/responses")
@jwt_required()
def create_response(request_id):
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    if user.farmer_profile is None:
        return jsonify({
            "error": {
                "code": "FARMER_PROFILE_REQUIRED",
                "message": "A farmer profile is required to submit an offer"
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

    if buyer_request.status != "open":
        return jsonify({
            "error": {
                "code": "REQUEST_NOT_OPEN",
                "message": "You can only respond to open requests"
            }
        }), 409

    existing_response = RequestResponse.query.filter_by(
        request_id=request_id,
        farmer_id=user.farmer_profile.farmer_id
    ).first()

    if existing_response:
        return jsonify({
            "error": {
                "code": "RESPONSE_EXISTS",
                "message": "You have already responded to this request"
            }
        }), 409

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object"
            }
        }), 400

    try:
        validated_data = response_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid response data",
                "fields": error.messages
            }
        }), 400

    new_response = RequestResponse(
        request_id=buyer_request.request_id,
        farmer_id=user.farmer_profile.farmer_id,
        message=validated_data.get("message"),
        offered_price=validated_data["offered_price"],
        available_quantity=validated_data["available_quantity"],
        status="pending"
    )

    db.session.add(new_response)
    db.session.commit()

    return jsonify({
        "message": "Response submitted successfully",
        "data": response_schema.dump(new_response)
    }), 201


@responses_bp.get("/requests/<int:request_id>/responses")
@jwt_required()
def get_request_responses(request_id):
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
                "message": "You are not allowed to view these responses"
            }
        }), 403

    responses = RequestResponse.query.filter_by(
        request_id=request_id
    ).order_by(RequestResponse.response_id.desc()).all()

    return jsonify({
        "data": responses_schema.dump(responses)
    }), 200


@responses_bp.patch("/responses/<int:response_id>")
@jwt_required()
def update_response_status(response_id):
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

    farmer_response = db.session.get(RequestResponse, response_id)

    if farmer_response is None:
        return jsonify({
            "error": {
                "code": "RESPONSE_NOT_FOUND",
                "message": "Farmer response not found"
            }
        }), 404

    buyer_request = farmer_response.request

    if buyer_request.buyer_id != user.buyer_profile.buyer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to update this response"
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

    status = data.get("status")

    if status not in ["accepted", "rejected"]:
        return jsonify({
            "error": {
                "code": "INVALID_STATUS",
                "message": "Status must be accepted or rejected"
            }
        }), 400

    if farmer_response.status != "pending":
        return jsonify({
            "error": {
                "code": "RESPONSE_ALREADY_PROCESSED",
                "message": "This response has already been processed"
            }
        }), 409

    if status == "accepted" and buyer_request.status != "open":
        return jsonify({
            "error": {
                "code": "REQUEST_NOT_OPEN",
                "message": "This request is no longer open for acceptance"
            }
        }), 409

    farmer_response.status = status

    if status == "accepted":
        buyer_request.status = "matched"

    db.session.commit()

    return jsonify({
        "message": f"Farmer response {status} successfully",
        "data": response_schema.dump(farmer_response)
    }), 200
