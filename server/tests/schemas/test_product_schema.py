import pytest
from marshmallow import ValidationError

from app.schemas.product_schema import (
    ProductSchema,
    ProductImageSchema
)


def test_valid_product():
    schema = ProductSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "description": "Fresh red tomatoes",
        "price": "120.50",
        "quantity_available": "50.000",
        "unit": "kg",
        "quality": "Grade A",
        "availability_date": "2026-11-15",
        "status": "available"
    }

    result = schema.load(data)

    assert result["product_name"] == "Fresh Tomatoes"
    assert result["category_id"] == 1
    assert result["unit"] == "kg"
    assert result["status"] == "available"


def test_product_requires_name():
    schema = ProductSchema()

    data = {
        "category_id": 1,
        "price": "120.50",
        "quantity_available": "50.000",
        "unit": "kg",
        "status": "available"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_product_rejects_negative_price():
    schema = ProductSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "price": "-10.00",
        "quantity_available": "50.000",
        "unit": "kg",
        "status": "available"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_product_rejects_zero_quantity():
    schema = ProductSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "price": "120.50",
        "quantity_available": "0",
        "unit": "kg",
        "status": "available"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_product_rejects_invalid_unit():
    schema = ProductSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "price": "120.50",
        "quantity_available": "50.000",
        "unit": "bucket",
        "status": "available"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_product_rejects_invalid_status():
    schema = ProductSchema()

    data = {
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "price": "120.50",
        "quantity_available": "50.000",
        "unit": "kg",
        "status": "pending"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_category_id_must_be_integer():
    schema = ProductSchema()

    data = {
        "category_id": "1",
        "product_name": "Fresh Tomatoes",
        "price": "120.50",
        "quantity_available": "50.000",
        "unit": "kg",
        "status": "available"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_product_id_and_farmer_id_are_dump_only():
    schema = ProductSchema()

    data = {
        "product_id": 1,
        "farmer_id": 5,
        "category_id": 1,
        "product_name": "Fresh Tomatoes",
        "price": "120.50",
        "quantity_available": "50.000",
        "unit": "kg",
        "status": "available"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_valid_product_image():
    schema = ProductImageSchema()

    data = {
        "image_url": "https://example.com/images/tomatoes.jpg"
    }

    result = schema.load(data)

    assert result["image_url"] == data["image_url"]


def test_product_image_rejects_invalid_url():
    schema = ProductImageSchema()

    data = {
        "image_url": "not-a-valid-url"
    }

    with pytest.raises(ValidationError):
        schema.load(data)
