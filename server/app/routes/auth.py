from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token
from marshmallow import ValidationError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import Role, User
from app.schemas.user_schema import UserSchema


auth_bp = Blueprint("auth", __name__)
user_schema = UserSchema()


def invalid_json_response():
    return jsonify({
        "error": {
            "code": "INVALID_JSON",
            "message": "Request body must be a JSON object",
        }
    }), 400


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return invalid_json_response()

    try:
        values = user_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid registration data",
                "fields": error.messages,
            }
        }), 400

    email = values["email"].strip().lower()
    phone_number = values.get("phone_number")
    if phone_number == "":
        phone_number = None

    existing_user = User.query.filter(func.lower(User.email) == email).first()
    if existing_user:
        return jsonify({
            "error": {
                "code": "USER_EXISTS",
                "message": "An account with this email already exists",
            }
        }), 409

    if phone_number and User.query.filter_by(phone_number=phone_number).first():
        return jsonify({
            "error": {
                "code": "USER_EXISTS",
                "message": "An account with this phone number already exists",
            }
        }), 409

    try:
        role_name = values["role"]
        role = Role.query.filter_by(role_name=role_name).first()
        if role is None:
            role = Role(role_name=role_name)
            db.session.add(role)
            db.session.flush()

        user = User(
            full_name=values["full_name"].strip(),
            email=email,
            phone_number=phone_number,
            role_id=role.role_id,
        )
        user.set_password(values["password"])
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "error": {
                "code": "USER_EXISTS",
                "message": "An account with these details already exists",
            }
        }), 409

    return jsonify({
        "message": "Registration successful",
        "data": {
            "user_id": user.user_id,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": role.role_name,
        },
    }), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return invalid_json_response()

    email = data.get("email")
    password = data.get("password")
    if not isinstance(email, str) or not email.strip() or not isinstance(password, str) or not password:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Email and password are required",
                "fields": {
                    "email": ["A valid email is required"] if not isinstance(email, str) or not email.strip() else [],
                    "password": ["A password is required"] if not isinstance(password, str) or not password else [],
                },
            }
        }), 400

    user = User.query.filter_by(email=email.strip().lower()).first()
    if user is None or not user.check_password(password):
        return jsonify({
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password",
            }
        }), 401

    access_token = create_access_token(identity=str(user.user_id))
    return jsonify({
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "token_type": "Bearer",
            "user": {
                "user_id": user.user_id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.role_name,
            },
        },
    }), 200
