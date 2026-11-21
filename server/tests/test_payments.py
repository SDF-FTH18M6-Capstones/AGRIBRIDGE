"""Payments API integration tests using Neon PostgreSQL."""

import os

import pytest
from dotenv import load_dotenv

from app import create_app
from app.extensions import db


EXPECTED_HOST = (
    "ep-nameless-surf-bajq6gi8."
    "c-8.eu-central-1.aws.neon.tech"
)


@pytest.fixture
def app():
    load_dotenv(".env")

    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.fail("TEST_DATABASE_URL is required")

    test_app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": url,
    })

    with test_app.app_context():
        assert db.engine.url.host == EXPECTED_HOST
        assert db.engine.url.database == "agribridge_db"

        yield test_app

        db.session.remove()


@pytest.fixture
def client(app):
    return app.test_client()


def test_payment_creation_requires_authentication(client):
    response = client.post(
        "/api/payments",
        json={
            "order_id": 1,
            "payment_method": "mpesa",
            "amount": "100.00",
        },
    )

    assert response.status_code == 401


def test_payment_retrieval_requires_authentication(client):
    response = client.get("/api/payments/1")

    assert response.status_code == 401


def test_payment_update_requires_authentication(client):
    response = client.patch(
        "/api/payments/1",
        json={"payment_status": "failed"},
    )

    assert response.status_code == 401


@pytest.fixture
def payment_data(app):
    """Create isolated payment test records in Neon PostgreSQL."""
    import uuid
    from decimal import Decimal
    from app.models import (
        Role, User, BuyerProfile, FarmerProfile,
        Order, Payment,
    )

    suffix = uuid.uuid4().hex

    with app.app_context():
        buyer_role = Role.query.filter_by(role_name="buyer").one()
        farmer_role = Role.query.filter_by(role_name="farmer").one()

        try:
            buyer_user = User(
                full_name="Payments Pytest Buyer",
                email=f"payments-buyer-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=buyer_role.role_id,
            )

            other_user = User(
                full_name="Payments Pytest Other Buyer",
                email=f"payments-other-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=buyer_role.role_id,
            )

            farmer_user = User(
                full_name="Payments Pytest Farmer",
                email=f"payments-farmer-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=farmer_role.role_id,
            )

            db.session.add_all([
                buyer_user, other_user, farmer_user,
            ])
            db.session.flush()

            buyer = BuyerProfile(
                user_id=buyer_user.user_id,
                buyer_type="retailer",
                location="Nairobi",
            )

            other_buyer = BuyerProfile(
                user_id=other_user.user_id,
                buyer_type="retailer",
                location="Nairobi",
            )

            farmer = FarmerProfile(
                user_id=farmer_user.user_id,
                farm_name="Payments Pytest Farm",
                location="Nakuru",
                verification_status="approved",
            )

            db.session.add_all([buyer, other_buyer, farmer])
            db.session.flush()

            order = Order(
                buyer_id=buyer.buyer_id,
                farmer_id=farmer.farmer_id,
                total_amount=Decimal("500.00"),
                order_status="pending",
            )

            db.session.add(order)
            db.session.flush()

            ids = {
                "buyer_user_id": buyer_user.user_id,
                "other_user_id": other_user.user_id,
                "farmer_user_id": farmer_user.user_id,
                "order_id": order.order_id,
                "buyer_id": buyer.buyer_id,
                "farmer_id": farmer.farmer_id,
                "user_ids": [
                    buyer_user.user_id,
                    other_user.user_id,
                    farmer_user.user_id,
                ],
            }

            db.session.commit()

        except Exception:
            db.session.rollback()
            raise

        try:
            yield ids
        finally:
            from sqlalchemy import delete

            db.session.rollback()

            db.session.execute(
                delete(Payment).where(
                    Payment.order_id == ids["order_id"]
                )
            )

            db.session.execute(
                delete(Order).where(
                    Order.order_id == ids["order_id"]
                )
            )

            db.session.execute(
                delete(BuyerProfile).where(
                    BuyerProfile.user_id.in_(ids["user_ids"])
                )
            )

            db.session.execute(
                delete(FarmerProfile).where(
                    FarmerProfile.user_id.in_(ids["user_ids"])
                )
            )

            db.session.execute(
                delete(User).where(
                    User.user_id.in_(ids["user_ids"])
                )
            )

            db.session.commit()


def test_buyer_creates_pending_payment(client, app, payment_data):
    """Verify payment creation and PostgreSQL persistence."""
    from decimal import Decimal
    from flask_jwt_extended import create_access_token
    from app.models import Payment

    with app.app_context():
        token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )

    response = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={
            "Authorization": f"Bearer {token}"
        },
    )

    assert response.status_code == 201, response.get_json()

    payload = response.get_json()["data"]

    assert payload["order_id"] == payment_data["order_id"]
    assert payload["payment_status"] == "pending"
    assert Decimal(payload["amount"]) == Decimal("500.00")
    assert payload["paid_at"] is None

    with app.app_context():
        db.session.expire_all()

        payment = db.session.get(
            Payment,
            payload["payment_id"],
        )

        assert payment is not None
        assert payment.payment_status == "pending"
        assert payment.amount == Decimal("500.00")


def test_duplicate_pending_payment_is_rejected(
    client, app, payment_data
):
    """An order cannot have two active pending payments."""
    from flask_jwt_extended import create_access_token
    from sqlalchemy import select, func
    from app.models import Payment

    with app.app_context():
        token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )

    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "order_id": payment_data["order_id"],
        "payment_method": "mpesa",
        "amount": "500.00",
    }

    first = client.post(
        "/api/payments",
        json=payload,
        headers=headers,
    )

    assert first.status_code == 201, first.get_json()

    second = client.post(
        "/api/payments",
        json=payload,
        headers=headers,
    )

    assert second.status_code == 409
    assert (
        second.get_json()["error"]["code"]
        == "PAYMENT_ALREADY_EXISTS"
    )

    with app.app_context():
        count = db.session.scalar(
            select(func.count())
            .select_from(Payment)
            .where(Payment.order_id == payment_data["order_id"])
        )

        assert count == 1


def test_other_buyer_cannot_create_payment(
    client, app, payment_data
):
    """A buyer cannot pay against another buyer's order."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(
            identity=str(payment_data["other_user_id"])
        )

    response = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "ORDER_NOT_FOUND"


def test_other_buyer_cannot_retrieve_payment(
    client, app, payment_data
):
    """An unrelated buyer cannot retrieve another buyer's payment."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        owner_token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )

        other_token = create_access_token(
            identity=str(payment_data["other_user_id"])
        )

    created = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert created.status_code == 201, created.get_json()

    payment_id = created.get_json()["data"]["payment_id"]

    response = client.get(
        f"/api/payments/{payment_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "PAYMENT_NOT_FOUND"


@pytest.mark.parametrize(
    "new_status,expected_code",
    [
        ("failed", "FORBIDDEN"),
        ("paid", "VERIFICATION_REQUIRED"),
    ],
)
def test_buyer_cannot_update_payment_status(
    client, app, payment_data, new_status, expected_code
):
    """Buyers cannot manually change payment status."""
    from flask_jwt_extended import create_access_token
    from app.models import Payment

    with app.app_context():
        token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )

    created = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert created.status_code == 201, created.get_json()

    payment_id = created.get_json()["data"]["payment_id"]

    response = client.patch(
        f"/api/payments/{payment_id}",
        json={"payment_status": new_status},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == expected_code

    with app.app_context():
        db.session.expire_all()
        payment = db.session.get(Payment, payment_id)

        assert payment.payment_status == "pending"
        assert payment.paid_at is None


@pytest.fixture
def admin_data(app):
    """Create a temporary administrator for payment tests."""
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
            full_name="Payments Pytest Administrator",
            email=f"payments-admin-{uuid.uuid4().hex}@example.com",
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
            yield {"user_id": user_id}

        finally:
            from sqlalchemy import delete

            db.session.rollback()

            db.session.execute(
                delete(Admin).where(Admin.user_id == user_id)
            )

            db.session.execute(
                delete(User).where(User.user_id == user_id)
            )

            if created_role_id is not None:
                db.session.execute(
                    delete(Role).where(Role.role_id == created_role_id)
                )

            db.session.commit()


def test_active_admin_can_mark_payment_failed(
    client, app, payment_data, admin_data
):
    """An active administrator can mark a pending payment failed."""
    from flask_jwt_extended import create_access_token
    from app.models import Payment

    with app.app_context():
        buyer_token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )
        admin_token = create_access_token(
            identity=str(admin_data["user_id"])
        )

    created = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )

    assert created.status_code == 201, created.get_json()
    payment_id = created.get_json()["data"]["payment_id"]

    response = client.patch(
        f"/api/payments/{payment_id}",
        json={"payment_status": "failed"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200, response.get_json()

    with app.app_context():
        db.session.expire_all()
        payment = db.session.get(Payment, payment_id)

        assert payment.payment_status == "failed"
        assert payment.paid_at is None


def test_suspended_admin_cannot_update_payment(
    client, app, payment_data, admin_data
):
    """Suspended administrators cannot update payment status."""
    from flask_jwt_extended import create_access_token
    from app.models import User, Payment

    with app.app_context():
        buyer_token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )

    created = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )

    assert created.status_code == 201, created.get_json()
    payment_id = created.get_json()["data"]["payment_id"]

    with app.app_context():
        user = db.session.get(User, admin_data["user_id"])
        user.admin_profile.status = "suspended"
        db.session.commit()

        admin_token = create_access_token(
            identity=str(admin_data["user_id"])
        )

    response = client.patch(
        f"/api/payments/{payment_id}",
        json={"payment_status": "failed"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "FORBIDDEN"

    with app.app_context():
        db.session.expire_all()
        payment = db.session.get(Payment, payment_id)

        assert payment.payment_status == "pending"


def test_admin_cannot_repeat_failed_update(
    client, app, payment_data, admin_data
):
    """Repeated status updates must not be accepted."""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        buyer_token = create_access_token(
            identity=str(payment_data["buyer_user_id"])
        )
        admin_token = create_access_token(
            identity=str(admin_data["user_id"])
        )

    created = client.post(
        "/api/payments",
        json={
            "order_id": payment_data["order_id"],
            "payment_method": "mpesa",
            "amount": "500.00",
        },
        headers={"Authorization": f"Bearer {buyer_token}"},
    )

    assert created.status_code == 201, created.get_json()
    payment_id = created.get_json()["data"]["payment_id"]

    headers = {"Authorization": f"Bearer {admin_token}"}

    first = client.patch(
        f"/api/payments/{payment_id}",
        json={"payment_status": "failed"},
        headers=headers,
    )

    assert first.status_code == 200

    second = client.patch(
        f"/api/payments/{payment_id}",
        json={"payment_status": "failed"},
        headers=headers,
    )

    assert second.status_code == 409
    assert (
        second.get_json()["error"]["code"]
        == "INVALID_STATUS_TRANSITION"
    )
