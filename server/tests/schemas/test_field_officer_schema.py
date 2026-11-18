import pytest
from marshmallow import ValidationError

from app.schemas.field_officer_schema import FieldOfficerSchema


def test_valid_field_officer():
    schema = FieldOfficerSchema()

    data = {
        "full_name": "John Kamau",
        "email": "john@example.com",
        "phone_number": "0712345678",
        "password": "Password123",
        "staff_number": "FO-001"
    }

    result = schema.load(data)

    assert result["full_name"] == "John Kamau"
    assert result["email"] == "john@example.com"
    assert result["staff_number"] == "FO-001"


def test_staff_number_is_required():
    schema = FieldOfficerSchema()

    data = {
        "full_name": "John Kamau",
        "email": "john@example.com",
        "phone_number": "0712345678",
        "password": "Password123"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_invalid_email():
    schema = FieldOfficerSchema()

    data = {
        "full_name": "John Kamau",
        "email": "invalid-email",
        "phone_number": "0712345678",
        "password": "Password123",
        "staff_number": "FO-001"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_invalid_phone_number():
    schema = FieldOfficerSchema()

    data = {
        "full_name": "John Kamau",
        "email": "john@example.com",
        "phone_number": "12345",
        "password": "Password123",
        "staff_number": "FO-001"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_short_password():
    schema = FieldOfficerSchema()

    data = {
        "full_name": "John Kamau",
        "email": "john@example.com",
        "phone_number": "0712345678",
        "password": "123",
        "staff_number": "FO-001"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_field_officer_id_is_dump_only():
    schema = FieldOfficerSchema()

    data = {
        "field_officer_id": 1,
        "full_name": "John Kamau",
        "email": "john@example.com",
        "phone_number": "0712345678",
        "password": "Password123",
        "staff_number": "FO-001"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_status_is_dump_only():
    schema = FieldOfficerSchema()

    data = {
        "full_name": "John Kamau",
        "email": "john@example.com",
        "phone_number": "0712345678",
        "password": "Password123",
        "staff_number": "FO-001",
        "status": "inactive"
    }

    with pytest.raises(ValidationError):
        schema.load(data)
