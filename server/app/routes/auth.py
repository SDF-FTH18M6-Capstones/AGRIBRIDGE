
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, jwt_required
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import PasswordResetToken, RevokedToken, Role, User
from app.schemas.user_schema import UserSchema


auth_bp = Blueprint("auth", __name__)

user_schema = UserSchema()


def error_response(code, message, status_code):
    return jsonify({
        "error": {
            "code": code,
            "message": message,
        }
    }), status_code


def success_response(message, data=None, status_code=200):
    response = {"message": message}

    if data is not None:
        response["data"] = data

    return jsonify(response), status_code


def _send_reset_email(user, raw_token):
    reset_url = current_app.config.get(
        "PASSWORD_RESET_URL",
        "http://localhost:5173/reset-password",
    )

    reset_link = f"{reset_url}?token={raw_token}"

    import smtplib
    import ssl
    from email.message import EmailMessage

    server = current_app.config.get("MAIL_SERVER")
    sender = current_app.config.get("MAIL_DEFAULT_SENDER")
    if not server or not sender:
        raise RuntimeError("Password reset email is not configured")
    message = EmailMessage()
    message["Subject"] = "Reset your AgriBridge password"
    message["From"] = sender
    message["To"] = user.email
    message.set_content(f"Reset your password using this link: {reset_link}\n"
                        "If you did not request this, ignore this email.")
    transport = smtplib.SMTP_SSL if current_app.config["MAIL_USE_SSL"] else smtplib.SMTP
    with transport(server, current_app.config["MAIL_PORT"],
                   timeout=current_app.config["MAIL_TIMEOUT"],
                   **({"context": ssl.create_default_context()} if current_app.config["MAIL_USE_SSL"] else {})) as smtp:
        if current_app.config["MAIL_USE_TLS"] and not current_app.config["MAIL_USE_SSL"]:
            smtp.starttls(context=ssl.create_default_context())
        if current_app.config.get("MAIL_USERNAME"):
            smtp.login(current_app.config["MAIL_USERNAME"], current_app.config["MAIL_PASSWORD"])
        smtp.send_message(message)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A valid JSON object is required.",
            400,
        )

    try:
        values = user_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Please provide valid registration details.",
                "details": error.messages,
            }
        }), 400

    email = values["email"].strip().lower()
    phone_number = values.get("phone_number")

    if phone_number:
        phone_number = phone_number.strip()

    if User.query.filter_by(email=email).first():
        return error_response(
            "USER_EXISTS",
            "An account with this email already exists.",
            409,
        )

    if phone_number and User.query.filter_by(
        phone_number=phone_number
    ).first():
        return error_response(
            "PHONE_EXISTS",
            "An account with this phone number already exists.",
            409,
        )

    try:
        user = User(
            full_name=values["full_name"].strip(),
            email=email,
            phone_number=phone_number,
            role_id=None,
        )

        user.set_password(values["password"])

        db.session.add(user)
        db.session.commit()

    except IntegrityError:
        db.session.rollback()
        return error_response(
            "REGISTRATION_CONFLICT",
            "An account with these details already exists.",
            409,
        )

    from app.routes.profiles import get_user_data
    from app.services.sessions import new_session
    user_data = get_user_data(user)
    return success_response("Registration successful.", {
        **user_data, "user": user_data,
        **new_session(user),
    }, 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A valid JSON object is required.",
            400,
        )

    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str):
        return error_response(
            "VALIDATION_ERROR",
            "Email and password are required.",
            400,
        )

    user = User.query.filter_by(
        email=email.strip().lower()
    ).first()

    if user is None or not user.check_password(password):
        return error_response(
            "INVALID_CREDENTIALS",
            "Invalid email or password.",
            401,
        )

    from app.routes.profiles import get_user_data

    from app.services.sessions import new_session
    session_credentials = new_session(user)

    return success_response(
        "Login successful.",
        {
            **session_credentials,
            "user": get_user_data(user),
        },
    )


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]

    existing_token = RevokedToken.query.filter_by(
        jti=jti
    ).first()

    if existing_token is None:
        db.session.add(RevokedToken(jti=jti))
        db.session.commit()

    from app.services.sessions import current_session
    session = current_session()
    if session:
        session.revoked_at = datetime.now(timezone.utc)
        db.session.commit()
    return success_response("Successfully logged out.")


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A valid JSON object is required.",
            400,
        )

    email = data.get("email")

    if not isinstance(email, str) or not email.strip():
        return error_response(
            "VALIDATION_ERROR",
            "Email is required.",
            400,
        )

    user = User.query.filter_by(
        email=email.strip().lower()
    ).first()

    if user:
        raw_token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()

        expiration_minutes = current_app.config.get(
            "PASSWORD_RESET_TOKEN_MINUTES",
            15,
        )

        reset_token = PasswordResetToken(
            user_id=user.user_id,
            token_hash=token_hash,
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(minutes=expiration_minutes)
            ),
        )

        db.session.add(reset_token)
        db.session.commit()

        try:
            _send_reset_email(user, raw_token)
        except Exception:
            current_app.logger.exception(
                "Unable to prepare password reset email."
            )

    return success_response(
        "If an account exists with that email, a password reset link has been sent."
    )


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR",
            "A valid JSON object is required.",
            400,
        )

    raw_token = data.get("token")
    new_password = data.get(
        "new_password",
        data.get("password"),
    )
    confirm_password = data.get("confirm_new_password")

    if (
        not isinstance(raw_token, str)
        or not raw_token.strip()
        or not isinstance(new_password, str)
    ):
        return error_response(
            "VALIDATION_ERROR",
            "A reset token and new password are required.",
            400,
        )

    from app.services.passwords import password_errors
    errors = password_errors(new_password)
    if errors:
        return error_response('VALIDATION_ERROR', ' '.join(errors), 400)

    if (
        confirm_password is not None
        and confirm_password != new_password
    ):
        return error_response(
            "VALIDATION_ERROR",
            "Passwords do not match.",
            400,
        )

    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    reset_record = PasswordResetToken.query.filter_by(
        token_hash=token_hash,
        used_at=None,
    ).first()

    if reset_record is None:
        return error_response(
            "INVALID_RESET_TOKEN",
            "The password reset token is invalid or has already been used.",
            400,
        )

    expires_at = reset_record.expires_at

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        return error_response(
            "INVALID_RESET_TOKEN",
            "The password reset token has expired.",
            400,
        )

    user = db.session.get(User, reset_record.user_id)

    if user is None:
        return error_response(
            "INVALID_RESET_TOKEN",
            "The password reset token is invalid.",
            400,
        )

    # Serialize resets for the account and re-read token state after locking.
    from sqlalchemy import select, update
    user = db.session.scalar(select(User).where(User.user_id == user.user_id)
                             .with_for_update().execution_options(populate_existing=True))
    db.session.refresh(reset_record)
    if reset_record.used_at is not None:
        return error_response("INVALID_RESET_TOKEN", "The reset token has already been used.", 400)
    user.set_password(new_password)
    user.auth_version += 1
    from app.models import AuthSession
    db.session.execute(update(AuthSession).where(AuthSession.user_id == user.user_id).values(revoked_at=datetime.now(timezone.utc)))
    db.session.execute(update(PasswordResetToken).where(
        PasswordResetToken.user_id == user.user_id,
        PasswordResetToken.used_at.is_(None),
    ).values(used_at=datetime.now(timezone.utc)))

    db.session.commit()

    return success_response("Password reset successful.")
