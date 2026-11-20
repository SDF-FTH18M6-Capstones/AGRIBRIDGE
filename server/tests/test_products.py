import os
import pytest

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4
from dotenv import load_dotenv
from sqlalchemy.engine import make_url
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db
from app.models import Role, User, FarmerProfile, Category, Product


load_dotenv(".env")


@pytest.fixture
def app():
    database_url = os.getenv("PRODUCT_TEST_DATABASE_URL")

    if not database_url:
        pytest.fail("PRODUCT_TEST_DATABASE_URL is missing")

    if make_url(database_url).database != "product-testing":
        pytest.fail("Unsafe database: expected product-testing")

    test_app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": database_url
    })

    with test_app.app_context():
        yield test_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def sample_products(app):
    with app.app_context():
        marker = uuid4().hex[:8]

        role = Role(
            role_name=f"farmer_test_{marker}",
            description="Temporary CRUD test role"
        )
        db.session.add(role)
        db.session.flush()

        user1 = User(
            full_name="CRUD Farmer One",
            email=f"crud_farmer1_{marker}@example.com",
            password_hash="test-password-hash",
            role_id=role.role_id
        )

        user2 = User(
            full_name="CRUD Farmer Two",
            email=f"crud_farmer2_{marker}@example.com",
            password_hash="test-password-hash",
            role_id=role.role_id
        )

        db.session.add_all([user1, user2])
        db.session.flush()

        farmer1 = FarmerProfile(
            user_id=user1.user_id,
            farm_name=f"CRUD Farm One {marker}",
            location="Kiambu County"
        )

        farmer2 = FarmerProfile(
            user_id=user2.user_id,
            farm_name=f"CRUD Farm Two {marker}",
            location="Nakuru County"
        )

        db.session.add_all([farmer1, farmer2])
        db.session.flush()

        category = Category(
            category_name=f"CRUD Vegetables {marker}"
        )

        db.session.add(category)
        db.session.flush()

        product1 = Product(
            farmer_id=farmer1.farmer_id,
            category_id=category.category_id,
            product_name=f"CRUD Tomatoes {marker}",
            description="Temporary CRUD test product",
            price=Decimal("120.00"),
            quantity_available=Decimal("50.000"),
            unit="kg",
            quality="Premium",
            status="available"
        )

        product2 = Product(
            farmer_id=farmer2.farmer_id,
            category_id=category.category_id,
            product_name=f"CRUD Potatoes {marker}",
            description="Temporary CRUD test product",
            price=Decimal("80.00"),
            quantity_available=Decimal("100.000"),
            unit="kg",
            quality="Standard",
            status="available"
        )

        db.session.add_all([product1, product2])
        db.session.commit()

        test_data = {
            "marker": marker,
            "user1_id": user1.user_id,
            "user2_id": user2.user_id,
            "farmer1_id": farmer1.farmer_id,
            "farmer2_id": farmer2.farmer_id,
            "category_id": category.category_id,
            "product1_id": product1.product_id,
            "product2_id": product2.product_id
        }

        yield test_data

        
        Product.query.filter(
            Product.product_name.like(f"%{marker}%")
        ).delete(synchronize_session=False)

        FarmerProfile.query.filter(
            FarmerProfile.farmer_id.in_([
                farmer1.farmer_id,
                farmer2.farmer_id
            ])
        ).delete(synchronize_session=False)

        db.session.delete(user1)
        db.session.delete(user2)
        db.session.delete(category)
        db.session.delete(role)

        db.session.commit()


@pytest.fixture
def auth_headers(client, sample_products):
    with client.application.app_context():
        token = create_access_token(
            identity=str(sample_products["user1_id"])
        )

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_user_headers(client, sample_products):
    with client.application.app_context():
        token = create_access_token(
            identity=str(sample_products["user2_id"])
        )

    return {"Authorization": f"Bearer {token}"}


def test_get_all_products(client, sample_products):
    response = client.get("/api/products")

    assert response.status_code == 200
    assert "data" in response.json

    returned_ids = [
        product["product_id"]
        for product in response.json["data"]
    ]

    assert sample_products["product1_id"] in returned_ids
    assert sample_products["product2_id"] in returned_ids


def test_get_existing_product(client, sample_products):
    product_id = sample_products["product1_id"]

    response = client.get(f"/api/products/{product_id}")

    assert response.status_code == 200
    assert response.json["data"]["product_id"] == product_id


def test_get_missing_product(client):
    response = client.get("/api/products/999999999")

    assert response.status_code == 404
    assert response.json["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_public_products_accessible_without_token(client):
    response = client.get("/api/products")

    assert response.status_code == 200


def test_create_product(client, auth_headers, sample_products):
    marker = sample_products["marker"]

    response = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Cabbages {marker}",
            "description": "Fresh green cabbages",
            "price": "60.00",
            "quantity_available": "40.000",
            "unit": "kg",
            "quality": "Premium",
            "status": "available"
        },
    )

    assert response.status_code == 201
    assert response.json["data"]["product_name"] == f"Cabbages {marker}"

    product_id = response.json["data"]["product_id"]

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 200


def test_create_product_invalid_price(
    client, auth_headers, sample_products
):
    marker = sample_products["marker"]

    response = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Tomatoes {marker}",
            "description": "Fresh tomatoes",
            "price": "-10.00",
            "quantity_available": "20.000",
            "unit": "kg",
            "quality": "Standard",
            "status": "available"
        },
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_created_product_belongs_to_authenticated_user(
    client, auth_headers, sample_products
):
    marker = sample_products["marker"]

    response = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Carrots {marker}",
            "description": "Fresh carrots",
            "price": "80.00",
            "quantity_available": "25.000",
            "unit": "kg",
            "quality": "Premium",
            "status": "available"
        },
    )

    assert response.status_code == 201

    assert (
        response.json["data"]["farmer_id"]
        == sample_products["farmer1_id"]
    )

def test_update_product(client, auth_headers, sample_products):
    product_id = sample_products["product1_id"]
    marker = sample_products["marker"]

    response = client.put(
        f"/api/products/{product_id}",
        headers=auth_headers,
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Fresh Tomatoes {marker}",
            "description": "Updated tomato description",
            "price": "150.00",
            "quantity_available": "30.000",
            "unit": "kg",
            "quality": "Premium",
            "status": "available"
        },
    )

    assert response.status_code == 200
    assert response.json["data"]["product_name"] == f"Fresh Tomatoes {marker}"
    assert response.json["data"]["price"] == "150.00"
    assert response.json["data"]["farmer_id"] == sample_products["farmer1_id"]


def test_cannot_update_another_users_product(
    client, auth_headers, sample_products
):
    product_id = sample_products["product2_id"]
    marker = sample_products["marker"]

    response = client.put(
        f"/api/products/{product_id}",
        headers=auth_headers,
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Fresh Potatoes {marker}",
            "description": "Attempted unauthorized update",
            "price": "90.00",
            "quantity_available": "50.000",
            "unit": "kg",
            "quality": "Standard",
            "status": "available"
        },
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 200
    assert get_response.json["data"]["farmer_id"] == sample_products["farmer2_id"]


def test_product_owner_two_can_update_own_product(
    client, other_user_headers, sample_products
):
    product_id = sample_products["product2_id"]
    marker = sample_products["marker"]

    response = client.put(
        f"/api/products/{product_id}",
        headers=other_user_headers,
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Fresh Potatoes {marker}",
            "description": "Updated potato description",
            "price": "90.00",
            "quantity_available": "50.000",
            "unit": "kg",
            "quality": "Standard",
            "status": "available"
        },
    )

    assert response.status_code == 200
    assert response.json["data"]["product_name"] == f"Fresh Potatoes {marker}"
    assert response.json["data"]["farmer_id"] == sample_products["farmer2_id"]


def test_update_product_without_token(client, sample_products):
    product_id = sample_products["product1_id"]

    response = client.put(
        f"/api/products/{product_id}",
        json={
            "category_id": sample_products["category_id"],
            "product_name": "Unauthorized Update",
            "description": "This update should not succeed",
            "price": "120.00",
            "quantity_available": "30.000",
            "unit": "kg",
            "quality": "Premium",
            "status": "available"
        },
    )

    assert response.status_code == 401

def test_delete_product(client, auth_headers, sample_products):
    product_id = sample_products["product1_id"]

    response = client.delete(
        f"/api/products/{product_id}",
        headers=auth_headers,
    )

    assert response.status_code == 204
    assert response.data == b""

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 404
    assert get_response.json["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_delete_missing_product(client, auth_headers):
    response = client.delete(
        "/api/products/999999999",
        headers=auth_headers,
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_cannot_delete_another_users_product(
    client, auth_headers, sample_products
):
    product_id = sample_products["product2_id"]

    response = client.delete(
        f"/api/products/{product_id}",
        headers=auth_headers,
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 200
    assert get_response.json["data"]["farmer_id"] == sample_products["farmer2_id"]


def test_product_owner_two_can_delete_own_product(
    client, other_user_headers, sample_products
):
    product_id = sample_products["product2_id"]

    response = client.delete(
        f"/api/products/{product_id}",
        headers=other_user_headers,
    )

    assert response.status_code == 204

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 404


def test_delete_product_without_token(client, sample_products):
    product_id = sample_products["product1_id"]

    response = client.delete(f"/api/products/{product_id}")

    assert response.status_code == 401

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 200


def test_create_product_with_invalid_token(client, sample_products):
    marker = sample_products["marker"]

    response = client.post(
        "/api/products",
        headers={
            "Authorization": "Bearer invalid.jwt.token"
        },
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Cabbages Invalid Token {marker}",
            "description": "Invalid token test",
            "price": "60.00",
            "quantity_available": "40.000",
            "unit": "kg",
            "quality": "Premium",
            "status": "available"
        },
    )

    assert response.status_code in (401, 422)


def test_create_product_with_expired_token(client, sample_products):
    marker = sample_products["marker"]

    with client.application.app_context():
        token = create_access_token(
            identity=str(sample_products["user1_id"]),
            expires_delta=timedelta(seconds=-1),
        )

    response = client.post(
        "/api/products",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "category_id": sample_products["category_id"],
            "product_name": f"Cabbages Expired Token {marker}",
            "description": "Expired token test",
            "price": "60.00",
            "quantity_available": "40.000",
            "unit": "kg",
            "quality": "Premium",
            "status": "available"
        },
    )

    assert response.status_code == 401