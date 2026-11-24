import pytest
from app import create_app
from app.extensions import db
from app.models import (
    Role,
    User,
    BuyerProfile,
    FarmerProfile,
    Category,
    BuyerRequest,
    RequestResponse
)
from flask_jwt_extended import create_access_token


@pytest.fixture
def app():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "agribridge-testing-secret-key-2026",
        "JWT_SECRET_KEY": "agribridge-testing-jwt-secret-key-2026",
    })

    with app.app_context():
        db.create_all()
        yield app
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
        return create_access_token(identity=str(buyer["user_id"]))


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
        return create_access_token(identity=str(other_buyer["user_id"]))


@pytest.fixture
def farmer(app):
    with app.app_context():
        role = Role.query.filter_by(role_name="farmer").first()

        if role is None:
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
            farm_name="Test Farm",
            location="Nakuru",
            description="Fresh produce farm"
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
        return create_access_token(identity=str(farmer["user_id"]))


@pytest.fixture
def category(app):
    with app.app_context():
        category = Category(
            category_name="Vegetables",
            description="Fresh vegetables"
        )

        db.session.add(category)
        db.session.commit()

        return category.category_id


@pytest.fixture
def buyer_request(app, buyer, category):
    with app.app_context():
        buyer_request = BuyerRequest(
            buyer_id=buyer["buyer_id"],
            category_id=category,
            product_name="Tomatoes",
            quantity=100,
            unit="kg",
            budget=5000,
            location="Nairobi",
            status="open"
        )

        db.session.add(buyer_request)
        db.session.commit()

        return buyer_request.request_id


@pytest.fixture
def farmer_response(app, buyer_request, farmer):
    with app.app_context():
        response = RequestResponse(
            request_id=buyer_request,
            farmer_id=farmer["farmer_id"],
            message="Fresh tomatoes available",
            offered_price=4500,
            available_quantity=100,
            status="pending"
        )

        db.session.add(response)
        db.session.commit()

        return response.response_id


def test_create_response(client, farmer_token, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "message": "Fresh tomatoes available",
            "offered_price": "4500",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 201
    assert response.json["data"]["status"] == "pending"
    assert response.json["data"]["offered_price"] == "4500.00"


def test_create_response_without_token(client, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        json={
            "offered_price": "4500",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 401


def test_create_response_without_farmer_profile(client, buyer_token, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "offered_price": "4500",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FARMER_PROFILE_REQUIRED"


def test_create_response_with_nonexistent_request(client, farmer_token):
    response = client.post(
        "/api/requests/999/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "offered_price": "4500",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "REQUEST_NOT_FOUND"


def test_create_response_to_closed_request(client, app, farmer_token, buyer_request):
    with app.app_context():
        request_record = db.session.get(BuyerRequest, buyer_request)
        request_record.status = "closed"
        db.session.commit()

    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "offered_price": "4500",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "REQUEST_NOT_OPEN"


def test_farmer_cannot_respond_twice(client, farmer_token, buyer_request, farmer_response):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "offered_price": "4500",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "RESPONSE_EXISTS"


def test_create_response_with_invalid_json_structure(client, farmer_token, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json=["invalid", "data"]
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_JSON"


def test_create_response_without_offered_price(client, farmer_token, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "available_quantity": "100"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_response_with_invalid_offered_price(client, farmer_token, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "offered_price": "-100",
            "available_quantity": "100"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_response_with_invalid_available_quantity(client, farmer_token, buyer_request):
    response = client.post(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "offered_price": "4500",
            "available_quantity": "0"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_get_request_responses(client, buyer_token, buyer_request, farmer_response):
    response = client.get(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 200
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["status"] == "pending"


def test_get_request_responses_without_token(client, buyer_request):
    response = client.get(
        f"/api/requests/{buyer_request}/responses"
    )

    assert response.status_code == 401


def test_get_request_responses_without_buyer_profile(client, farmer_token, buyer_request):
    response = client.get(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {farmer_token}"}
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "BUYER_PROFILE_REQUIRED"


def test_get_responses_for_nonexistent_request(client, buyer_token):
    response = client.get(
        "/api/requests/999/responses",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "REQUEST_NOT_FOUND"


def test_other_buyer_cannot_view_request_responses(
    client,
    other_buyer_token,
    buyer_request,
    farmer_response
):
    response = client.get(
        f"/api/requests/{buyer_request}/responses",
        headers={"Authorization": f"Bearer {other_buyer_token}"}
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"


def test_accept_response(client, app, buyer_token, buyer_request, farmer_response):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "accepted"}
    )

    assert response.status_code == 200
    assert response.json["data"]["status"] == "accepted"

    with app.app_context():
        request_record = db.session.get(BuyerRequest, buyer_request)
        assert request_record.status == "matched"


def test_reject_response(client, app, buyer_token, buyer_request, farmer_response):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "rejected"}
    )

    assert response.status_code == 200
    assert response.json["data"]["status"] == "rejected"

    with app.app_context():
        request_record = db.session.get(BuyerRequest, buyer_request)
        assert request_record.status == "open"


def test_update_response_without_token(client, farmer_response):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        json={"status": "accepted"}
    )

    assert response.status_code == 401


def test_update_response_without_buyer_profile(client, farmer_token, farmer_response):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={"status": "accepted"}
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "BUYER_PROFILE_REQUIRED"


def test_update_nonexistent_response(client, buyer_token):
    response = client.patch(
        "/api/responses/999",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "accepted"}
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "RESPONSE_NOT_FOUND"


def test_other_buyer_cannot_update_response(
    client,
    other_buyer_token,
    farmer_response
):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {other_buyer_token}"},
        json={"status": "accepted"}
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"


def test_update_response_with_invalid_json_structure(
    client,
    buyer_token,
    farmer_response
):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json=["invalid", "data"]
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_JSON"


def test_update_response_with_invalid_status(client, buyer_token, farmer_response):
    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "pending"}
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_STATUS"


def test_update_response_that_was_already_processed(
    client,
    app,
    buyer_token,
    farmer_response
):
    with app.app_context():
        response_record = db.session.get(RequestResponse, farmer_response)
        response_record.status = "rejected"
        db.session.commit()

    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "accepted"}
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "RESPONSE_ALREADY_PROCESSED"


def test_accept_response_when_request_is_not_open(
    client,
    app,
    buyer_token,
    buyer_request,
    farmer_response
):
    with app.app_context():
        request_record = db.session.get(BuyerRequest, buyer_request)
        request_record.status = "fulfilled"
        db.session.commit()

    response = client.patch(
        f"/api/responses/{farmer_response}",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"status": "accepted"}
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "REQUEST_NOT_OPEN"
