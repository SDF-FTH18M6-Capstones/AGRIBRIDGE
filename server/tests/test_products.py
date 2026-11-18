
import pytest

from app import create_app
from app.routes.products import products


@pytest.fixture
def client():
    """Create a fresh test client and reset mock products."""
    app = create_app({"TESTING": True})

    original_products = {
        key: value.copy()
        for key, value in products.items()
    }

    with app.test_client() as test_client:
        yield test_client

    products.clear()
    products.update(original_products)


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


def test_create_product(client):
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

    assert response.status_code == 201
    assert response.json["data"]["name"] == "Cabbages"

    product_id = response.json["data"]["id"]

    get_response = client.get(f"/api/products/{product_id}")
    assert get_response.status_code == 200


def test_create_product_invalid_price(client):
    response = client.post(
        "/api/products",
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


def test_update_product(client):
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

    assert response.status_code == 200
    assert response.json["data"]["price"] == 120


def test_delete_product(client):
    response = client.delete("/api/products/1")

    assert response.status_code == 204
    assert response.data == b""

    get_response = client.get("/api/products/1")
    assert get_response.status_code == 404


def test_delete_missing_product(client):
    response = client.delete("/api/products/999999")

    assert response.status_code == 404
