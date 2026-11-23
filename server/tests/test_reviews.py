import pytest
from app import create_app
from app.extensions import db
from app.models import Role, User, BuyerProfile, FarmerProfile, Order, Review
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
def other_buyer_user(app):
    with app.app_context():
        role = Role.query.filter_by(role_name="buyer").first()

        if role is None:
            role = Role(role_name="buyer")
            db.session.add(role)
            db.session.flush()

        user = User(
            full_name="Other Buyer",
            email="otherbuyer@test.com",
            phone_number="0710000003",
            role_id=role.role_id,
            password_hash="test-password"
        )

        db.session.add(user)
        db.session.commit()

        return user.user_id


@pytest.fixture
def other_buyer_token(app, other_buyer_user):
    with app.app_context():
        return create_access_token(identity=str(other_buyer_user))


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
def other_buyer_profile(app, other_buyer_user):
    with app.app_context():
        profile = BuyerProfile(
            user_id=other_buyer_user,
            business_name="Other Produce Business",
            buyer_type="wholesaler",
            location="Kiambu"
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


@pytest.fixture
def delivered_order(app, buyer_profile, farmer_profile):
    with app.app_context():
        order = Order(
            buyer_id=buyer_profile,
            farmer_id=farmer_profile,
            total_amount="2500.00",
            order_status="completed"
        )

        db.session.add(order)
        db.session.commit()

        return order.order_id


@pytest.fixture
def second_delivered_order(app, buyer_profile, farmer_profile):
    with app.app_context():
        order = Order(
            buyer_id=buyer_profile,
            farmer_id=farmer_profile,
            total_amount="3500.00",
            order_status="completed"
        )

        db.session.add(order)
        db.session.commit()

        return order.order_id


@pytest.fixture
def existing_review(app, delivered_order):
    with app.app_context():
        review = Review(
            order_id=delivered_order,
            rating=5,
            comment="Excellent service"
        )

        db.session.add(review)
        db.session.commit()

        return review.review_id


def test_create_review_success(client, buyer_token, delivered_order):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 5,
            "comment": "Excellent service"
        }
    )

    assert response.status_code == 201
    assert response.json["message"] == "Review submitted successfully"
    assert response.json["data"]["order_id"] == delivered_order
    assert response.json["data"]["rating"] == 5
    assert response.json["data"]["comment"] == "Excellent service"


def test_create_review_without_token(client, delivered_order):
    response = client.post(
        "/api/reviews",
        json={
            "order_id": delivered_order,
            "rating": 5
        }
    )

    assert response.status_code == 401


def test_create_review_for_nonexistent_user(client, app, delivered_order):
    with app.app_context():
        token = create_access_token(identity="999")

    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "order_id": delivered_order,
            "rating": 5
        }
    )
    assert response.status_code == 401


def test_create_review_without_buyer_profile(client, farmer_token, delivered_order):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {farmer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 5
        }
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "BUYER_PROFILE_REQUIRED"


def test_create_review_with_invalid_json_structure(client, buyer_token, buyer_profile):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json=["invalid", "data"]
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_JSON"


def test_create_review_with_missing_json(client, buyer_token, buyer_profile):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        data=""
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "INVALID_JSON"


def test_create_review_without_order_id(client, buyer_token, buyer_profile):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"rating": 5}
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_without_rating(client, buyer_token, delivered_order):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={"order_id": delivered_order}
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_with_rating_below_one(client, buyer_token, delivered_order):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 0
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_with_rating_above_five(client, buyer_token, delivered_order):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 6
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_with_non_integer_rating(client, buyer_token, delivered_order):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 4.5
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_with_non_integer_order_id(client, buyer_token, buyer_profile):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": "one",
            "rating": 5
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_with_comment_over_100_characters(
    client, buyer_token, delivered_order
):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 5,
            "comment": "A" * 101
        }
    )

    assert response.status_code == 400
    assert response.json["error"]["code"] == "VALIDATION_ERROR"


def test_create_review_for_nonexistent_order(client, buyer_token, buyer_profile):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": 999,
            "rating": 5
        }
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "ORDER_NOT_FOUND"


def test_create_review_for_another_buyers_order(
    client, other_buyer_token, delivered_order, other_buyer_profile
):

    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {other_buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 5
        }
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"


def test_create_review_for_order_not_delivered(
    client, app, buyer_token, buyer_profile, farmer_profile
):
    with app.app_context():
        order = Order(
            buyer_id=buyer_profile,
            farmer_id=farmer_profile,
            total_amount="2500.00",
            order_status="pending"
        )

        db.session.add(order)
        db.session.commit()
        order_id = order.order_id

    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": order_id,
            "rating": 4
        }
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "ORDER_NOT_DELIVERED"


def test_create_duplicate_review(client, buyer_token, delivered_order, existing_review):
    response = client.post(
        "/api/reviews",
        headers={"Authorization": f"Bearer {buyer_token}"},
        json={
            "order_id": delivered_order,
            "rating": 4,
            "comment": "Another review"
        }
    )

    assert response.status_code == 409
    assert response.json["error"]["code"] == "REVIEW_EXISTS"


def test_get_review_without_token(client, existing_review):
    response = client.get(f"/api/reviews/{existing_review}")

    assert response.status_code == 401


def test_get_review_for_nonexistent_user(client, app, existing_review):
    with app.app_context():
        token = create_access_token(identity="999")

    response = client.get(
        f"/api/reviews/{existing_review}",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401

def test_get_nonexistent_review(client, buyer_token):
    response = client.get(
        "/api/reviews/999",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 404
    assert response.json["error"]["code"] == "REVIEW_NOT_FOUND"


def test_buyer_can_view_own_review(client, buyer_token, existing_review):
    response = client.get(
        f"/api/reviews/{existing_review}",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 200
    assert response.json["data"]["rating"] == 5


def test_farmer_can_view_review_for_their_order(
    client, farmer_token, existing_review
):
    response = client.get(
        f"/api/reviews/{existing_review}",
        headers={"Authorization": f"Bearer {farmer_token}"}
    )

    assert response.status_code == 200
    assert response.json["data"]["comment"] == "Excellent service"


def test_other_buyer_cannot_view_review(
    client, other_buyer_token, existing_review, other_buyer_profile
):
    response = client.get(
        f"/api/reviews/{existing_review}",
        headers={"Authorization": f"Bearer {other_buyer_token}"}
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "FORBIDDEN"


def test_get_farmer_reviews(client, farmer_profile, existing_review):
    response = client.get(f"/api/farmers/{farmer_profile}/reviews")

    assert response.status_code == 200
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["rating"] == 5


def test_get_reviews_for_nonexistent_farmer(client):
    response = client.get("/api/farmers/999/reviews")

    assert response.status_code == 404
    assert response.json["error"]["code"] == "FARMER_NOT_FOUND"


def test_farmer_reviews_are_sorted_newest_first(
    client, app, farmer_profile, existing_review, second_delivered_order
):
    with app.app_context():
        review = Review(
            order_id=second_delivered_order,
            rating=4,
            comment="Good service"
        )

        db.session.add(review)
        db.session.commit()
        newest_review_id = review.review_id

    response = client.get(f"/api/farmers/{farmer_profile}/reviews")

    assert response.status_code == 200
    reviews = response.json["data"]
    assert len(reviews) == 2
    assert reviews[0]["review_id"] == newest_review_id
    assert reviews[0]["review_id"] > reviews[1]["review_id"]


def test_get_my_reviews_without_token(client):
    response = client.get("/api/reviews/my")

    assert response.status_code == 401


def test_get_my_reviews_for_nonexistent_user(client, app):
    with app.app_context():
        token = create_access_token(identity="999")

    response = client.get(
        "/api/reviews/my",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 401

def test_get_my_reviews_without_buyer_profile(client, farmer_token):
    response = client.get(
        "/api/reviews/my",
        headers={"Authorization": f"Bearer {farmer_token}"}
    )

    assert response.status_code == 403
    assert response.json["error"]["code"] == "BUYER_PROFILE_REQUIRED"


def test_buyer_can_get_their_reviews(client, buyer_token, existing_review):
    response = client.get(
        "/api/reviews/my",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 200
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["rating"] == 5


def test_buyer_reviews_only_include_their_own_orders(
    client, app, buyer_token, buyer_profile, other_buyer_profile,
    farmer_profile, existing_review
):
    with app.app_context():
        other_order = Order(
            buyer_id=other_buyer_profile,
            farmer_id=farmer_profile,
            total_amount="4000.00",
            order_status="completed"
        )

        db.session.add(other_order)
        db.session.flush()

        other_review = Review(
            order_id=other_order.order_id,
            rating=2,
            comment="Other buyer review"
        )

        db.session.add(other_review)
        db.session.commit()

    response = client.get(
        "/api/reviews/my",
        headers={"Authorization": f"Bearer {buyer_token}"}
    )

    assert response.status_code == 200
    assert len(response.json["data"]) == 1
    assert response.json["data"][0]["rating"] == 5
