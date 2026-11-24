from tests.verification_evidence import verification_payload, inspection_payload
"""Integration tests for the Farmer Verification API."""

import os

import pytest
from dotenv import load_dotenv

from app import create_app
from app.extensions import db


EXPECTED_TEST_HOST = (
    "ep-nameless-surf-bajq6gi8.c-8.eu-central-1.aws.neon.tech"
)


@pytest.fixture
def app():
    from tests.database import isolated_app
    with isolated_app() as test_app:
        yield test_app

@pytest.fixture
def client(app):
    return app.test_client()


def test_verification_creation_requires_authentication(client):
    response = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, {}),
    )

    assert response.status_code == 401


@pytest.fixture
def farmer_data(app):
    """Create and clean up an isolated farmer test account."""
    import uuid

    from sqlalchemy import delete
    from app.models import (
        Role,
        User,
        FarmerProfile,
        FarmerVerification,
    )

    suffix = uuid.uuid4().hex

    with app.app_context():
        farmer_role = Role.query.filter_by(
            role_name="farmer"
        ).one()

        user = User(
            full_name="Verification Pytest Farmer",
            email=f"verification-farmer-{suffix}@example.com",
            password_hash="integration-test-only",
            role_id=farmer_role.role_id,
        )

        db.session.add(user)
        db.session.flush()

        farmer = FarmerProfile(
            user_id=user.user_id,
            farm_name="Verification Pytest Farm",
            location="Nakuru",
            verification_status="pending",
        )

        db.session.add(farmer)
        db.session.commit()

        user_id = user.user_id
        farmer_id = farmer.farmer_id

        try:
            yield {
                "user_id": user_id,
                "farmer_id": farmer_id,
            }
        finally:
            db.session.rollback()

            db.session.execute(
                delete(FarmerVerification).where(
                    FarmerVerification.farmer_id == farmer_id
                )
            )

            db.session.execute(
                delete(FarmerProfile).where(
                    FarmerProfile.farmer_id == farmer_id
                )
            )

            db.session.execute(
                delete(User).where(
                    User.user_id == user_id
                )
            )

            db.session.commit()


def test_farmer_creates_pending_verification(
    client, app, farmer_data
):
    """An authenticated farmer can submit a verification request."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    response = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, {"Authorization": f"Bearer {token}"}),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.get_json()

    data = response.get_json()["data"]

    assert data["farmer_id"] == farmer_data["farmer_id"]
    assert data["status"] == "pending"
    assert data["farm_location"] == "Nakuru County"
    assert data["field_officer_id"] is None

    with app.app_context():
        verification = db.session.get(
            FarmerVerification,
            data["verification_id"],
        )

        assert verification is not None
        assert verification.farmer_id == farmer_data["farmer_id"]
        assert verification.status == "pending"


def test_duplicate_active_verification_is_rejected(
    client, app, farmer_data
):
    """A farmer cannot create two active verification requests."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    headers = {"Authorization": f"Bearer {token}"}
    payload = {"farm_location": "Nakuru County"}

    first = client.post(
        "/api/farmer-verifications",
        json=verification_payload(payload, headers),
        headers=headers,
    )

    assert first.status_code == 201, first.get_json()

    second = client.post(
        "/api/farmer-verifications",
        json=verification_payload(payload, headers),
        headers=headers,
    )

    assert second.status_code == 409, second.get_json()
    assert (
        second.get_json()["error"]["code"]
        == "VERIFICATION_ALREADY_EXISTS"
    )

    with app.app_context():
        count = FarmerVerification.query.filter_by(
            farmer_id=farmer_data["farmer_id"]
        ).count()

        assert count == 1


@pytest.mark.parametrize(
    "restricted_field,value",
    [
        ("field_officer_id", 1),
        ("status", "approved"),
        ("recommendation", "approve"),
        ("reviewed_by_admin_id", 1),
        ("farmer_id", 999),
    ],
)
def test_farmer_cannot_submit_restricted_fields(
    client, app, farmer_data, restricted_field, value
):
    """Farmers cannot control verification ownership or decisions."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    response = client.post(
        "/api/farmer-verifications",
        json=verification_payload({
            "farm_location": "Nakuru County",
            restricted_field: value,
        }, {"Authorization": f"Bearer {token}"}),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400, response.get_json()
    assert (
        response.get_json()["error"]["code"]
        == "INVALID_FIELDS"
    )

    with app.app_context():
        count = FarmerVerification.query.filter_by(
            farmer_id=farmer_data["farmer_id"]
        ).count()

        assert count == 0


def test_my_verifications_requires_authentication(client):
    """Unauthenticated users cannot view farmer verifications."""
    response = client.get("/api/farmer-verifications/me")

    assert response.status_code == 401


def test_farmer_with_no_verifications_gets_empty_list(
    client, app, farmer_data
):
    """A farmer without verification requests gets an empty list."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    response = client.get(
        "/api/farmer-verifications/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.get_json()
    assert response.get_json()["data"] == []
    assert response.get_json()["count"] == 0


def test_farmer_can_retrieve_own_verification(
    client, app, farmer_data
):
    """Farmers can retrieve their own submitted verification."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers),
        headers=headers,
    )

    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]

    response = client.get(
        "/api/farmer-verifications/me",
        headers=headers,
    )

    assert response.status_code == 200, response.get_json()

    result = response.get_json()

    assert result["count"] == 1
    assert len(result["data"]) == 1
    assert result["data"][0]["verification_id"] == verification_id
    assert result["data"][0]["farmer_id"] == farmer_data["farmer_id"]
    assert result["data"][0]["status"] == "pending"
    assert result["data"][0]["farm_location"] == "Nakuru County"


def test_farmer_cannot_view_another_farmers_verification(
    client, app, farmer_data
):
    """A farmer must not see another farmer's verification records."""
    import uuid

    from flask_jwt_extended import create_access_token
    from app.models import Role, User, FarmerProfile

    with app.app_context():
        owner_token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

        role = Role.query.filter_by(role_name="farmer").one()

        other_user = User(
            full_name="Verification Isolation Farmer",
            email=f"verification-isolation-{uuid.uuid4().hex}@example.com",
            password_hash="integration-test-only",
            role_id=role.role_id,
        )

        db.session.add(other_user)
        db.session.flush()

        other_farmer = FarmerProfile(
            user_id=other_user.user_id,
            farm_name="Isolation Test Farm",
            location="Nyeri",
            verification_status="pending",
        )

        db.session.add(other_farmer)
        db.session.commit()

        other_user_id = other_user.user_id
        other_farmer_id = other_farmer.farmer_id

        other_token = create_access_token(
            identity=str(other_user_id)
        )

    try:
        created = client.post(
            "/api/farmer-verifications",
            json=verification_payload({"farm_location": "Nakuru County"}, {
                "Authorization": f"Bearer {owner_token}"
            }),
            headers={
                "Authorization": f"Bearer {owner_token}"
            },
        )

        assert created.status_code == 201, created.get_json()

        response = client.get(
            "/api/farmer-verifications/me",
            headers={
                "Authorization": f"Bearer {other_token}"
            },
        )

        assert response.status_code == 200, response.get_json()
        assert response.get_json()["data"] == []
        assert response.get_json()["count"] == 0

    finally:
        with app.app_context():
            db.session.rollback()
            db.session.delete(
                db.session.get(FarmerProfile, other_farmer_id)
            )
            db.session.delete(
                db.session.get(User, other_user_id)
            )
            db.session.commit()


def test_verification_listing_requires_authentication(client):
    """Anonymous users cannot list verification requests."""
    response = client.get("/api/farmer-verifications")

    assert response.status_code == 401


def test_farmer_cannot_list_all_verifications(
    client, app, farmer_data
):
    """Farmers cannot access the administrator verification listing."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    response = client.get(
        "/api/farmer-verifications",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403, response.get_json()
    assert response.get_json()["error"]["code"] == "FORBIDDEN"


@pytest.fixture
def verification_admin(app, farmer_data):
    """Create an isolated administrator for verification API tests."""
    import uuid
    from app.models import Role, User, Admin

    with app.app_context():
        role = Role.query.filter_by(role_name="admin").one_or_none()
        created_role_id = None

        if role is None:
            role = Role(role_name="admin")
            db.session.add(role)
            db.session.flush()
            created_role_id = role.role_id

        user = User(
            full_name="Verification Pytest Administrator",
            email=f"verification-admin-{uuid.uuid4().hex}@example.com",
            password_hash="integration-test-only",
            role_id=role.role_id,
        )

        try:
            db.session.add(user)
            db.session.flush()

            admin = Admin(
                user_id=user.user_id,
                status="active",
            )

            db.session.add(admin)
            db.session.commit()

            user_id = user.user_id
            admin_id = admin.admin_id

            yield {
                "user_id": user_id,
                "admin_id": admin_id,
            }

        finally:
            db.session.rollback()

            if "admin_id" in locals():
                from sqlalchemy import update
                from app.models import FarmerVerification

                db.session.execute(
                    update(FarmerVerification)
                    .where(
                        FarmerVerification.farmer_id
                        == farmer_data["farmer_id"],
                        (
                            (FarmerVerification.assigned_by_admin_id == admin_id)
                            | (FarmerVerification.reviewed_by_admin_id == admin_id)
                        ),
                    )
                    .values(
                        assigned_by_admin_id=None,
                        reviewed_by_admin_id=None,
                    )
                )

            if user.user_id is not None:
                db.session.query(Admin).filter_by(
                    user_id=user.user_id
                ).delete(synchronize_session=False)

                db.session.query(User).filter_by(
                    user_id=user.user_id
                ).delete(synchronize_session=False)

            if created_role_id is not None:
                db.session.query(Role).filter_by(
                    role_id=created_role_id
                ).delete(synchronize_session=False)

            db.session.commit()


def test_active_admin_can_list_verifications(
    client, app, farmer_data, verification_admin
):
    """Active administrators can list farmer verification requests."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        farmer_token = create_access_token(
            identity=str(farmer_data["user_id"])
        )
        admin_token = create_access_token(
            identity=str(verification_admin["user_id"])
        )

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, {"Authorization": f"Bearer {farmer_token}"}),
        headers={"Authorization": f"Bearer {farmer_token}"},
    )

    assert created.status_code == 201, created.get_json()
    verification_id = created.get_json()["data"]["verification_id"]

    response = client.get(
        "/api/farmer-verifications?status=pending",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200, response.get_json()

    records = response.get_json()["data"]

    assert any(
        record["verification_id"] == verification_id
        for record in records
    )


def test_suspended_admin_cannot_list_verifications(
    client, app, verification_admin
):
    """Suspended administrators cannot list verification requests."""
    from flask_jwt_extended import create_access_token
    from app.models import Admin

    with app.app_context():
        admin = db.session.get(
            Admin,
            verification_admin["admin_id"],
        )
        admin.status = "suspended"
        db.session.commit()

        db.session.expire_all()
        persisted_admin = db.session.get(
            Admin,
            verification_admin["admin_id"],
        )
        assert persisted_admin.status == "suspended"

        token = create_access_token(
            identity=str(verification_admin["user_id"])
        )

    response = client.get(
        "/api/farmer-verifications",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403, response.get_json()
    assert response.get_json()["error"]["code"] == "FORBIDDEN"


@pytest.mark.parametrize(
    "query_string,error_code",
    [
        ("status=invalid", "INVALID_STATUS"),
        ("limit=abc", "INVALID_LIMIT"),
        ("limit=0", "INVALID_LIMIT"),
        ("limit=101", "INVALID_LIMIT"),
    ],
)
def test_admin_listing_rejects_invalid_filters(
    client, app, verification_admin, query_string, error_code
):
    """Invalid listing parameters must return HTTP 400."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity=str(verification_admin["user_id"])
        )

    response = client.get(
        f"/api/farmer-verifications?{query_string}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 400, response.get_json()
    assert response.get_json()["error"]["code"] == error_code


@pytest.fixture
def verification_officer(app, farmer_data):
    """Create an isolated active field officer for workflow tests."""
    import uuid
    from app.models import Role, User, FieldOfficer

    suffix = uuid.uuid4().hex

    with app.app_context():
        role = Role.query.filter_by(
            role_name="field_officer"
        ).one_or_none()

        created_role_id = None

        try:
            if role is None:
                role = Role(role_name="field_officer")
                db.session.add(role)
                db.session.flush()
                created_role_id = role.role_id

            user = User(
                full_name="Verification Pytest Field Officer",
                email=f"verification-officer-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=role.role_id,
            )

            db.session.add(user)
            db.session.flush()

            officer = FieldOfficer(
                user_id=user.user_id,
                staff_number=f"TEST-{suffix[:16]}",
                status="active",
            )

            db.session.add(officer)
            db.session.commit()

            user_id = user.user_id
            officer_id = officer.field_officer_id

            yield {
                "user_id": user_id,
                "officer_id": officer_id,
            }

        finally:
            db.session.rollback()

            if "officer_id" in locals():
                from sqlalchemy import update
                from app.models import FarmerVerification

                db.session.execute(
                    update(FarmerVerification)
                    .where(
                        FarmerVerification.farmer_id
                        == farmer_data["farmer_id"],
                        FarmerVerification.field_officer_id == officer_id,
                    )
                    .values(field_officer_id=None)
                )

            if "user_id" in locals():
                db.session.query(FieldOfficer).filter_by(
                    user_id=user_id
                ).delete(synchronize_session=False)

                db.session.query(User).filter_by(
                    user_id=user_id
                ).delete(synchronize_session=False)

            if created_role_id is not None:
                db.session.query(Role).filter_by(
                    role_id=created_role_id
                ).delete(synchronize_session=False)

            db.session.commit()


def test_complete_farmer_approval_workflow(
    client, app, farmer_data, verification_admin, verification_officer
):
    """Verify submission, assignment, inspection, and approval."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification, FarmerProfile

    with app.app_context():
        farmer_token = create_access_token(
            identity=str(farmer_data["user_id"])
        )
        admin_token = create_access_token(
            identity=str(verification_admin["user_id"])
        )
        officer_token = create_access_token(
            identity=str(verification_officer["user_id"])
        )

    def auth(token):
        return {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, auth(farmer_token)),
        headers=auth(farmer_token),
    )
    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]
    url = f"/api/farmer-verifications/{verification_id}"

    assigned = client.patch(
        url,
        json=inspection_payload({
            "action": "assign",
            "field_officer_id": verification_officer["officer_id"],
        }, auth(admin_token), url),
        headers=auth(admin_token),
    )
    assert assigned.status_code == 200, assigned.get_json()
    assert assigned.get_json()["data"]["status"] == "assigned"

    submitted = client.patch(
        url,
        json=inspection_payload({
            "action": "submit",
            "recommendation": "approve",
            "remarks": "Farm inspected and verified.",
        }, auth(officer_token), url),
        headers=auth(officer_token),
    )
    assert submitted.status_code == 200, submitted.get_json()
    assert submitted.get_json()["data"]["status"] == "submitted"

    approved = client.patch(
        url,
        json=inspection_payload({
            "action": "review",
            "decision": "approved",
        }, auth(admin_token), url),
        headers=auth(admin_token),
    )
    assert approved.status_code == 200, approved.get_json()
    assert approved.get_json()["data"]["status"] == "approved"

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification, verification_id
        )
        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )

        assert verification.status == "approved"
        assert verification.reviewed_by_admin_id == (
            verification_admin["admin_id"]
        )
        assert verification.reviewed_at is not None
        assert farmer.verification_status == "approved"


@pytest.mark.parametrize(
    "payload",
    [
        {"action": "assign", "field_officer_id": 1},
        {"action": "review", "decision": "approved"},
    ],
)
def test_farmer_cannot_perform_admin_actions(
    client, app, farmer_data, payload
):
    """Farmers cannot assign officers or approve verifications."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers),
        headers=headers,
    )

    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]

    response = client.patch(
        f"/api/farmer-verifications/{verification_id}",
        json=inspection_payload(payload, headers, f"/api/farmer-verifications/{verification_id}"),
        headers=headers,
    )

    assert response.status_code == 403, response.get_json()
    assert response.get_json()["error"]["code"] == "FORBIDDEN"

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification,
            verification_id,
        )

        assert verification.status == "pending"
        assert verification.field_officer_id is None
        assert verification.reviewed_by_admin_id is None


def test_complete_farmer_rejection_workflow(
    client, app, farmer_data, verification_admin, verification_officer
):
    """An administrator can reject a submitted inspection."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification, FarmerProfile

    with app.app_context():
        tokens = {
            "farmer": create_access_token(
                identity=str(farmer_data["user_id"])
            ),
            "admin": create_access_token(
                identity=str(verification_admin["user_id"])
            ),
            "officer": create_access_token(
                identity=str(verification_officer["user_id"])
            ),
        }

    def headers(role):
        return {"Authorization": f"Bearer {tokens[role]}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers("farmer")),
        headers=headers("farmer"),
    )
    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]
    url = f"/api/farmer-verifications/{verification_id}"

    assigned = client.patch(
        url,
        json=inspection_payload({
            "action": "assign",
            "field_officer_id": verification_officer["officer_id"],
        }, headers("admin"), url),
        headers=headers("admin"),
    )
    assert assigned.status_code == 200, assigned.get_json()

    submitted = client.patch(
        url,
        json=inspection_payload({
            "action": "submit",
            "recommendation": "reject",
            "remarks": "Farm inspection requirements not met.",
        }, headers("officer"), url),
        headers=headers("officer"),
    )
    assert submitted.status_code == 200, submitted.get_json()
    assert submitted.get_json()["data"]["status"] == "submitted"

    rejected = client.patch(
        url,
        json=inspection_payload({
            "action": "review",
            "decision": "rejected",
            "remarks": "Farm requirements were not met; please correct the inspection issues.",
        }, headers("admin"), url),
        headers=headers("admin"),
    )
    assert rejected.status_code == 200, rejected.get_json()
    assert rejected.get_json()["data"]["status"] == "rejected"

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification, verification_id
        )
        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )

        assert verification.status == "rejected"
        assert verification.reviewed_by_admin_id == (
            verification_admin["admin_id"]
        )
        assert verification.reviewed_at is not None
        assert farmer.verification_status == "rejected"


def test_complete_farmer_rejection_workflow(
    client, app, farmer_data, verification_admin, verification_officer
):
    """An administrator can reject a submitted inspection."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification, FarmerProfile

    with app.app_context():
        tokens = {
            "farmer": create_access_token(
                identity=str(farmer_data["user_id"])
            ),
            "admin": create_access_token(
                identity=str(verification_admin["user_id"])
            ),
            "officer": create_access_token(
                identity=str(verification_officer["user_id"])
            ),
        }

    def headers(role):
        return {"Authorization": f"Bearer {tokens[role]}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers("farmer")),
        headers=headers("farmer"),
    )
    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]
    url = f"/api/farmer-verifications/{verification_id}"

    assigned = client.patch(
        url,
        json=inspection_payload({
            "action": "assign",
            "field_officer_id": verification_officer["officer_id"],
        }, headers("admin"), url),
        headers=headers("admin"),
    )
    assert assigned.status_code == 200, assigned.get_json()

    submitted = client.patch(
        url,
        json=inspection_payload({
            "action": "submit",
            "recommendation": "reject",
            "remarks": "Farm inspection requirements not met.",
        }, headers("officer"), url),
        headers=headers("officer"),
    )
    assert submitted.status_code == 200, submitted.get_json()
    assert submitted.get_json()["data"]["status"] == "submitted"

    rejected = client.patch(
        url,
        json=inspection_payload({
            "action": "review",
            "decision": "rejected",
            "remarks": "Farm requirements were not met; please correct the inspection issues.",
        }, headers("admin"), url),
        headers=headers("admin"),
    )
    assert rejected.status_code == 200, rejected.get_json()
    assert rejected.get_json()["data"]["status"] == "rejected"

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification, verification_id
        )
        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )

        assert verification.status == "rejected"
        assert verification.reviewed_by_admin_id == (
            verification_admin["admin_id"]
        )
        assert verification.reviewed_at is not None
        assert farmer.verification_status == "rejected"


def test_suspended_officer_cannot_submit_inspection(
    client, app, farmer_data, verification_admin, verification_officer
):
    """A suspended officer cannot submit inspection findings."""
    from flask_jwt_extended import create_access_token
    from app.models import FieldOfficer, FarmerVerification

    with app.app_context():
        farmer_token = create_access_token(
            identity=str(farmer_data["user_id"])
        )
        admin_token = create_access_token(
            identity=str(verification_admin["user_id"])
        )
        officer_token = create_access_token(
            identity=str(verification_officer["user_id"])
        )

    def headers(token):
        return {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers(farmer_token)),
        headers=headers(farmer_token),
    )
    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]
    url = f"/api/farmer-verifications/{verification_id}"

    assigned = client.patch(
        url,
        json=inspection_payload({
            "action": "assign",
            "field_officer_id": verification_officer["officer_id"],
        }, headers(admin_token), url),
        headers=headers(admin_token),
    )
    assert assigned.status_code == 200, assigned.get_json()

    with app.app_context():
        officer = db.session.get(
            FieldOfficer,
            verification_officer["officer_id"],
        )
        officer.status = "suspended"
        db.session.commit()

    response = client.patch(
        url,
        json=inspection_payload({
            "action": "submit",
            "recommendation": "approve",
            "remarks": "Inspection completed.",
        }, headers(officer_token), url),
        headers=headers(officer_token),
    )

    assert response.status_code == 403, response.get_json()
    assert response.get_json()["error"]["code"] == "FORBIDDEN"

    with app.app_context():
        db.session.expire_all()
        verification = db.session.get(
            FarmerVerification,
            verification_id,
        )

        assert verification.status == "assigned"
        assert verification.recommendation is None


def test_admin_cannot_approve_pending_verification(
    client, app, farmer_data, verification_admin
):
    """An administrator cannot skip the inspection workflow."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification, FarmerProfile

    with app.app_context():
        farmer_token = create_access_token(
            identity=str(farmer_data["user_id"])
        )
        admin_token = create_access_token(
            identity=str(verification_admin["user_id"])
        )

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, {"Authorization": f"Bearer {farmer_token}"}),
        headers={"Authorization": f"Bearer {farmer_token}"},
    )
    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]

    response = client.patch(
        f"/api/farmer-verifications/{verification_id}",
        json=inspection_payload({
            "action": "review",
            "decision": "approved",
        }, {"Authorization": f"Bearer {admin_token}"}, f"/api/farmer-verifications/{verification_id}"),
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 409, response.get_json()
    assert (
        response.get_json()["error"]["code"]
        == "INVALID_STATUS_TRANSITION"
    )

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification, verification_id
        )
        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )

        assert verification.status == "pending"
        assert verification.reviewed_by_admin_id is None
        assert farmer.verification_status == "pending"


@pytest.mark.parametrize("second_decision", ["approved", "rejected"])
def test_completed_verification_cannot_be_reviewed_again(
    client, app, farmer_data, verification_admin,
    verification_officer, second_decision
):
    """Completed verification decisions cannot be changed."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification, FarmerProfile

    with app.app_context():
        tokens = {
            "farmer": create_access_token(
                identity=str(farmer_data["user_id"])
            ),
            "admin": create_access_token(
                identity=str(verification_admin["user_id"])
            ),
            "officer": create_access_token(
                identity=str(verification_officer["user_id"])
            ),
        }

    def headers(role):
        return {"Authorization": f"Bearer {tokens[role]}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers("farmer")),
        headers=headers("farmer"),
    )
    assert created.status_code == 201, created.get_json()

    verification_id = created.get_json()["data"]["verification_id"]
    url = f"/api/farmer-verifications/{verification_id}"

    assigned = client.patch(
        url,
        json=inspection_payload({
            "action": "assign",
            "field_officer_id": verification_officer["officer_id"],
        }, headers("admin"), url),
        headers=headers("admin"),
    )
    assert assigned.status_code == 200, assigned.get_json()

    submitted = client.patch(
        url,
        json=inspection_payload({
            "action": "submit",
            "recommendation": "approve",
            "remarks": "Inspection requirements met.",
        }, headers("officer"), url),
        headers=headers("officer"),
    )
    assert submitted.status_code == 200, submitted.get_json()

    approved = client.patch(
        url,
        json=inspection_payload({"action": "review", "decision": "approved"}, headers("admin"), url),
        headers=headers("admin"),
    )
    assert approved.status_code == 200, approved.get_json()

    repeated = client.patch(
        url,
        json=inspection_payload({
            "action": "review",
            "decision": second_decision,
            "remarks": "This verification has already been reviewed.",
        }, headers("admin"), url),
        headers=headers("admin"),
    )

    assert repeated.status_code == 409, repeated.get_json()
    assert (
        repeated.get_json()["error"]["code"]
        == "INVALID_STATUS_TRANSITION"
    )

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification, verification_id
        )
        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )

        assert verification.status == "approved"
        assert farmer.verification_status == "approved"


def test_approved_farmer_cannot_reapply(client, app, farmer_data):
    """An already verified farmer cannot submit another request."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerProfile, FarmerVerification

    with app.app_context():
        farmer = db.session.get(
            FarmerProfile,
            farmer_data["farmer_id"],
        )
        farmer.verification_status = "approved"
        db.session.commit()

        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    response = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, {"Authorization": f"Bearer {token}"}),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 409, response.get_json()
    assert (
        response.get_json()["error"]["code"]
        == "FARMER_ALREADY_VERIFIED"
    )

    with app.app_context():
        count = FarmerVerification.query.filter_by(
            farmer_id=farmer_data["farmer_id"]
        ).count()

        assert count == 0


def test_rejected_farmer_can_reapply(client, app, farmer_data):
    """A rejected farmer may submit a new verification request."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerProfile, FarmerVerification

    with app.app_context():
        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )

        previous = FarmerVerification(
            farmer_id=farmer_data["farmer_id"],
            farm_location="Previous Farm Location",
            status="rejected",
        )

        farmer.verification_status = "rejected"
        db.session.add(previous)
        db.session.commit()

        previous_id = previous.verification_id

        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    response = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Updated Farm Location"}, {"Authorization": f"Bearer {token}"}),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.get_json()

    new_id = response.get_json()["data"]["verification_id"]
    assert new_id != previous_id
    assert response.get_json()["data"]["status"] == "pending"

    with app.app_context():
        db.session.expire_all()

        records = FarmerVerification.query.filter_by(
            farmer_id=farmer_data["farmer_id"]
        ).all()

        assert len(records) == 2
        assert {r.status for r in records} == {
            "rejected", "pending"
        }

        farmer = db.session.get(
            FarmerProfile, farmer_data["farmer_id"]
        )
        assert farmer.verification_status == "pending"


@pytest.mark.parametrize(
    "payload,error_code",
    [
        (
            {
                "action": "submit",
                "recommendation": "approve",
                "remarks": "Inspection completed",
                "evidence_url": {"invalid": "object"},
            },
            "INVALID_FIELDS",
        ),
        (
            {
                "action": "submit",
                "recommendation": "approve",
                "remarks": "Inspection completed",
                "evidence_url": "x" * 2049,
            },
            "INVALID_FIELDS",
        ),
        (
            {
                "action": "review",
                "decision": "approved",
                "remarks": ["invalid"],
            },
            "INVALID_REMARKS",
        ),
        (
            {
                "action": "review",
                "decision": "rejected",
            "remarks": "Farm requirements were not met; please correct the inspection issues.",
                "remarks": "   ",
            },
            "INVALID_REMARKS",
        ),
    ],
)
def test_verification_update_rejects_malformed_fields(
    client, app, farmer_data, payload, error_code
):
    """Invalid PATCH fields must not modify verification records."""
    from flask_jwt_extended import create_access_token
    from app.models import FarmerVerification

    with app.app_context():
        token = create_access_token(
            identity=str(farmer_data["user_id"])
        )

    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/farmer-verifications",
        json=verification_payload({"farm_location": "Nakuru County"}, headers),
        headers=headers,
    )

    assert created.status_code == 201, created.get_json()
    verification_id = created.get_json()["data"]["verification_id"]

    response = client.patch(
        f"/api/farmer-verifications/{verification_id}",
        json=inspection_payload(payload, headers, f"/api/farmer-verifications/{verification_id}"),
        headers=headers,
    )

    assert response.status_code == 400, response.get_json()
    assert response.get_json()["error"]["code"] == error_code

    with app.app_context():
        db.session.expire_all()

        verification = db.session.get(
            FarmerVerification,
            verification_id,
        )

        assert verification.status == "pending"
        assert verification.recommendation is None
        assert verification.reviewed_by_admin_id is None
