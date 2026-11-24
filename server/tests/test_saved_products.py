import os
from uuid import uuid4

import pytest
from dotenv import load_dotenv
from flask_jwt_extended import create_access_token
from sqlalchemy.engine import make_url

from app import create_app
from app.extensions import db
from app.models import (
    User,
    BuyerProfile,
    FarmerProfile,
    Category,
    Product,
    SavedProduct,
)


load_dotenv(".env")


@pytest.fixture
def app():
    from tests.database import isolated_app
    with isolated_app() as test_app:
        yield test_app

@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def saved_product_data(app):
    with app.app_context():
        marker = uuid4().hex[:8]

        buyer_user1 = User(
            full_name="Saved Product Buyer One",
            email=f"saved_buyer1_{marker}@example.com",
            password_hash="test-password-hash",
        )

        buyer_user2 = User(
            full_name="Saved Product Buyer Two",
            email=f"saved_buyer2_{marker}@example.com",
            password_hash="test-password-hash",
        )

        farmer_user = User(
            full_name="Saved Product Farmer",
            email=f"saved_farmer_{marker}@example.com",
            password_hash="test-password-hash",
        )

        db.session.add_all([
            buyer_user1,
            buyer_user2,
            farmer_user,
        ])
        db.session.flush()

        buyer1 = BuyerProfile(
            user_id=buyer_user1.user_id,
            buyer_type="individual",
            location="Nairobi County",
        )

        buyer2 = BuyerProfile(
            user_id=buyer_user2.user_id,
            buyer_type="individual",
            location="Kiambu County",
        )

        farmer = FarmerProfile(
            user_id=farmer_user.user_id,
            farm_name=f"Saved Product Farm {marker}",
            location="Nakuru County",
        )

        db.session.add_all([buyer1, buyer2, farmer])
        db.session.flush()

        category = Category(
            category_name=f"Saved Product Category {marker}",
        )

        db.session.add(category)
        db.session.flush()

        product1 = Product(
            farmer_id=farmer.farmer_id,
            category_id=category.category_id,
            product_name=f"Saved Tomatoes {marker}",
            description="Test product for saved products",
            price=120.00,
            quantity_available=50.000,
            unit="kg",
            quality="Premium",
            status="available",
        )

        product2 = Product(
            farmer_id=farmer.farmer_id,
            category_id=category.category_id,
            product_name=f"Saved Potatoes {marker}",
            description="Second test product",
            price=80.00,
            quantity_available=100.000,
            unit="kg",
            quality="Standard",
            status="available",
        )

        db.session.add_all([product1, product2])
        db.session.commit()

        test_data = {
            "buyer1_user_id": buyer_user1.user_id,
            "buyer2_user_id": buyer_user2.user_id,
            "farmer_user_id": farmer_user.user_id,
            "buyer1_id": buyer1.buyer_id,
            "buyer2_id": buyer2.buyer_id,
            "product1_id": product1.product_id,
            "product2_id": product2.product_id,
            "marker": marker,
        }

        yield test_data

        SavedProduct.query.filter(
            SavedProduct.buyer_id.in_([
                buyer1.buyer_id,
                buyer2.buyer_id,
            ])
        ).delete(synchronize_session=False)

        Product.query.filter(
            Product.product_id.in_([
                product1.product_id,
                product2.product_id,
            ])
        ).delete(synchronize_session=False)

        db.session.delete(buyer1)
        db.session.delete(buyer2)
        db.session.delete(farmer)
        db.session.delete(buyer_user1)
        db.session.delete(buyer_user2)
        db.session.delete(farmer_user)
        db.session.delete(category)

        db.session.commit()


@pytest.fixture
def buyer1_headers(client, saved_product_data):
    with client.application.app_context():
        token = create_access_token(
            identity=str(saved_product_data["buyer1_user_id"])
        )

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def buyer2_headers(client, saved_product_data):
    with client.application.app_context():
        token = create_access_token(
            identity=str(saved_product_data["buyer2_user_id"])
        )

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def farmer_headers(client, saved_product_data):
    with client.application.app_context():
        token = create_access_token(
            identity=str(saved_product_data["farmer_user_id"])
        )

    return {"Authorization": f"Bearer {token}"}


def test_save_product(client, buyer1_headers, saved_product_data):
    product_id = saved_product_data["product1_id"]

    response = client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": product_id},
    )

    assert response.status_code == 201
    assert response.json["data"]["product_id"] == product_id
    assert response.json["data"]["product"]["product_id"] == product_id


def test_save_missing_product(client, buyer1_headers):
    response = client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": 999999999},
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "PRODUCT_NOT_FOUND"


def test_save_duplicate_product(
    client,
    buyer1_headers,
    saved_product_data,
):
    product_id = saved_product_data["product1_id"]

    first_response = client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": product_id},
    )

    second_response = client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": product_id},
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 409
    assert (
        second_response.json["error"]["code"]
        == "PRODUCT_ALREADY_SAVED"
    )


def test_save_product_requires_authentication(
    client,
    saved_product_data,
):
    response = client.post(
        "/api/saved-products",
        json={"product_id": saved_product_data["product1_id"]},
    )

    assert response.status_code == 401


def test_non_buyer_cannot_save_product(
    client,
    farmer_headers,
    saved_product_data,
):
    response = client.post(
        "/api/saved-products",
        headers=farmer_headers,
        json={"product_id": saved_product_data["product1_id"]},
    )

    assert response.status_code == 403
    assert (
        response.json["error"]["code"]
        == "BUYER_PROFILE_NOT_FOUND"
    )


def test_get_saved_products(
    client,
    buyer1_headers,
    saved_product_data,
):
    product_id = saved_product_data["product1_id"]

    client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": product_id},
    )

    response = client.get(
        "/api/saved-products",
        headers=buyer1_headers,
    )

    assert response.status_code == 200

    returned_product_ids = [
        item["product_id"]
        for item in response.json["data"]
    ]

    assert product_id in returned_product_ids


def test_buyers_only_see_their_own_saved_products(
    client,
    buyer1_headers,
    buyer2_headers,
    saved_product_data,
):
    product1_id = saved_product_data["product1_id"]
    product2_id = saved_product_data["product2_id"]

    client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": product1_id},
    )

    client.post(
        "/api/saved-products",
        headers=buyer2_headers,
        json={"product_id": product2_id},
    )

    response = client.get(
        "/api/saved-products",
        headers=buyer1_headers,
    )

    returned_product_ids = [
        item["product_id"]
        for item in response.json["data"]
    ]

    assert response.status_code == 200
    assert product1_id in returned_product_ids
    assert product2_id not in returned_product_ids


def test_delete_own_saved_product(
    client,
    buyer1_headers,
    saved_product_data,
):
    product_id = saved_product_data["product1_id"]

    save_response = client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": product_id},
    )

    saved_product_id = save_response.json["data"]["saved_product_id"]

    delete_response = client.delete(
        f"/api/saved-products/{saved_product_id}",
        headers=buyer1_headers,
    )

    assert delete_response.status_code == 204

    list_response = client.get(
        "/api/saved-products",
        headers=buyer1_headers,
    )

    returned_ids = [
        item["product_id"]
        for item in list_response.json["data"]
    ]

    assert product_id not in returned_ids


def test_buyer_cannot_delete_another_buyers_saved_product(
    client,
    buyer1_headers,
    buyer2_headers,
    saved_product_data,
):
    save_response = client.post(
        "/api/saved-products",
        headers=buyer1_headers,
        json={"product_id": saved_product_data["product1_id"]},
    )

    saved_product_id = save_response.json["data"]["saved_product_id"]

    delete_response = client.delete(
        f"/api/saved-products/{saved_product_id}",
        headers=buyer2_headers,
    )

    assert delete_response.status_code == 404
    assert (
        delete_response.json["error"]["code"]
        == "SAVED_PRODUCT_NOT_FOUND"
    )


def test_get_saved_products_requires_authentication(client):
    response = client.get("/api/saved-products")

    assert response.status_code == 401