import pytest

from app import create_app
from app.extensions import db
from app.models import (
    Role,
    User,
    BuyerProfile,
    FarmerProfile,
    Category,
    BuyerRequest
)
from flask_jwt_extended import create_access_token


@pytest.fixture
def app():
    test_app = create_app({
        "TESTING": True,
        "SECRET_KEY": "agribridge-testing-secret-key-2026",
        "JWT_SECRET_KEY": "agribridge-testing-jwt-secret-key-2026",
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })

    with test_app.app_context():
        db.create_all()

        yield test_app

        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def buyer(app):
    with app.app_context():
        role = Role.query.filter_by(role_name="buyer").first()

        if role is None:
            role = Role(role_name="buyer")
            db.session.add(role)
            db.session.flush()

        user = User(
            full_name="Test Buyer",
            email="buyer@test.com",
            phone_number="0710000001",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.flush()

        profile = BuyerProfile(
            user_id=user.user_id,
            business_name="Test Fresh Produce",
            buyer_type="retailer",
            location="Nairobi"
        )

        db.session.add(profile)
        db.session.commit()

        return {
            "user_id": user.user_id,
            "buyer_id": profile.buyer_id
        }

@pytest.fixture
def buyer_token(app, buyer):
    with app.app_context():
        return create_access_token(
            identity=str(buyer["user_id"])
        )


@pytest.fixture
def other_buyer(app):
    with app.app_context():
        role = Role.query.filter_by(role_name="buyer").first()

        if role is None:
            role = Role(role_name="buyer")
            db.session.add(role)
            db.session.flush()

        user = User(
            full_name="Other Buyer",
            email="otherbuyer@test.com",
            phone_number="0710000002",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.flush()

        profile = BuyerProfile(
            user_id=user.user_id,
            business_name="Other Fresh Produce",
            buyer_type="wholesaler",
            location="Kiambu"
        )

        db.session.add(profile)
        db.session.commit()

        return {
            "user_id": user.user_id,
            "buyer_id": profile.buyer_id
        }

@pytest.fixture
def other_buyer_token(app, other_buyer):
    with app.app_context():
        return create_access_token(
            identity=str(other_buyer["user_id"])
        )


@pytest.fixture
def farmer(app):
    with app.app_context():
        role = Role(role_name="farmer")
        db.session.add(role)
        db.session.flush()

        user = User(
            full_name="Test Farmer",
            email="farmer@test.com",
            phone_number="0710000003",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.flush()

        profile = FarmerProfile(
            user_id=user.user_id,
            farm_name="Green Farm",
            location="Nakuru",
            description="Fresh farm produce",
            verification_status="verified"
        )

        db.session.add(profile)
        db.session.commit()

        return {
            "user_id": user.user_id,
            "farmer_id": profile.farmer_id
        }


@pytest.fixture
def farmer_token(app, farmer):
    with app.app_context():
        return create_access_token(
            identity=str(farmer["user_id"])
        )


@pytest.fixture
def category(app):
    with app.app_context():
        new_category = Category(
            category_name="Vegetables",
            description="Fresh vegetables"
        )

        db.session.add(new_category)
        db.session.commit()

        return new_category.category_id


@pytest.fixture
def buyer_request(app, buyer, category):
    with app.app_context():
        new_request = BuyerRequest(
            buyer_id=buyer["buyer_id"],
            category_id=category,
            product_name="Tomatoes",
            quantity=100,
            unit="kg",
            budget=5000,
            location="Nairobi",
            status="open"
        )

        db.session.add(new_request)
        db.session.commit()

        return new_request.request_id


def test_create_request(client, buyer_token, category):
    response = client.post(
        "/api/requests",
        json={
            "category_id": category,
            "product_name": "Tomatoes",
            "quantity": "100",
            "unit": "kg",
            "budget": "5000",
            "location": "Nairobi",
            "required_date": "2026-12-01"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["message"] == "Buyer request created successfully"
    assert data["data"]["product_name"] == "Tomatoes"
    assert data["data"]["quantity"] == "100.000"
    assert data["data"]["unit"] == "kg"
    assert data["data"]["status"] == "open"


def test_create_request_without_token(client, category):
    response = client.post(
        "/api/requests",
        json={
            "category_id": category,
            "product_name": "Tomatoes",
            "quantity": "100",
            "unit": "kg",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 401


def test_create_request_without_buyer_profile(client, farmer_token, category):
    response = client.post(
        "/api/requests",
        json={
            "category_id": category,
            "product_name": "Tomatoes",
            "quantity": "100",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 403


def test_create_request_with_missing_product_name(client, buyer_token, category):
    response = client.post(
        "/api/requests",
        json={
            "category_id": category,
            "quantity": "100",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_create_request_with_invalid_quantity(client, buyer_token, category):
    response = client.post(
        "/api/requests",
        json={
            "category_id": category,
            "product_name": "Tomatoes",
            "quantity": "0",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_create_request_with_invalid_unit(client, buyer_token, category):
    response = client.post(
        "/api/requests",
        json={
            "category_id": category,
            "product_name": "Tomatoes",
            "quantity": "100",
            "unit": "invalid",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_create_request_with_invalid_category(client, buyer_token):
    response = client.post(
        "/api/requests",
        json={
            "category_id": 99999,
            "product_name": "Tomatoes",
            "quantity": "100",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 404


def test_create_request_with_invalid_json_structure(client, buyer_token):
    response = client.post(
        "/api/requests",
        json=["Tomatoes"],
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_get_buyer_requests(client, buyer_token, buyer_request):
    response = client.get(
        "/api/requests?view=buyer",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 200

    data = response.get_json()["data"]

    assert len(data) == 1
    assert data[0]["product_name"] == "Tomatoes"


def test_get_farmer_requests(client, farmer_token, buyer_request):
    response = client.get(
        "/api/requests?view=farmer",
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 200

    data = response.get_json()["data"]

    assert len(data) == 1
    assert data[0]["product_name"] == "Tomatoes"


def test_get_requests_without_token(client):
    response = client.get("/api/requests?view=buyer")

    assert response.status_code == 401


def test_get_requests_without_view(client, buyer_token):
    response = client.get(
        "/api/requests",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_get_requests_with_invalid_view(client, buyer_token):
    response = client.get(
        "/api/requests?view=invalid",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_get_buyer_requests_without_profile(client, farmer_token):
    response = client.get(
        "/api/requests?view=buyer",
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 403


def test_get_farmer_requests_without_profile(client, buyer_token):
    response = client.get(
        "/api/requests?view=farmer",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 403


def test_get_single_request(client, buyer_token, buyer_request):
    response = client.get(
        f"/api/requests/{buyer_request}",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 200

    data = response.get_json()["data"]

    assert data["request_id"] == buyer_request
    assert data["product_name"] == "Tomatoes"


def test_farmer_can_view_open_request(client, farmer_token, buyer_request):
    response = client.get(
        f"/api/requests/{buyer_request}",
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 200


def test_other_buyer_cannot_view_request(
    client,
    other_buyer_token,
    buyer_request
):
    response = client.get(
        f"/api/requests/{buyer_request}",
        headers={
            "Authorization": f"Bearer {other_buyer_token}"
        }
    )

    assert response.status_code == 403


def test_get_nonexistent_request(client, buyer_token):
    response = client.get(
        "/api/requests/99999",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 404


def test_update_request(client, buyer_token, buyer_request, category):
    response = client.put(
        f"/api/requests/{buyer_request}",
        json={
            "category_id": category,
            "product_name": "Fresh Onions",
            "quantity": "50",
            "unit": "kg",
            "budget": "3000",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 200

    data = response.get_json()

    assert data["message"] == "Buyer request updated successfully"
    assert data["data"]["product_name"] == "Fresh Onions"
    assert data["data"]["quantity"] == "50.000"


def test_other_buyer_cannot_update_request(
    client,
    other_buyer_token,
    buyer_request,
    category
):
    response = client.put(
        f"/api/requests/{buyer_request}",
        json={
            "category_id": category,
            "product_name": "Fresh Onions",
            "quantity": "50",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {other_buyer_token}"
        }
    )

    assert response.status_code == 403


def test_farmer_cannot_update_request(
    client,
    farmer_token,
    buyer_request,
    category
):
    response = client.put(
        f"/api/requests/{buyer_request}",
        json={
            "category_id": category,
            "product_name": "Fresh Onions",
            "quantity": "50",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 403


def test_update_nonexistent_request(client, buyer_token, category):
    response = client.put(
        "/api/requests/99999",
        json={
            "category_id": category,
            "product_name": "Fresh Onions",
            "quantity": "50",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 404


def test_update_request_with_invalid_data(
    client,
    buyer_token,
    buyer_request,
    category
):
    response = client.put(
        f"/api/requests/{buyer_request}",
        json={
            "category_id": category,
            "product_name": "A",
            "quantity": "0",
            "unit": "kg",
            "location": "Nairobi"
        },
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 400


def test_delete_request(client, app, buyer_token, buyer_request):
    response = client.delete(
        f"/api/requests/{buyer_request}",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 204

    with app.app_context():
        deleted_request = db.session.get(BuyerRequest, buyer_request)

        assert deleted_request is None


def test_other_buyer_cannot_delete_request(
    client,
    other_buyer_token,
    buyer_request
):
    response = client.delete(
        f"/api/requests/{buyer_request}",
        headers={
            "Authorization": f"Bearer {other_buyer_token}"
        }
    )

    assert response.status_code == 403


def test_farmer_cannot_delete_request(client, farmer_token, buyer_request):
    response = client.delete(
        f"/api/requests/{buyer_request}",
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 403


def test_delete_nonexistent_request(client, buyer_token):
    response = client.delete(
        "/api/requests/99999",
        headers={
            "Authorization": f"Bearer {buyer_token}"
        }
    )

    assert response.status_code == 404


def test_delete_request_without_token(client, buyer_request):
    response = client.delete(
        f"/api/requests/{buyer_request}"
    )

    assert response.status_code == 401
