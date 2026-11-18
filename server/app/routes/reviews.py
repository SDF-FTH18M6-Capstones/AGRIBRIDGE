from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.extensions import db
from app.models import User, Order, Review, FarmerProfile
from app.schemas.review_schema import ReviewSchema


reviews_bp = Blueprint("reviews", __name__)

review_schema = ReviewSchema()
reviews_schema = ReviewSchema(many=True)


def get_current_user():
    user_id = int(get_jwt_identity())
    return db.session.get(User, user_id)


@reviews_bp.post("/reviews")
@jwt_required()
def create_review():
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    if user.buyer_profile is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_REQUIRED",
                "message": "A buyer profile is required to submit a review"
            }
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": {
                "code": "INVALID_JSON",
                "message": "Request body must be a JSON object"
            }
        }), 400

    try:
        validated_data = review_schema.load(data)
    except ValidationError as error:
        return jsonify({
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid review data",
                "fields": error.messages
            }
        }), 400

    order = db.session.get(Order, validated_data["order_id"])

    if order is None:
        return jsonify({
            "error": {
                "code": "ORDER_NOT_FOUND",
                "message": "Order not found"
            }
        }), 404

    if order.buyer_id != user.buyer_profile.buyer_id:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You can only review your own orders"
            }
        }), 403

    if order.order_status != "delivered":
        return jsonify({
            "error": {
                "code": "ORDER_NOT_DELIVERED",
                "message": "Only delivered orders can be reviewed"
            }
        }), 409

    existing_review = Review.query.filter_by(
        order_id=order.order_id
    ).first()

    if existing_review:
        return jsonify({
            "error": {
                "code": "REVIEW_EXISTS",
                "message": "This order has already been reviewed"
            }
        }), 409

    new_review = Review(
        order_id=order.order_id,
        rating=validated_data["rating"],
        comment=validated_data.get("comment")
    )

    db.session.add(new_review)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "error": {
                "code": "REVIEW_EXISTS",
                "message": "This order has already been reviewed"
            }
        }), 409

    return jsonify({
        "message": "Review submitted successfully",
        "data": review_schema.dump(new_review)
    }), 201



@reviews_bp.get("/reviews/<int:review_id>")
@jwt_required()
def get_review(review_id):
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    review = db.session.get(Review, review_id)

    if review is None:
        return jsonify({
            "error": {
                "code": "REVIEW_NOT_FOUND",
                "message": "Review not found"
            }
        }), 404

    order = review.order

    is_buyer = (
        user.buyer_profile is not None
        and order.buyer_id == user.buyer_profile.buyer_id
    )

    is_farmer = (
        user.farmer_profile is not None
        and order.farmer_id == user.farmer_profile.farmer_id
    )

    if not is_buyer and not is_farmer:
        return jsonify({
            "error": {
                "code": "FORBIDDEN",
                "message": "You are not allowed to view this review"
            }
        }), 403

    return jsonify({
        "data": review_schema.dump(review)
    }), 200



@reviews_bp.get("/farmers/<int:farmer_id>/reviews")
def get_farmer_reviews(farmer_id):
    farmer = db.session.get(FarmerProfile, farmer_id)

    if farmer is None:
        return jsonify({
            "error": {
                "code": "FARMER_NOT_FOUND",
                "message": "Farmer profile not found"
            }
        }), 404

    reviews = (
        Review.query
        .join(Order, Review.order_id == Order.order_id)
        .filter(Order.farmer_id == farmer_id)
        .order_by(Review.review_id.desc())
        .all()
    )

    return jsonify({
        "data": reviews_schema.dump(reviews)
    }), 200


@reviews_bp.get("/reviews/my")
@jwt_required()
def get_my_reviews():
    user = get_current_user()

    if user is None:
        return jsonify({
            "error": {
                "code": "USER_NOT_FOUND",
                "message": "User account not found"
            }
        }), 404

    if user.buyer_profile is None:
        return jsonify({
            "error": {
                "code": "BUYER_PROFILE_REQUIRED",
                "message": "A buyer profile is required"
            }
        }), 403

    reviews = (
        Review.query
        .join(Order, Review.order_id == Order.order_id)
        .filter(Order.buyer_id == user.buyer_profile.buyer_id)
        .order_by(Review.review_id.desc())
        .all()
    )

    return jsonify({
        "data": reviews_schema.dump(reviews)
    }), 200
