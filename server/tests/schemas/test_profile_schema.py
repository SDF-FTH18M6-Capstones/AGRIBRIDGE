import pytest
from marshmallow import ValidationError

from app.schemas.profile_schema import (
    FarmerProfileSchema,
    BuyerProfileSchema
)


def test_valid_farmer_profile():
    schema = FarmerProfileSchema()

    data = {
        "farm_name": "Green Valley Farm",
        "location": "Kiambu",
        "description": "A vegetable farming business"
    }

    result = schema.load(data)

    assert result["farm_name"] == "Green Valley Farm"
    assert result["location"] == "Kiambu"


def test_farmer_profile_requires_farm_name():
    schema = FarmerProfileSchema()

    data = {
        "location": "Kiambu"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_valid_buyer_profile():
    schema = BuyerProfileSchema()

    data = {
        "business_name": "Fresh Foods Ltd",
        "buyer_type": "retailer",
        "location": "Nairobi"
    }

    result = schema.load(data)

    assert result["business_name"] == "Fresh Foods Ltd"
    assert result["buyer_type"] == "retailer"


def test_valid_buyer_types():
    schema = BuyerProfileSchema()

    buyer_types = [
        "retailer",
        "wholesaler",
        "individual",
        "restaurant",
    ]

    for buyer_type in buyer_types:
        data = {
            "buyer_type": buyer_type,
            "location": "Nairobi"
        }

        result = schema.load(data)

        assert result["buyer_type"] == buyer_type


def test_invalid_buyer_type():
    schema = BuyerProfileSchema()

    data = {
        "buyer_type": "supermarket_owner",
        "location": "Nairobi"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_buyer_profile_requires_location():
    schema = BuyerProfileSchema()

    data = {
        "buyer_type": "individual"
    }

    with pytest.raises(ValidationError):
        schema.load(data)
