import pytest
from marshmallow import ValidationError
from decimal import Decimal

from app.schemas.request_schema import (
    BuyerRequestSchema,
    RequestResponseSchema
)


def test_valid_buyer_request():
    schema = BuyerRequestSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "quantity": "20.000",
        "unit": "kg",
        "budget": "5000.00",
        "location": "Nairobi",
        "required_date": "2026-11-20"
    }

    result = schema.load(data)

    assert result["product_name"] == "Fresh Tomatoes"
    assert result["quantity"] == Decimal("20.000")
    assert result["unit"] == "kg"


def test_buyer_request_requires_product_name():
    schema = BuyerRequestSchema()

    data = {
        "category_id": 1,
        "quantity": "20.000",
        "unit": "kg",
        "location": "Nairobi"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_buyer_request_rejects_negative_quantity():
    schema = BuyerRequestSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "quantity": "-5",
        "unit": "kg",
        "location": "Nairobi"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_buyer_request_rejects_invalid_unit():
    schema = BuyerRequestSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "quantity": "20.000",
        "unit": "bucket",
        "location": "Nairobi"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_buyer_request_rejects_negative_budget():
    schema = BuyerRequestSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "quantity": "20.000",
        "unit": "kg",
        "budget": "-100",
        "location": "Nairobi"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_buyer_request_allows_optional_budget():
    schema = BuyerRequestSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "quantity": "20.000",
        "unit": "kg",
        "location": "Nairobi"
    }

    result = schema.load(data)

    assert result["product_name"] == "Fresh Tomatoes"
    assert "budget" not in result


def test_buyer_id_is_dump_only():
    schema = BuyerRequestSchema()

    data = {
        "buyer_id": 1,
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "quantity": "20.000",
        "unit": "kg",
        "location": "Nairobi"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_valid_farmer_request_response():
    schema = RequestResponseSchema()

    data = {
        "request_id": 1,
        "message": "I have fresh tomatoes available.",
        "offered_price": "120.00",
        "available_quantity": "20.000"
    }

    result = schema.load(data)

    assert result["request_id"] == 1
    assert result["offered_price"] == Decimal("120.00")
    assert result["available_quantity"] == Decimal("20.000")


def test_request_response_rejects_negative_price():
    schema = RequestResponseSchema()

    data = {
        "request_id": 1,
        "offered_price": "-50",
        "available_quantity": "20.000"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_request_response_rejects_zero_quantity():
    schema = RequestResponseSchema()

    data = {
        "request_id": 1,
        "offered_price": "120.00",
        "available_quantity": "0"
    }

    with pytest.raises(ValidationError):
        schema.load(data)
