import pytest

from app import create_app
from app.extensions import db
from app.models import User


@pytest.fixture
def client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret",
        "JWT_SECRET_KEY": "test-jwt-secret",
    })

    with app.app_context():
        db.create_all()
        with app.test_client() as test_client:
            yield test_client
        db.session.remove()
        db.drop_all()


def registration_data(**overrides):
    data = {
        "full_name": "Amina Farmer",
        "email": "amina@example.com",
        "password": "securepass123",
        "phone_number": "+254712345678",
        "role": "farmer",
    }
    data.update(overrides)
    return data


def test_register_creates_user_with_hashed_password(client):
    response = client.post("/api/register", json=registration_data())

    assert response.status_code == 201
    assert response.json["data"]["email"] == "amina@example.com"
    assert "password" not in response.json["data"]

    user = User.query.one()
    assert user.password_hash != "securepass123"
    assert user.check_password("securepass123")


def test_register_rejects_duplicate_email(client):
    client.post("/api/register", json=registration_data())

    response = client.post(
        "/api/register",
        json=registration_data(full_name="Another Farmer", phone_number=None),
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "USER_EXISTS"


def test_register_rejects_invalid_data(client):
    response = client.post(
        "/api/register",
        json=registration_data(email="not-an-email"),
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_login_returns_access_token_for_valid_credentials(client):
    client.post("/api/register", json=registration_data())

    response = client.post(
        "/api/login",
        json={"email": "AMINA@example.com", "password": "securepass123"},
    )

    assert response.status_code == 200
    assert response.json["data"]["token_type"] == "Bearer"
    assert response.json["data"]["access_token"]
    assert response.json["data"]["user"]["email"] == "amina@example.com"


def test_login_rejects_invalid_credentials(client):
    client.post("/api/register", json=registration_data())

    response = client.post(
        "/api/login",
        json={"email": "amina@example.com", "password": "wrongpassword"},
    )

    assert response.status_code == 401
    assert response.json["error"]["code"] == "INVALID_CREDENTIALS"
