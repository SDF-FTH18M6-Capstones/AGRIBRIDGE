from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User, Category
from app.schemas.category_schema import CategorySchema


categories_bp = Blueprint("categories", __name__)

category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)


@categories_bp.get("/")
def get_categories():
    categories = Category.query.order_by(Category.category_name).all()

    return jsonify({
        "data": categories_schema.dump(categories)
    }), 200


@categories_bp.post("/")
@jwt_required()
def create_category():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404


    if (
        user.role is None
        or user.role.role_name != "admin"
        or user.admin_profile is None
        or user.admin_profile.status != "active"
    ):
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "Only active administrators can create categories"
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
        validated_data = category_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid category data",
                "fields": error.messages
            }
        }), 400

    existing_category = Category.query.filter_by(
        category_name=validated_data["category_name"]
    ).first()

    if existing_category:
        return jsonify({
            "error": {
                "code": "CATEGORY_EXISTS",
                "message": "This category already exists"
            }
        }), 409

    category = Category(**validated_data)

    db.session.add(category)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "error": {
                "code": "CATEGORY_EXISTS",
                "message": "This category already exists"
            }
        }), 409

    return jsonify({
        "message": "Category created successfully",
        "data": category_schema.dump(category)
    }), 201