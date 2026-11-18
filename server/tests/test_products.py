
import pytest

from datetime import timedelta
from flask_jwt_extended import create_access_token

from app import create_app
from app.routes.products import products


@pytest.fixture
def client():
    app = create_app({"TESTING": True})

    original_products = {
        key: value.copy()
        for key, value in products.items()
    }

    with app.test_client() as test_client:
        yield test_client

    products.clear()
    products.update(original_products)


@pytest.fixture
def auth_headers(client):
    with client.application.app_context():
        token = create_access_token(identity="1")

    return {
        "Authorization": f"Bearer {token}"
    }


@pytest.fixture
def other_user_headers(client):
    with client.application.app_context():
        token = create_access_token(identity="2")

    return {
        "Authorization": f"Bearer {token}"
    }


def test_get_all_products(client):
    response = client.get("/api/products")

    assert response.status_code == 200
    assert "data" in response.json


def test_get_existing_product(client):
    response = client.get("/api/products/1")

    assert response.status_code == 200
    assert response.json["data"]["id"] == 1


def test_get_missing_product(client):
    response = client.get("/api/products/999999")

    assert response.status_code == 404
    assert response.json["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_public_products_accessible_without_token(client):
    response = client.get("/api/products")

    assert response.status_code == 200


def test_create_product(client, auth_headers):
    response = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "name": "Cabbages",
            "category": "Vegetables",
            "price": 60,
            "quantity": 40,
            "unit": "pieces",
        },
    )

    assert response.status_code == 201
    assert response.json["data"]["name"] == "Cabbages"

    product_id = response.json["data"]["id"]

    get_response = client.get(f"/api/products/{product_id}")

    assert get_response.status_code == 200


def test_create_product_invalid_price(client, auth_headers):
    response = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "name": "Tomatoes",
            "category": "Vegetables",
            "price": -10,
            "quantity": 20,
            "unit": "kg",
        },
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_product_without_token(client):
    response = client.post(
        "/api/products",
        json={
            "name": "Cabbages",
            "category": "Vegetables",
            "price": 60,
            "quantity": 40,
            "unit": "pieces",
        },
    )

    assert response.status_code == 401


def test_created_product_belongs_to_authenticated_user(
    client, auth_headers
):
    response = client.post(
        "/api/products",
        headers=auth_headers,
        json={
            "name": "Carrots",
            "category": "Vegetables",
            "price": 80,
            "quantity": 25,
            "unit": "kg",
        },
    )

    assert response.status_code == 201

    product_id = response.json["data"]["id"]

    assert products[product_id]["owner_id"] == "1"


def test_update_product(client, auth_headers):
    response = client.put(
        "/api/products/1",
        headers=auth_headers,
        json={
            "name": "Fresh Tomatoes",
            "category": "Vegetables",
            "price": 120,
            "quantity": 30,
            "unit": "kg",
        },
    )

    assert response.status_code == 200
    assert response.json["data"]["price"] == 120
    assert products[1]["owner_id"] == "1"


def test_cannot_update_another_users_product(
    client, auth_headers
):
    response = client.put(
        "/api/products/2",
        headers=auth_headers,
        json={
            "name": "Fresh Potatoes",
            "category": "Vegetables",
            "price": 90,
            "quantity": 50,
            "unit": "kg",
        },
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"

    get_response = client.get("/api/products/2")

    assert get_response.status_code == 200
    assert get_response.json["data"]["name"] == "Potatoes"


def test_product_owner_two_can_update_own_product(
    client, other_user_headers
):
    response = client.put(
        "/api/products/2",
        headers=other_user_headers,
        json={
            "name": "Fresh Potatoes",
            "category": "Vegetables",
            "price": 90,
            "quantity": 50,
            "unit": "kg",
        },
    )

    assert response.status_code == 200
    assert response.json["data"]["name"] == "Fresh Potatoes"
    assert products[2]["owner_id"] == "2"


def test_update_product_without_token(client):
    response = client.put(
        "/api/products/1",
        json={
            "name": "Fresh Tomatoes",
            "category": "Vegetables",
            "price": 120,
            "quantity": 30,
            "unit": "kg",
        },
    )

    assert response.status_code == 401


def test_delete_product(client, auth_headers):
    response = client.delete(
        "/api/products/1",
        headers=auth_headers,
    )

    assert response.status_code == 204
    assert response.data == b""

    get_response = client.get("/api/products/1")

    assert get_response.status_code == 404


def test_delete_missing_product(client, auth_headers):
    response = client.delete(
        "/api/products/999999",
        headers=auth_headers,
    )

    assert response.status_code == 404


def test_cannot_delete_another_users_product(
    client, auth_headers
):
    response = client.delete(
        "/api/products/2",
        headers=auth_headers,
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"

    assert 2 in products


def test_product_owner_two_can_delete_own_product(
    client, other_user_headers
):
    response = client.delete(
        "/api/products/2",
        headers=other_user_headers,
    )

    assert response.status_code == 204
    assert 2 not in products


def test_delete_product_without_token(client):
    response = client.delete("/api/products/1")

    assert response.status_code == 401
    assert 1 in products


def test_create_product_with_invalid_token(client):
    response = client.post(
        "/api/products",
        headers={
            "Authorization": "Bearer invalid.jwt.token"
        },
        json={
            "name": "Cabbages",
            "category": "Vegetables",
            "price": 60,
            "quantity": 40,
            "unit": "pieces",
        },
    )

    assert response.status_code in (401, 422)


def test_create_product_with_expired_token(client):
    with client.application.app_context():
        token = create_access_token(
            identity="1",
            expires_delta=timedelta(seconds=-1),
        )

    response = client.post(
        "/api/products",
        headers={
            "Authorization": f"Bearer {token}"
        },
        json={
            "name": "Cabbages",
            "category": "Vegetables",
            "price": 60,
            "quantity": 40,
            "unit": "pieces",
        },
    )

    assert response.status_code == 401
