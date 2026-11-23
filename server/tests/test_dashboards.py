from decimal import Decimal

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models import (
    Admin,
    BuyerProfile,
    BuyerRequest,
    Category,
    FarmerProfile,
    Order,
    Payment,
    Product,
    Role,
    User,
)


@pytest.fixture
def client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret",
        "JWT_SECRET_KEY": "test-jwt-secret-that-is-at-least-32-bytes",
    })

    with app.app_context():
        db.create_all()

        with app.test_client() as test_client:
            yield test_client

        db.session.remove()
        db.drop_all()


def create_user(role_name, email):
    role = Role.query.filter_by(role_name=role_name).first()

    if role is None:
        role = Role(role_name=role_name)
        db.session.add(role)
        db.session.flush()

    user = User(
        full_name=f"Test {role_name.title()}",
        email=email,
        password_hash="test-password-hash",
        role_id=role.role_id,
    )

    db.session.add(user)
    db.session.flush()

    return user


def auth_headers(user):
    token = create_access_token(identity=str(user.user_id))

    return {
        "Authorization": f"Bearer {token}"
    }


def create_farmer(email="farmer@example.com"):
    user = create_user("farmer", email)

    farmer = FarmerProfile(verification_status="approved",
        user_id=user.user_id,
        farm_name="Green Farm",
        location="Nakuru",
        description="Test farm",
    )

    db.session.add(farmer)
    db.session.flush()

    return user, farmer


def create_buyer(email="buyer@example.com"):
    user = create_user("buyer", email)

    buyer = BuyerProfile(
        user_id=user.user_id,
        business_name="Fresh Market",
        buyer_type="retailer",
        location="Nairobi",
    )

    db.session.add(buyer)
    db.session.flush()

    return user, buyer


def create_category():
    category = Category(
        category_name="Vegetables",
        description="Fresh vegetables",
    )

    db.session.add(category)
    db.session.flush()

    return category


def test_farmer_dashboard_returns_accurate_summaries(client):
    farmer_user, farmer = create_farmer()
    buyer_user, buyer = create_buyer()
    category = create_category()

    db.session.add_all([
        Product(
            farmer_id=farmer.farmer_id,
            category_id=category.category_id,
            product_name="Tomatoes",
            price=Decimal("100.00"),
            quantity_available=Decimal("50.000"),
            unit="kg",
            status="available",
        ),
        Product(
            farmer_id=farmer.farmer_id,
            category_id=category.category_id,
            product_name="Onions",
            price=Decimal("80.00"),
            quantity_available=Decimal("30.000"),
            unit="kg",
            status="inactive",
        ),
    ])

    order = Order(
        buyer_id=buyer.buyer_id,
        farmer_id=farmer.farmer_id,
        total_amount=Decimal("1000.00"),
        order_status="delivered",
    )

    db.session.add(order)
    db.session.flush()

    db.session.add_all([
        Payment(
            order_id=order.order_id,
            payment_method="M-Pesa",
            transaction_reference="PAY-001",
            amount=Decimal("700.00"),
            payment_status="paid",
        ),
        Payment(
            order_id=order.order_id,
            payment_method="M-Pesa",
            transaction_reference="PAY-002",
            amount=Decimal("300.00"),
            payment_status="pending",
        ),
    ])

    db.session.commit()

    response = client.get(
        "/api/dashboards/farmer",
        headers=auth_headers(farmer_user),
    )

    assert response.status_code == 200

    data = response.json["data"]

    assert data["products"]["total"] == 2
    assert data["products"]["by_status"]["available"] == 1
    assert data["products"]["by_status"]["inactive"] == 1

    assert data["orders"]["total"] == 1
    assert data["orders"]["total_amount"] == 1000.0
    assert data["orders"]["by_status"]["delivered"] == 1

    assert data["payments"]["total"] == 2
    assert data["payments"]["total_amount"] == 1000.0
    assert data["payments"]["paid_amount"] == 700.0
    assert data["payments"]["by_status"]["paid"]["count"] == 1
    assert data["payments"]["by_status"]["pending"]["count"] == 1


def test_buyer_dashboard_returns_accurate_summaries(client):
    farmer_user, farmer = create_farmer()
    buyer_user, buyer = create_buyer()
    category = create_category()

    db.session.add_all([
        BuyerRequest(
            buyer_id=buyer.buyer_id,
            category_id=category.category_id,
            product_name="Fresh tomatoes",
            quantity=Decimal("40.000"),
            unit="kg",
            budget=Decimal("4000.00"),
            location="Nairobi",
            status="open",
        ),
        BuyerRequest(
            buyer_id=buyer.buyer_id,
            category_id=category.category_id,
            product_name="Fresh onions",
            quantity=Decimal("20.000"),
            unit="kg",
            budget=Decimal("2000.00"),
            location="Nairobi",
            status="fulfilled",
        ),
    ])

    order = Order(
        buyer_id=buyer.buyer_id,
        farmer_id=farmer.farmer_id,
        total_amount=Decimal("1500.00"),
        order_status="completed",
    )

    db.session.add(order)
    db.session.flush()

    db.session.add(
        Payment(
            order_id=order.order_id,
            payment_method="M-Pesa",
            transaction_reference="BUYER-PAY-001",
            amount=Decimal("1500.00"),
            payment_status="paid",
        )
    )

    db.session.commit()

    response = client.get(
        "/api/dashboards/buyer",
        headers=auth_headers(buyer_user),
    )

    assert response.status_code == 200

    data = response.json["data"]


    assert data["orders"]["total"] == 1
    assert data["orders"]["total_amount"] == 1500.0
    assert data["orders"]["by_status"]["completed"] == 1

    assert data["payments"]["total"] == 1
    assert data["payments"]["total_amount"] == 1500.0
    assert data["payments"]["paid_amount"] == 1500.0


def test_admin_dashboard_returns_platform_summaries(client):
    farmer_user, farmer = create_farmer()
    buyer_user, buyer = create_buyer()
    admin_user = create_user("admin", "admin@example.com")

    db.session.add(Admin(user_id=admin_user.user_id))

    category = create_category()

    db.session.add(
        Product(
            farmer_id=farmer.farmer_id,
            category_id=category.category_id,
            product_name="Potatoes",
            price=Decimal("60.00"),
            quantity_available=Decimal("100.000"),
            unit="kg",
            status="available",
        )
    )

    db.session.add(
        BuyerRequest(
            buyer_id=buyer.buyer_id,
            category_id=category.category_id,
            product_name="Maize",
            quantity=Decimal("50.000"),
            unit="kg",
            location="Nairobi",
            status="open",
        )
    )

    order = Order(
        buyer_id=buyer.buyer_id,
        farmer_id=farmer.farmer_id,
        total_amount=Decimal("3000.00"),
        order_status="confirmed",
    )

    db.session.add(order)
    db.session.flush()

    db.session.add(
        Payment(
            order_id=order.order_id,
            payment_method="M-Pesa",
            transaction_reference="ADMIN-PAY-001",
            amount=Decimal("3000.00"),
            payment_status="paid",
        )
    )

    db.session.commit()

    response = client.get(
        "/api/dashboards/admin",
        headers=auth_headers(admin_user),
    )

    assert response.status_code == 200

    data = response.json["data"]

    assert data["users"]["total"] == 3
    assert data["farmers"]["total"] == 1
    assert data["buyers"]["total"] == 1

    assert data["products"]["total"] == 1

    assert data["orders"]["total"] == 1
    assert data["orders"]["total_amount"] == 3000.0
    assert data["orders"]["by_status"]["confirmed"] == 1

    assert data["payments"]["total"] == 1
    assert data["payments"]["paid_amount"] == 3000.0

def test_suspended_admin_cannot_access_admin_dashboard(client):
    admin_user = create_user("admin", "suspended@example.com")

    suspended_admin = Admin(
        user_id=admin_user.user_id,
        status="suspended",
    )

    db.session.add(suspended_admin)
    db.session.commit()

    response = client.get(
        "/api/dashboards/admin",
        headers=auth_headers(admin_user),
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "ADMIN_ACCESS_DENIED"


def test_dashboard_endpoints_require_authentication(client):
    endpoints = [
        "/api/dashboards/farmer",
        "/api/dashboards/buyer",
        "/api/dashboards/admin",
    ]

    for endpoint in endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401


def test_dashboard_rejects_wrong_role(client):
    buyer_user, buyer = create_buyer()

    response = client.get(
        "/api/dashboards/farmer",
        headers=auth_headers(buyer_user),
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FARMER_PROFILE_REQUIRED"


def test_farmer_dashboard_returns_zero_for_empty_data(client):
    farmer_user, farmer = create_farmer()

    response = client.get(
        "/api/dashboards/farmer",
        headers=auth_headers(farmer_user),
    )

    assert response.status_code == 200

    data = response.json["data"]

    assert data["products"]["total"] == 0
    assert data["orders"]["total"] == 0
    assert data["orders"]["total_amount"] == 0.0
    assert data["payments"]["total"] == 0
    assert data["payments"]["total_amount"] == 0.0

    assert data["products"]["by_status"]["available"] == 0
    assert data["orders"]["by_status"]["pending"] == 0
    assert data["payments"]["by_status"]["paid"]["count"] == 0