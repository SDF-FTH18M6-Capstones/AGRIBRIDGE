from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from app.extensions import db
from app.models import User, BuyerProfile, FarmerProfile
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
    buyer = user.buyer_profile is not None
    farmer = user.farmer_profile
    admin = bool(user.admin_profile and user.admin_profile.status == "active")
    officer = bool(user.field_officer and user.field_officer.status == "active")
    return {
        "user_id": user.user_id, "full_name": user.full_name,
        "email": user.email, "phone_number": user.phone_number,
        # Keep the legacy field for compatibility; consumer access uses capabilities.
        "role": user.role.role_name if user.role else None,
        "capabilities": {"buyer": buyer,
                         "farmer": bool(farmer and farmer.verification_status == "approved"),
                         "admin": admin, "field-officer": officer},
        "buyer_profile_complete": buyer,
        "farmer_verification_status": farmer.verification_status if farmer else None,
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
                {**farmer_schema.dump(user.farmer_profile), "verification_status": user.farmer_profile.verification_status}
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
        if isinstance(data.get("buyer_type"), str):
            data["buyer_type"] = BUYER_TYPE_MAPPING.get(
                data["buyer_type"],
                data["buyer_type"],
            )

        schema = buyer_schema
        profile = user.buyer_profile
    else:
        schema = farmer_schema
        profile = user.farmer_profile
        if profile is not None:
            from sqlalchemy import select
            profile = db.session.scalar(select(FarmerProfile).where(FarmerProfile.user_id == user.user_id)
                                         .with_for_update().execution_options(populate_existing=True))

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

    try:
        # Profile creation must not replace the account's other capabilities.
        if profile is None:
            if profile_type == "buyer":
                profile = BuyerProfile(user_id=user.user_id)
            else:
                profile = FarmerProfile(user_id=user.user_id)

            db.session.add(profile)

        if profile_type == "farmer" and profile.verification_status == "approved" and any(
            getattr(profile, key) != validated_data[key] for key in ("farm_name", "location")
        ):
            profile.verification_status = "pending"
            from app.services.commerce import notify
            notify(user.user_id, "Farm details changed", "Please request verification again after changing your farm name or location.")
        for field, value in validated_data.items():
            setattr(profile, field, value)

        from app.services.commerce import audit
        audit("user", user.user_id, f"{profile_type}_profile_saved", user.user_id)
        db.session.commit()

    except Exception:
        db.session.rollback()
        raise

    return jsonify({
        "message": f"{profile_type.capitalize()} profile saved successfully",
        "data": schema.dump(profile),
        "user": get_user_data(user),
    }), 200