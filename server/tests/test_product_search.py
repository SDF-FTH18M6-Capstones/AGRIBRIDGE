import os

import pytest
from dotenv import load_dotenv

from decimal import Decimal
from uuid import uuid4
from sqlalchemy.engine import make_url


from app import create_app
from app.extensions import db
from app.models import Role, User, FarmerProfile, Category, Product



load_dotenv()


@pytest.fixture
def app():
    database_url = os.getenv("PRODUCT_TEST_DATABASE_URL")

    if not database_url:
        pytest.fail("PRODUCT_TEST_DATABASE_URL is missing")

    if make_url(database_url).database != "product-testing":
        pytest.fail("Tests must run against product-testing")

    test_app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": database_url,
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
            description="Temporary role for product search tests"
        )
        db.session.add(role)
        db.session.flush()

        user1 = User(
            full_name="Test Farmer One",
            email=f"farmer1_{marker}@example.com",
            password_hash="test-password-hash",
            role_id=role.role_id
        )

        user2 = User(
            full_name="Test Farmer Two",
            email=f"farmer2_{marker}@example.com",
            password_hash="test-password-hash",
            role_id=role.role_id
        )

        db.session.add_all([user1, user2])
        db.session.flush()


        farmer1 = FarmerProfile(
            user_id=user1.user_id,
            farm_name=f"Green Farm {marker}",
            location=f"Kiambu County {marker}"
        )

        farmer2 = FarmerProfile(
            user_id=user2.user_id,
            farm_name=f"Fresh Farm {marker}",
            location=f"Nakuru County {marker}"
        )

        db.session.add_all([farmer1, farmer2])
        db.session.flush()


        vegetables = Category(
            category_name=f"Vegetables {marker}"
        )

        fruits = Category(
            category_name=f"Fruits {marker}"
        )

        db.session.add_all([vegetables, fruits])
        db.session.flush()


        tomatoes = Product(
            farmer_id=farmer1.farmer_id,
            category_id=vegetables.category_id,
            product_name=f"Tomatoes {marker}",
            description="Fresh organic tomatoes",
            price=Decimal("120.00"),
            quantity_available=Decimal("50.000"),
            unit="kg",
            quality="Premium",
            status="available"
        )

        potatoes = Product(
            farmer_id=farmer1.farmer_id,
            category_id=vegetables.category_id,
            product_name=f"Potatoes {marker}",
            description="Fresh farm potatoes",
            price=Decimal("80.00"),
            quantity_available=Decimal("100.000"),
            unit="kg",
            quality="Standard",
            status="sold_out"
        )

        mangoes = Product(
            farmer_id=farmer2.farmer_id,
            category_id=fruits.category_id,
            product_name=f"Mangoes {marker}",
            description="Sweet ripe mangoes",
            price=Decimal("150.00"),
            quantity_available=Decimal("30.000"),
            unit="kg",
            quality="Premium",
            status="available"
        )

        onions = Product(
            farmer_id=farmer2.farmer_id,
            category_id=vegetables.category_id,
            product_name=f"Onions {marker}",
            description="Fresh red onions",
            price=Decimal("60.00"),
            quantity_available=Decimal("0.000"),
            unit="kg",
            quality="Standard",
            status="inactive"
        )

        db.session.add_all([tomatoes, potatoes, mangoes, onions])
        db.session.commit()


        test_data = {
            "tomatoes_id": tomatoes.product_id,
            "potatoes_id": potatoes.product_id,
            "mangoes_id": mangoes.product_id,
            "onions_id": onions.product_id,
            "vegetables_id": vegetables.category_id,
            "fruits_id": fruits.category_id,
        }

        test_data = {
            "marker": marker,
            "tomatoes_id": tomatoes.product_id,
            "potatoes_id": potatoes.product_id,
            "mangoes_id": mangoes.product_id,
            "onions_id": onions.product_id,
            "vegetables_id": vegetables.category_id,
            "fruits_id": fruits.category_id,
        }

        yield test_data


        for product in [tomatoes, potatoes, mangoes, onions]:
            db.session.delete(product)

        db.session.flush()

        for farmer in [farmer1, farmer2]:
            db.session.delete(farmer)

        for user in [user1, user2]:
            db.session.delete(user)

        for category in [vegetables, fruits]:
            db.session.delete(category)

        db.session.delete(role)
        db.session.commit()

def test_search_products_returns_matching_products(client, sample_products):
    marker = sample_products["marker"]

    response = client.get(
        f"/api/products/search?search={marker}"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data["success"] is True
    assert len(response_data["data"]) == 4

    assert response_data["pagination"]["total_items"] == 4


def test_search_products_by_category(client, sample_products):
    category_id = sample_products["vegetables_id"]

    response = client.get(
        f"/api/products/search?category_id={category_id}"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data["success"] is True
    assert len(response_data["data"]) == 3
    assert response_data["pagination"]["total_items"] == 3

    returned_category_ids = {
        product["category_id"]
        for product in response_data["data"]
    }

    assert returned_category_ids == {category_id}


def test_search_products_by_price_range(client, sample_products):
    response = client.get(
        f"/api/products/search?search={sample_products['marker']}&min_price=80&max_price=120"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data["success"] is True
    assert response_data["pagination"]["total_items"] == 2

    prices = [
        Decimal(product["price"])
        for product in response_data["data"]
    ]

    assert all(Decimal("80") <= price <= Decimal("120") for price in prices)

def test_search_products_by_farmer_location(client, sample_products):
    marker = sample_products["marker"]

    response = client.get(
        f"/api/products/search?location=Kiambu County {marker}"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data["success"] is True
    assert response_data["pagination"]["total_items"] == 2

    locations = {
        product["farmer_location"]
        for product in response_data["data"]
    }

    assert locations == {f"Kiambu County {marker}"}

def test_search_products_by_availability(client, sample_products):
    response = client.get(
        f"/api/products/search?search={sample_products['marker']}&availability=available"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data["success"] is True
    assert response_data["pagination"]["total_items"] == 2

    statuses = {
        product["status"]
        for product in response_data["data"]
    }

    assert statuses == {"available"}

def test_search_products_with_combined_filters(client, sample_products):
    marker = sample_products["marker"]
    category_id = sample_products["vegetables_id"]

    response = client.get(
        f"/api/products/search?category_id={category_id}"
        f"&min_price=80&max_price=120"
        f"&location=Kiambu County {marker}"
        f"&availability=available"
    )

    assert response.status_code == 200

    response_data = response.get_json()

    assert response_data["success"] is True
    assert response_data["pagination"]["total_items"] == 1

    product = response_data["data"][0]

    assert product["product_name"] == f"Tomatoes {marker}"
    assert product["status"] == "available"
    assert Decimal("80") <= Decimal(product["price"]) <= Decimal("120")
    assert product["category_id"] == category_id
    assert product["farmer_location"] == f"Kiambu County {marker}"

def test_search_products_pagination(client, sample_products):
    marker = sample_products["marker"]

    response = client.get(
        f"/api/products/search?search={marker}&page=1&per_page=2"
    )

    assert response.status_code == 200

    response_data = response.get_json()
    pagination = response_data["pagination"]

    assert response_data["success"] is True
    assert len(response_data["data"]) == 2
    assert pagination["page"] == 1
    assert pagination["per_page"] == 2
    assert pagination["total_items"] == 4
    assert pagination["total_pages"] == 2
    assert pagination["has_next"] is True
    assert pagination["has_previous"] is False


def test_search_products_rejects_invalid_page(client):
    response = client.get("/api/products/search?page=abc")

    assert response.status_code == 400

    response_data = response.get_json()

    assert response_data["success"] is False
    assert response_data["message"] == (
        "page must be positive and per_page must be between 1 and 100"
    )

@pytest.mark.parametrize(
    "params",
    [
        "page=0",
        "per_page=0",
        "per_page=101",
    ]
)
def test_search_products_rejects_invalid_pagination_values(client, params):
    response = client.get(f"/api/products/search?{params}")

    assert response.status_code == 400

    response_data = response.get_json()
    assert response_data["success"] is False