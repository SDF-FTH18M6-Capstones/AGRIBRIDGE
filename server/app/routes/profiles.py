from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, Role, BuyerProfile, FarmerProfile
from app.schemas.profile_schema import (
    BuyerProfileSchema,
    FarmerProfileSchema,
)


profiles_bp = Blueprint("profiles", __name__)

buyer_schema = BuyerProfileSchema()
farmer_schema = FarmerProfileSchema()

BUYER_TYPE_MAPPING = {
    "household": "individual",
    "shop": "retailer",
    "supermarket": "retailer",
    "hotel_restaurant": "restaurant",
    "wholesaler": "wholesaler",
}


def get_user_data(user):
    return {
        "user_id": user.user_id,
        "full_name": user.full_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "role": user.role.role_name if user.role else None,
    }


@profiles_bp.get("/me")
@jwt_required()
def get_my_profiles():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found",
            }
        }), 404

    return jsonify({
        "data": {
            **get_user_data(user),
            "buyer_profile": (
                buyer_schema.dump(user.buyer_profile)
                if user.buyer_profile else None
            ),
            "farmer_profile": (
                farmer_schema.dump(user.farmer_profile)
                if user.farmer_profile else None
            ),
        }
    }), 200


@profiles_bp.put("/me")
@jwt_required()
def update_my_profile():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found",
            }
        }), 404

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object",
            }
        }), 400

    data = data.copy()
    profile_type = data.pop("profile_type", None)

    if profile_type not in ("buyer", "farmer"):
        return jsonify({
            "error": {
                "code": "INVALID_PROFILE_TYPE",
                "message": "Profile type must be buyer or farmer",
            }
        }), 400

    if profile_type == "buyer":
        if "buyer_type" in data:
            data["buyer_type"] = BUYER_TYPE_MAPPING.get(
                data["buyer_type"],
                data["buyer_type"],
            )

        schema = buyer_schema
        profile = user.buyer_profile
        role_name = "buyer"
    else:
        schema = farmer_schema
        profile = user.farmer_profile
        role_name = "farmer"

    try:
        validated_data = schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid profile data",
                "fields": error.messages,
            }
        }), 400

    role = Role.query.filter_by(role_name=role_name).first()

    try:
        if role is None:
            role = Role(role_name=role_name)
            db.session.add(role)
            db.session.flush()

        if profile is None:
            if profile_type == "buyer":
                profile = BuyerProfile(user_id=user.user_id)
            else:
                profile = FarmerProfile(user_id=user.user_id)

            db.session.add(profile)

        for field, value in validated_data.items():
            setattr(profile, field, value)

        user.role = role

        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": f"{profile_type.capitalize()} profile saved successfully",
        "data": schema.dump(profile),
        "user": get_user_data(user),
    }), 200