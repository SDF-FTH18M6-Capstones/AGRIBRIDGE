
import pytest

from app import create_app
from app.extensions import db
from app.models import Role, User, Admin, Category
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
def admin_token(app):
    with app.app_context():
        role = Role(role_name="admin")
        db.session.add(role)
        db.session.flush()

        user = User(
            full_name="Test Admin",
            email="admin@test.com",
            phone_number="0700000001",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.flush()

        admin = Admin(user_id=user.user_id, status="active")
        db.session.add(admin)
        db.session.commit()

        return create_access_token(identity=str(user.user_id))


@pytest.fixture
def farmer_token(app):
    with app.app_context():
        role = Role(role_name="farmer")
        db.session.add(role)
        db.session.flush()

        user = User(
            full_name="Test Farmer",
            email="farmer@test.com",
            phone_number="0700000002",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.commit()

        return create_access_token(identity=str(user.user_id))


@pytest.fixture
def inactive_admin_token(app):
    with app.app_context():
        role = Role(role_name="admin")
        db.session.add(role)
        db.session.flush()

        user = User(
            full_name="Inactive Admin",
            email="inactive@test.com",
            phone_number="0700000003",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.flush()

        admin = Admin(user_id=user.user_id, status="inactive")
        db.session.add(admin)
        db.session.commit()

        return create_access_token(identity=str(user.user_id))


def test_get_categories(client, app):
    with app.app_context():
        category1 = Category(
            category_name="Tomatoes",
            description="Fresh tomatoes"
        )

        category2 = Category(
            category_name="Apples",
            description="Fresh apples"
        )

        db.session.add_all([category1, category2])
        db.session.commit()

    response = client.get("/api/categories/")

    assert response.status_code == 200

    data = response.get_json()["data"]

    assert len(data) == 2
    assert data[0]["category_name"] == "Apples"
    assert data[1]["category_name"] == "Tomatoes"


def test_create_category(client, admin_token):
    response = client.post(
        "/api/categories/",
        json={
            "category_name": "Vegetables",
            "description": "Fresh farm vegetables"
        },
        headers={
            "Authorization": f"Bearer {admin_token}"
        }
    )

    assert response.status_code == 201

    data = response.get_json()

    assert data["message"] == "Category created successfully"
    assert data["data"]["category_name"] == "Vegetables"
    assert data["data"]["description"] == "Fresh farm vegetables"


def test_create_category_without_token(client):
    response = client.post(
        "/api/categories/",
        json={
            "category_name": "Fruits",
            "description": "Fresh fruits"
        }
    )

    assert response.status_code == 401


def test_farmer_cannot_create_category(client, farmer_token):
    response = client.post(
        "/api/categories/",
        json={
            "category_name": "Fruits",
            "description": "Fresh fruits"
        },
        headers={
            "Authorization": f"Bearer {farmer_token}"
        }
    )

    assert response.status_code == 403

    data = response.get_json()

    assert data["error"]["code"] == "FORBIDDEN"


def test_inactive_admin_cannot_create_category(client, inactive_admin_token):
    response = client.post(
        "/api/categories/",
        json={
            "category_name": "Grains",
            "description": "Farm grains"
        },
        headers={
            "Authorization": f"Bearer {inactive_admin_token}"
        }
    )

    assert response.status_code == 403


def test_create_category_without_name(client, admin_token):
    response = client.post(
        "/api/categories/",
        json={
            "description": "Fresh farm produce"
        },
        headers={
            "Authorization": f"Bearer {admin_token}"
        }
    )

    assert response.status_code == 400


def test_create_duplicate_category(client, app, admin_token):
    with app.app_context():
        category = Category(
            category_name="Tomatoes",
            description="Fresh tomatoes"
        )

        db.session.add(category)
        db.session.commit()

    response = client.post(
        "/api/categories/",
        json={
            "category_name": "Tomatoes",
            "description": "Another tomatoes category"
        },
        headers={
            "Authorization": f"Bearer {admin_token}"
        }
    )

    assert response.status_code == 409


def test_create_category_with_short_name(client, admin_token):
    response = client.post(
        "/api/categories/",
        json={
            "category_name": "A",
            "description": "Invalid category name"
        },
        headers={
            "Authorization": f"Bearer {admin_token}"
        }
    )

    assert response.status_code == 400


def test_create_category_with_invalid_json_structure(client, admin_token):
    response = client.post(
        "/api/categories/",
        json=["Fruits"],
        headers={
            "Authorization": f"Bearer {admin_token}"
        }
    )

    assert response.status_code == 400


def test_create_category_with_nonexistent_user(client, app):
    with app.app_context():
        token = create_access_token(identity="99999")

    response = client.post(
        "/api/categories/",
        json={
            "category_name": "Dairy",
            "description": "Dairy products"
        },
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    assert response.status_code == 404
