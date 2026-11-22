import hashlib
from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from app.extensions import db
from app.models import PasswordResetToken, RevokedToken, User


@pytest.fixture
def client(monkeypatch):
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SECRET_KEY": "test-secret",
        "JWT_SECRET_KEY": "test-jwt-secret-that-is-at-least-32-bytes",
        "PASSWORD_RESET_TOKEN_MINUTES": 15,
        "MAIL_SERVER": "smtp.example.com",
        "MAIL_DEFAULT_SENDER": "noreply@example.com",
        "PASSWORD_RESET_URL": "http://localhost:5173/reset-password",
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


def register(client):
    return client.post("/api/register", json=registration_data())


def login(client):
    return client.post("/api/login", json={"email": "amina@example.com", "password": "securepass123"})


def test_register_hashes_password_and_returns_created(client):
    response = register(client)
    assert response.status_code == 201
    assert response.json["data"]["email"] == "amina@example.com"
    assert "password" not in response.json["data"]
    user = User.query.one()
    assert user.password_hash != "securepass123"
    assert user.check_password("securepass123")


def test_register_rejects_duplicate_email(client):
    register(client)
    response = client.post("/api/register", json=registration_data(phone_number=None))
    assert response.status_code == 409
    assert response.json["error"]["code"] == "USER_EXISTS"


def test_register_rejects_invalid_data(client):
    response = client.post("/api/register", json=registration_data(email="invalid"))
    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_login_returns_jwt_for_valid_credentials(client):
    register(client)
    response = login(client)
    assert response.status_code == 200
    assert response.json["data"]["access_token"]
    assert response.json["data"]["token_type"] == "Bearer"


def test_login_rejects_wrong_password(client):
    register(client)
    response = client.post("/api/login", json={"email": "amina@example.com", "password": "wrongpass"})
    assert response.status_code == 401
    assert response.json["error"]["code"] == "INVALID_CREDENTIALS"


def test_logout_revokes_access_token(client):
    register(client)
    token = login(client).json["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/logout", headers=headers)
    assert response.status_code == 200
    assert RevokedToken.query.count() == 1
    protected = client.post("/api/logout", headers=headers)
    assert protected.status_code == 401


def test_logout_requires_token(client):
    response = client.post("/api/logout")
    assert response.status_code == 401


def test_forgot_password_sends_email_and_stores_hashed_token(client, monkeypatch):
    register(client)
    captured = {}
    def fake_send(user, raw_token):
        captured["email"] = user.email
        captured["token"] = raw_token
    monkeypatch.setattr("app.routes.auth._send_reset_email", fake_send)

    response = client.post("/api/forgot-password", json={"email": "AMINA@example.com"})
    assert response.status_code == 200
    assert captured["email"] == "amina@example.com"
    record = PasswordResetToken.query.one()
    assert record.token_hash == hashlib.sha256(captured["token"].encode()).hexdigest()
    assert record.token_hash != captured["token"]


def test_forgot_password_does_not_disclose_unknown_email(client):
    response = client.post("/api/forgot-password", json={"email": "unknown@example.com"})
    assert response.status_code == 200
    assert "If an account exists" in response.json["message"]


def test_reset_password_changes_password_and_token_is_one_time(client, monkeypatch):
    register(client)
    captured = {}
    monkeypatch.setattr("app.routes.auth._send_reset_email", lambda user, token: captured.update(token=token))
    client.post("/api/forgot-password", json={"email": "amina@example.com"})

    response = client.post("/api/reset-password", json={"token": captured["token"], "password": "newsecurepass456"})
    assert response.status_code == 200
    user = User.query.one()
    assert user.check_password("newsecurepass456")
    assert not user.check_password("securepass123")

    reuse = client.post("/api/reset-password", json={"token": captured["token"], "password": "anothersecure789"})
    assert reuse.status_code == 400


def test_reset_password_rejects_expired_token(client):
    register(client)
    user = User.query.one()
    raw_token = "expired-token"
    db.session.add(PasswordResetToken(
        user_id=user.user_id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    ))
    db.session.commit()
    response = client.post("/api/reset-password", json={"token": raw_token, "password": "newsecurepass456"})
    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_RESET_TOKEN"


def test_reset_password_validates_new_password(client):
    response = client.post("/api/reset-password", json={"token": "some-token", "password": "short"})
    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"

def test_register_without_role(client):
    data = registration_data()
    data.pop("role")

    response = client.post("/api/register", json=data)

    assert response.status_code == 201
    assert response.json["data"]["role"] is None

    user = User.query.one()
    assert user.role_id is None
    assert user.check_password("securepass123")

def test_login_without_role_returns_null_role(client):
    data = registration_data()
    data.pop("role")

    client.post("/api/register", json=data)

    response = client.post(
        "/api/login",
        json={
            "email": "amina@example.com",
            "password": "securepass123",
        },
    )

    assert response.status_code == 200
    assert response.json["data"]["user"]["role"] is None