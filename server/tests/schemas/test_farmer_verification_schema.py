import pytest
from marshmallow import ValidationError

from app.schemas.farmer_verification_schema import FarmerVerificationSchema


def test_valid_farmer_verification():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1,
        "field_officer_id": 2,
        "recommendation": "approve",
        "farm_location": "Kiambu",
        "remarks": "Farm inspection completed",
        "evidence_url": "https://example.com/farm.jpg"
    }

    result = schema.load(data)

    assert result["farmer_id"] == 1
    assert result["field_officer_id"] == 2
    assert result["recommendation"] == "approve"


def test_reject_recommendation():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1,
        "field_officer_id": 2,
        "recommendation": "reject"
    }

    result = schema.load(data)

    assert result["recommendation"] == "reject"


def test_invalid_recommendation():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1,
        "field_officer_id": 2,
        "recommendation": "pending"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_field_officer_id_is_optional():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1
    }

    result = schema.load(data)

    assert result["farmer_id"] == 1
    assert "field_officer_id" not in result


def test_field_officer_id_can_be_none():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1,
        "field_officer_id": None
    }

    result = schema.load(data)

    assert result["field_officer_id"] is None


def test_admin_fields_are_dump_only():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1,
        "field_officer_id": 2,
        "assigned_by_admin_id": 3,
        "reviewed_by_admin_id": 3
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_status_is_dump_only():
    schema = FarmerVerificationSchema()

    data = {
        "farmer_id": 1,
        "field_officer_id": 2,
        "status": "approved"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_verification_serialization():
    schema = FarmerVerificationSchema()

    verification = {
        "verification_id": 1,
        "farmer_id": 2,
        "field_officer_id": 3,
        "assigned_by_admin_id": 4,
        "recommendation": "approve",
        "status": "submitted",
        "farm_location": "Kiambu",
        "remarks": "Farm inspection completed",
        "reviewed_by_admin_id": None,
        "reviewed_at": None
    }

    result = schema.dump(verification)

    assert result["verification_id"] == 1
    assert result["farmer_id"] == 2
    assert result["field_officer_id"] == 3
    assert result["status"] == "submitted"
