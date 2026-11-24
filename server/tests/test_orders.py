"""Orders API integration tests using isolated Neon PostgreSQL."""

import os
import uuid
from decimal import Decimal

import pytest
from dotenv import load_dotenv
from flask_jwt_extended import create_access_token
from sqlalchemy import delete

from app import create_app
from app.extensions import db
from app.models import (
    Role, User, BuyerProfile, FarmerProfile,
    Category, Product, Order, OrderItem,
)


EXPECTED_TEST_HOST = (
    "ep-nameless-surf-bajq6gi8."
    "c-8.eu-central-1.aws.neon.tech"
)


@pytest.fixture
def app():
    from tests.database import isolated_app
    with isolated_app() as test_app:
        yield test_app

@pytest.fixture
def test_data(app):
    suffix = uuid.uuid4().hex
    created_user_ids = []
    category_id = None

    with app.app_context():
        buyer_role = Role.query.filter_by(role_name="buyer").one()
        farmer_role = Role.query.filter_by(role_name="farmer").one()

        try:
            buyer = User(
                full_name="Orders Pytest Buyer",
                email=f"orders-buyer-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=buyer_role.role_id,
            )
            other_buyer = User(
                full_name="Orders Pytest Other Buyer",
                email=f"orders-other-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=buyer_role.role_id,
            )
            farmer = User(
                full_name="Orders Pytest Farmer",
                email=f"orders-farmer-{suffix}@example.com",
                password_hash="integration-test-only",
                role_id=farmer_role.role_id,
            )

            db.session.add_all([buyer, other_buyer, farmer])
            db.session.flush()

            created_user_ids = [
                buyer.user_id,
                other_buyer.user_id,
                farmer.user_id,
            ]

            buyer_profile = BuyerProfile(
                user_id=buyer.user_id,
                buyer_type="retailer",
                location="Nairobi",
            )
            other_profile = BuyerProfile(
                user_id=other_buyer.user_id,
                buyer_type="retailer",
                location="Nairobi",
            )
            farmer_profile = FarmerProfile(
                user_id=farmer.user_id,
                farm_name="Orders Pytest Farm",
                location="Nakuru",
                verification_status="approved",
            )

            category = Category(
                category_name=f"Orders Pytest {suffix}",
            )

            db.session.add_all([
                buyer_profile, other_profile,
                farmer_profile, category,
            ])
            db.session.flush()

            category_id = category.category_id

            product = Product(
                farmer_id=farmer_profile.farmer_id,
                category_id=category_id,
                product_name="Orders Pytest Tomatoes",
                price=Decimal("85.00"),
                quantity_available=Decimal("100.000"),
                unit="kg",
                status="available",
            )

            db.session.add(product)
            db.session.flush()

            ids = {
                "buyer_user_id": buyer.user_id,
                "other_user_id": other_buyer.user_id,
                "farmer_user_id": farmer.user_id,
                "buyer_id": buyer_profile.buyer_id,
                "farmer_id": farmer_profile.farmer_id,
                "product_id": product.product_id,
            }

            db.session.commit()

        except Exception:
            db.session.rollback()
            raise

        try:
            yield ids
        finally:
            db.session.rollback()

            # Remove only records belonging to this fixture.
            orders = db.session.query(Order.order_id).filter(
                Order.buyer_id == ids["buyer_id"]
            )

            db.session.execute(
                delete(OrderItem).where(
                    OrderItem.order_id.in_(orders)
                )
            )

            db.session.execute(
                delete(Order).where(
                    Order.buyer_id == ids["buyer_id"]
                )
            )

            db.session.execute(
                delete(Product).where(
                    Product.product_id == ids["product_id"]
                )
            )

            db.session.execute(
                delete(Category).where(
                    Category.category_id == category_id
                )
            )

            db.session.execute(
                delete(BuyerProfile).where(
                    BuyerProfile.user_id.in_(created_user_ids)
                )
            )

            db.session.execute(
                delete(FarmerProfile).where(
                    FarmerProfile.user_id.in_(created_user_ids)
                )
            )

            db.session.execute(
                delete(User).where(
                    User.user_id.in_(created_user_ids)
                )
            )

            db.session.commit()


@pytest.fixture
def client(app):
    return app.test_client()


def authorization(app, user_id):
    with app.app_context():
        token = create_access_token(identity=str(user_id))
    return {"Authorization": f"Bearer {token}"}


def test_orders_require_authentication(client):
    response = client.get("/api/orders")
    assert response.status_code == 401


def test_new_buyer_has_no_orders(client, app, test_data):
    headers = authorization(app, test_data["buyer_user_id"])

    response = client.get("/api/orders", headers=headers)

    assert response.status_code == 200
    assert response.get_json()["data"] == []
    assert response.get_json()["count"] == 0


def test_buyer_can_create_order(client, app, test_data):
    """Buyer creates an order with server-calculated pricing."""
    headers = authorization(app, test_data["buyer_user_id"])

    response = client.post(
        "/api/orders",
        json={
            "items": [
                {
                    "product_id": test_data["product_id"],
                    "quantity": "5.000",
                }
            ]
        },
        headers=headers,
    )

    assert response.status_code == 201, response.get_json()

    payload = response.get_json()["data"]

    assert payload["buyer_id"] == test_data["buyer_id"]
    assert payload["farmer_id"] == test_data["farmer_id"]
    assert Decimal(payload["total_amount"]) == Decimal("425.00")
    assert payload["order_status"] == "pending"
    assert len(payload["items"]) == 1

    with app.app_context():
        order = db.session.get(Order, payload["order_id"])
        product = db.session.get(Product, test_data["product_id"])

        assert order is not None
        assert len(order.items) == 1
        assert product.quantity_available == Decimal("95.000")


def test_order_creation_requires_authentication(client, test_data):
    response = client.post(
        "/api/orders",
        json={
            "items": [
                {
                    "product_id": test_data["product_id"],
                    "quantity": "1.000",
                }
            ]
        },
    )

    assert response.status_code == 401
