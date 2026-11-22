"""Farmer verification endpoints for AgriBridge."""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import FarmerVerification, User
from app.schemas.farmer_verification_schema import FarmerVerificationSchema


farmer_verifications_bp = Blueprint(
    "farmer_verifications",
    __name__,
)

verification_schema = FarmerVerificationSchema()


def verification_error(code, message, status, details=None):
    error = {
        "code": code,
        "message": message,
    }

    if details is not None:
        error["details"] = details

    return jsonify({"error": error}), status


def serialize_verification(verification):
    """Serialize a farmer verification using the existing schema."""
    return verification_schema.dump(verification)


@farmer_verifications_bp.post("")
@jwt_required()
def create_farmer_verification():
    """Create a verification request for the authenticated farmer."""
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return verification_error(
            "INVALID_JSON",
            "A JSON object is required",
            400,
        )

    allowed_fields = {"farm_location"}
    unexpected = set(payload) - allowed_fields

    if unexpected:
        return verification_error(
            "INVALID_FIELDS",
            "Only farm_location may be submitted by a farmer",
            400,
            {"unexpected": sorted(unexpected)},
        )

    try:
        location = payload.get("farm_location")

        if not isinstance(location, str) or not location.strip():
            return verification_error(
                "INVALID_LOCATION",
                "A non-empty farm_location is required",
                400,
            )

        if len(location.strip()) > 500:
            return verification_error(
                "INVALID_LOCATION",
                "Farm location must not exceed 500 characters",
                400,
            )

        user = db.session.get(User, int(get_jwt_identity()))

        if user is None or user.farmer_profile is None:
            return verification_error(
                "FARMER_REQUIRED",
                "A farmer profile is required",
                403,
            )

        farmer_id = user.farmer_profile.farmer_id

        # Lock the farmer row to serialize requests for this farmer.
        from app.models import FarmerProfile

        farmer = db.session.scalar(
            select(FarmerProfile)
            .where(FarmerProfile.farmer_id == farmer_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )

        if farmer.verification_status == "approved":
            db.session.rollback()
            return verification_error(
                "FARMER_ALREADY_VERIFIED",
                "This farmer is already verified",
                409,
            )

        existing = db.session.scalar(
            select(FarmerVerification)
            .where(
                FarmerVerification.farmer_id == farmer_id,
                FarmerVerification.status.in_(
                    ["pending", "assigned", "submitted"]
                ),
            )
            .limit(1)
        )

        if existing is not None:
            db.session.rollback()
            return verification_error(
                "VERIFICATION_ALREADY_EXISTS",
                "An active verification request already exists",
                409,
            )

        verification = FarmerVerification(
            farmer_id=farmer_id,
            farm_location=location.strip(),
            status="pending",
        )

        db.session.add(verification)
        farmer.verification_status = "pending"
        db.session.commit()

        return jsonify({
            "message": "Verification request submitted successfully",
            "data": serialize_verification(verification),
        }), 201

    except (ValueError, TypeError):
        db.session.rollback()
        return verification_error(
            "INVALID_IDENTITY",
            "Invalid authenticated user identity",
            401,
        )

    except IntegrityError:
        db.session.rollback()
        return verification_error(
            "DATABASE_CONFLICT",
            "Unable to create verification request",
            409,
        )


@farmer_verifications_bp.get("/me")
@jwt_required()
def get_my_farmer_verifications():
    """Return verification requests owned by the authenticated farmer."""
    try:
        user_id = int(get_jwt_identity())
    except (ValueError, TypeError):
        return verification_error(
            "INVALID_IDENTITY",
            "Invalid authenticated user identity",
            401,
        )

    user = db.session.get(User, user_id)

    if user is None or user.farmer_profile is None:
        return verification_error(
            "FARMER_REQUIRED",
            "A farmer profile is required",
            403,
        )

    farmer_id = user.farmer_profile.farmer_id

    verifications = db.session.scalars(
        select(FarmerVerification)
        .where(FarmerVerification.farmer_id == farmer_id)
        .order_by(
            FarmerVerification.created_at.desc(),
            FarmerVerification.verification_id.desc(),
        )
    ).all()

    return jsonify({
        "data": [
            serialize_verification(verification)
            for verification in verifications
        ],
        "count": len(verifications),
    }), 200


@farmer_verifications_bp.get("")
@jwt_required()
def list_farmer_verifications():
    """List farmer verifications for active administrators only."""
    try:
        user_id = int(get_jwt_identity())
    except (ValueError, TypeError):
        return verification_error(
            "INVALID_IDENTITY",
            "Invalid authenticated user identity",
            401,
        )

    from app.models import Admin

    admin = db.session.scalar(
        select(Admin)
        .where(
            Admin.user_id == user_id,
            Admin.status == "active",
        )
        .execution_options(populate_existing=True)
    )

    if admin is None:
        return verification_error(
            "FORBIDDEN",
            "An active administrator account is required",
            403,
        )

    allowed_statuses = {
        "pending",
        "assigned",
        "submitted",
        "approved",
        "rejected",
    }

    status = request.args.get("status")

    if status is not None and status not in allowed_statuses:
        return verification_error(
            "INVALID_STATUS",
            "Invalid verification status filter",
            400,
        )

    limit_raw = request.args.get("limit", "50")

    try:
        limit = int(limit_raw)
    except ValueError:
        return verification_error(
            "INVALID_LIMIT",
            "Limit must be an integer between 1 and 100",
            400,
        )

    if not 1 <= limit <= 100:
        return verification_error(
            "INVALID_LIMIT",
            "Limit must be an integer between 1 and 100",
            400,
        )

    query = select(FarmerVerification)

    if status is not None:
        query = query.where(
            FarmerVerification.status == status
        )

    verifications = db.session.scalars(
        query.order_by(
            FarmerVerification.created_at.desc(),
            FarmerVerification.verification_id.desc(),
        ).limit(limit)
    ).all()

    return jsonify({
        "data": [
            serialize_verification(verification)
            for verification in verifications
        ],
        "count": len(verifications),
    }), 200


def validate_verification_update(payload):
    """Validate fields accepted by the verification workflow."""
    if not isinstance(payload, dict):
        return None, verification_error(
            "INVALID_JSON",
            "A JSON object is required",
            400,
        )

    action = payload.get("action")

    allowed_fields = {
        "assign": {"action", "field_officer_id"},
        "submit": {
            "action",
            "recommendation",
            "remarks",
            "evidence_url",
            "visit_date",
        },
        "review": {"action", "decision", "remarks"},
    }

    if action not in allowed_fields:
        return None, verification_error(
            "INVALID_ACTION",
            "Action must be assign, submit, or review",
            400,
        )

    unexpected = set(payload) - allowed_fields[action]

    if unexpected:
        return None, verification_error(
            "INVALID_FIELDS",
            "Unexpected fields for verification action",
            400,
            {"unexpected": sorted(unexpected)},
        )

    if action == "assign":
        officer_id = payload.get("field_officer_id")

        if type(officer_id) is not int or officer_id <= 0:
            return None, verification_error(
                "INVALID_OFFICER",
                "A positive integer field_officer_id is required",
                400,
            )

    elif action == "submit":
        if payload.get("recommendation") not in ("approve", "reject"):
            return None, verification_error(
                "INVALID_RECOMMENDATION",
                "Recommendation must be approve or reject",
                400,
            )

        if not isinstance(payload.get("remarks"), str) or not payload["remarks"].strip():
            return None, verification_error(
                "INVALID_REMARKS",
                "Non-empty inspection remarks are required",
                400,
            )

        if "visit_date" in payload:
            try:
                from datetime import datetime
                datetime.fromisoformat(payload["visit_date"])
            except (TypeError, ValueError):
                return None, verification_error(
                    "INVALID_VISIT_DATE",
                    "visit_date must be an ISO 8601 datetime",
                    400,
                )

        if "evidence_url" in payload:
            evidence = payload["evidence_url"]

            if evidence is not None and (
                not isinstance(evidence, str)
                or len(evidence) > 2048
            ):
                return None, verification_error(
                    "INVALID_EVIDENCE_URL",
                    "Evidence URL must be a string of at most 2048 characters",
                    400,
                )

    elif action == "review":
        if payload.get("decision") not in ("approved", "rejected"):
            return None, verification_error(
                "INVALID_DECISION",
                "Decision must be approved or rejected",
                400,
            )

    if action == "review" and "remarks" in payload:
        remarks = payload["remarks"]

        if not isinstance(remarks, str) or not remarks.strip():
            return None, verification_error(
                "INVALID_REMARKS",
                "Review remarks must be a non-empty string",
                400,
            )

    return payload, None


@farmer_verifications_bp.patch("/<int:verification_id>")
@jwt_required()
def update_farmer_verification(verification_id):
    """Assign, submit, or review a farmer verification."""
    from datetime import datetime, timezone

    from app.models import Admin, FarmerProfile, FieldOfficer

    payload, error = validate_verification_update(
        request.get_json(silent=True)
    )

    if error is not None:
        return error

    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return verification_error(
            "INVALID_IDENTITY",
            "Invalid authenticated identity",
            401,
        )

    action = payload["action"]

    try:
        verification = db.session.scalar(
            select(FarmerVerification)
            .where(
                FarmerVerification.verification_id == verification_id
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )

        if verification is None:
            db.session.rollback()
            return verification_error(
                "VERIFICATION_NOT_FOUND",
                "Verification request not found",
                404,
            )

        if action in ("assign", "review"):
            admin = db.session.scalar(
                select(Admin)
                .where(
                    Admin.user_id == user_id,
                    Admin.status == "active",
                )
                .execution_options(populate_existing=True)
            )

            if admin is None:
                db.session.rollback()
                return verification_error(
                    "FORBIDDEN",
                    "An active administrator is required",
                    403,
                )

        if action == "assign":
            if verification.status != "pending":
                db.session.rollback()
                return verification_error(
                    "INVALID_STATUS_TRANSITION",
                    "Only pending requests can be assigned",
                    409,
                )

            officer = db.session.scalar(
                select(FieldOfficer)
                .where(
                    FieldOfficer.field_officer_id
                    == payload["field_officer_id"],
                    FieldOfficer.status == "active",
                )
            )

            if officer is None:
                db.session.rollback()
                return verification_error(
                    "FIELD_OFFICER_NOT_FOUND",
                    "Active field officer not found",
                    404,
                )

            verification.field_officer_id = officer.field_officer_id
            verification.assigned_by_admin_id = admin.admin_id
            verification.status = "assigned"

        elif action == "submit":
            officer = db.session.scalar(
                select(FieldOfficer)
                .where(
                    FieldOfficer.user_id == user_id,
                    FieldOfficer.status == "active",
                )
                .execution_options(populate_existing=True)
            )

            if (
                officer is None
                or verification.field_officer_id != officer.field_officer_id
            ):
                db.session.rollback()
                return verification_error(
                    "FORBIDDEN",
                    "Only the assigned active officer can submit",
                    403,
                )

            if verification.status != "assigned":
                db.session.rollback()
                return verification_error(
                    "INVALID_STATUS_TRANSITION",
                    "Only assigned requests can be submitted",
                    409,
                )

            verification.recommendation = payload["recommendation"]
            verification.remarks = payload["remarks"].strip()
            verification.evidence_url = payload.get("evidence_url")

            if payload.get("visit_date") is not None:
                verification.visit_date = datetime.fromisoformat(
                    payload["visit_date"]
                )

            verification.status = "submitted"

        elif action == "review":
            if verification.status != "submitted":
                db.session.rollback()
                return verification_error(
                    "INVALID_STATUS_TRANSITION",
                    "Only submitted requests can be reviewed",
                    409,
                )

            farmer = db.session.scalar(
                select(FarmerProfile)
                .where(
                    FarmerProfile.farmer_id == verification.farmer_id
                )
                .with_for_update()
            )

            if farmer is None:
                db.session.rollback()
                return verification_error(
                    "FARMER_NOT_FOUND",
                    "Farmer profile not found",
                    404,
                )

            decision = payload["decision"]
            verification.status = decision
            verification.reviewed_by_admin_id = admin.admin_id
            verification.reviewed_at = datetime.now(timezone.utc).replace(
                tzinfo=None
            )

            if isinstance(payload.get("remarks"), str):
                verification.remarks = payload["remarks"].strip()

            farmer.verification_status = decision

        db.session.commit()

        return jsonify({
            "message": "Verification updated successfully",
            "data": serialize_verification(verification),
        }), 200

    except IntegrityError:
        db.session.rollback()
        return verification_error(
            "DATABASE_CONFLICT",
            "Unable to update verification",
            409,
        )
