import pytest
from app import create_app
from app.extensions import db
from app.models import Role, User, BuyerProfile, FarmerProfile
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
def buyer_user(app):
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
        db.session.commit()

        return user.user_id


@pytest.fixture
def buyer_token(app, buyer_user):
    with app.app_context():
        return create_access_token(identity=str(buyer_user))


@pytest.fixture
def farmer_user(app):
    with app.app_context():
        role = Role.query.filter_by(role_name="farmer").first()

        if role is None:
            role = Role(role_name="farmer")
            db.session.add(role)
            db.session.flush()

        user = User(
            full_name="Test Farmer",
            email="farmer@test.com",
            phone_number="0710000002",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.commit()

        return user.user_id


@pytest.fixture
def farmer_token(app, farmer_user):
    with app.app_context():
        return create_access_token(identity=str(farmer_user))


@pytest.fixture
def buyer_profile(app, buyer_user):
    with app.app_context():
        profile = BuyerProfile(
            user_id=buyer_user,
            business_name="Test Fresh Produce",
            buyer_type="retailer",
            location="Nairobi"
        )

        db.session.add(profile)
        db.session.commit()

        return profile.buyer_id


@pytest.fixture
def farmer_profile(app, farmer_user):
    with app.app_context():
        profile = FarmerProfile(
            user_id=farmer_user,
            farm_name="Test Farm",
            location="Nakuru",
            description="Fresh produce farm"
        )

        db.session.add(profile)
        db.session.commit()

        return profile.farmer_id


def test_get_my_profiles_without_token(client):
    response = client.get("/api/profiles/me")

    assert response.status_code == 401


def test_get_my_profiles_without_existing_profiles(client, buyer_token):
    response = client.get(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 200
    assert response.json["data"]["buyer_profile"] is None
    assert response.json["data"]["farmer_profile"] is None


def test_get_my_buyer_profile(client, buyer_token, buyer_profile):
    response = client.get(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 200
    assert response.json["data"]["buyer_profile"]["buyer_type"] == "retailer"
    assert response.json["data"]["buyer_profile"]["location"] == "Nairobi"


def test_get_my_farmer_profile(client, farmer_token, farmer_profile):
    response = client.get(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {farmer_token}"}
    )

    assert response.status_code == 200
    assert response.json["data"]["farmer_profile"]["farm_name"] == "Test Farm"
    assert response.json["data"]["farmer_profile"]["location"] == "Nakuru"


def test_get_my_nonexistent_user_profile(client, app):
    with app.app_context():
        token = create_access_token(identity="999")

    response = client.get(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401

def test_update_buyer_profile(client, app, buyer_token, buyer_user, buyer_profile):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "buyer",
            "business_name": "Updated Fresh Produce",
            "buyer_type": "wholesaler",
            "location": "Kiambu"
        }
    )

    assert response.status_code == 200
    assert response.json["data"]["business_name"] == "Updated Fresh Produce"
    assert response.json["data"]["buyer_type"] == "wholesaler"
    assert response.json["data"]["location"] == "Kiambu"

    with app.app_context():
        profile = BuyerProfile.query.filter_by(user_id=buyer_user).first()
        assert profile.business_name == "Updated Fresh Produce"


def test_create_buyer_profile(client, app, buyer_token, buyer_user):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "buyer",
            "business_name": "New Produce Business",
            "buyer_type": "restaurant",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 200
    assert response.json["data"]["buyer_type"] == "restaurant"

    with app.app_context():
        profile = BuyerProfile.query.filter_by(user_id=buyer_user).first()
        assert profile is not None


def test_create_buyer_profile_without_business_name(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "buyer",
            "buyer_type": "individual",
            "location": "Thika"
        }
    )

    assert response.status_code == 200
    assert response.json["data"]["business_name"] is None


def test_update_farmer_profile(client, app, farmer_token, farmer_user, farmer_profile):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "profile_type": "farmer",
            "farm_name": "Updated Green Farm",
            "location": "Nyeri",
            "description": "Organic vegetable farming"
        }
    )

    assert response.status_code == 200
    assert response.json["data"]["farm_name"] == "Updated Green Farm"
    assert response.json["data"]["location"] == "Nyeri"

    with app.app_context():
        profile = FarmerProfile.query.filter_by(user_id=farmer_user).first()
        assert profile.farm_name == "Updated Green Farm"


def test_create_farmer_profile(client, app, farmer_token, farmer_user):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "profile_type": "farmer",
            "farm_name": "New Green Farm",
            "location": "Meru",
            "description": "Fruit and vegetable farm"
        }
    )

    assert response.status_code == 200
    assert response.json["data"]["farm_name"] == "New Green Farm"

    with app.app_context():
        profile = FarmerProfile.query.filter_by(user_id=farmer_user).first()
        assert profile is not None


def test_update_profile_without_token(client):
    response = client.put(
        "/api/profiles/me",
        json={
            "profile_type": "buyer",
            "buyer_type": "retailer",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 401


def test_update_profile_for_nonexistent_user(client, app):
    with app.app_context():
        token = create_access_token(identity="999")

    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "profile_type": "buyer",
            "buyer_type": "retailer",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 401


def test_update_profile_with_invalid_json_structure(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json=["invalid", "data"]
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_JSON"


def test_update_profile_with_missing_json(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        data=""
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_JSON"


def test_update_profile_with_invalid_profile_type(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "admin",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_PROFILE_TYPE"


def test_update_buyer_profile_with_missing_buyer_type(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "buyer",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_update_buyer_profile_with_invalid_buyer_type(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "buyer",
            "buyer_type": "supplier",
            "location": "Nairobi"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_update_buyer_profile_with_short_location(client, buyer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "profile_type": "buyer",
            "buyer_type": "retailer",
            "location": "A"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_update_farmer_profile_without_farm_name(client, farmer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "profile_type": "farmer",
            "location": "Nakuru"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_update_farmer_profile_with_short_farm_name(client, farmer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "profile_type": "farmer",
            "farm_name": "A",
            "location": "Nakuru"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_update_farmer_profile_with_short_location(client, farmer_token):
    response = client.put(
        "/api/profiles/me",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "profile_type": "farmer",
            "farm_name": "Green Farm",
            "location": "A"
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"
