import pytest
from marshmallow import ValidationError

from app.schemas.category_schema import CategorySchema


def test_valid_category():
    schema = CategorySchema()

    data = {
        "category_name": "Vegetables",
        "description": "Fresh farm vegetables"
    }

    result = schema.load(data)

    assert result["category_name"] == "Vegetables"
    assert result["description"] == "Fresh farm vegetables"


def test_category_requires_name():
    schema = CategorySchema()

    data = {
        "description": "Fresh farm vegetables"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_category_name_cannot_be_too_short():
    schema = CategorySchema()

    data = {
        "category_name": "V"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_category_name_cannot_exceed_100_characters():
    schema = CategorySchema()

    data = {
        "category_name": "A" * 101
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_category_id_is_dump_only():
    schema = CategorySchema()

    data = {
        "category_id": 1,
        "category_name": "Fruits"
    }
    with pytest.raises(ValidationError):
        schema.load(data)


def test_category_can_have_no_description():
    schema = CategorySchema()

    data = {
        "category_name": "Cereals"
    }

    result = schema.load(data)

    assert result["category_name"] == "Cereals"
