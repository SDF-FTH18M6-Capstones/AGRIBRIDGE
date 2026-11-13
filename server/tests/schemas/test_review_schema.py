import pytest
from marshmallow import ValidationError

from app.schemas.review_schema import ReviewSchema


def test_valid_review():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "rating": 5,
        "comment": "Excellent quality and timely delivery."
    }

    result = schema.load(data)

    assert result["order_id"] == 1
    assert result["rating"] == 5
    assert result["comment"] == "Excellent quality and timely delivery."


def test_review_requires_order_id():
    schema = ReviewSchema()

    data = {
        "rating": 5,
        "comment": "Excellent service."
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_review_requires_rating():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "comment": "Excellent service."
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_review_rejects_rating_below_one():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "rating": 0
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_review_rejects_rating_above_five():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "rating": 6
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_review_rejects_non_integer_rating():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "rating": "4.5"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_review_allows_optional_comment():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "rating": 4
    }

    result = schema.load(data)

    assert result["rating"] == 4


def test_review_rejects_comment_over_100_characters():
    schema = ReviewSchema()

    data = {
        "order_id": 1,
        "rating": 5,
        "comment": "A" * 101
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_review_id_is_dump_only():
    schema = ReviewSchema()

    data = {
        "review_id": 10,
        "order_id": 1,
        "rating": 5
    }

    with pytest.raises(ValidationError):
        schema.load(data)
