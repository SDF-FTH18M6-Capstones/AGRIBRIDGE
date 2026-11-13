import pytest
from marshmallow import ValidationError

from app.schemas.user_schema import UserSchema

def test_valid_user_data():
    schema = UserSchema()

    data ={
        "full_name":"Josephine Njuguna",
        "email":"josephine@example.com",
        "password":"password123",
        "phone_number":"0712345678",
        "role":"farmer"
    }

    result = schema.load(data)

    assert result["full_name"] == "Josephine Njuguna"
    assert result["email"] == "josephine@example.com"
    assert result["role"] == "farmer"


def test_valid_buyer_role():
    schema = UserSchema()

    data = {
        "full_name": "John Kamau",
        "email": "john@example.com",
        "password": "password123",
        "phone_number": "0712345678",
        "role": "buyer"
    }

    result = schema.load(data)

    assert result["role"] == "buyer"


def test_user_password_is_not_in_dump():
    schema = UserSchema()

    data = {
        "user_id": 1,
        "full_name": "Josephine Njuguna",
        "email": "josephine@example.com",
        "password": "password123",
        "role": "farmer"
    }

    result = schema.dump(data)

    assert "password" not in result


def test_invalid_email():
    schema = UserSchema()

    data = {
        "full_name": "Josephine Njuguna",
        "email": "invalid-email",
        "password": "password123",
        "role": "farmer"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_short_password():
    schema = UserSchema()

    data = {
        "full_name": "Josephine Njuguna",
        "email": "josephine@example.com",
        "password": "123",
        "role": "farmer"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_invalid_role():
    schema = UserSchema()

    data = {
        "full_name": "Josephine Njuguna",
        "email": "josephine@example.com",
        "password": "password123",
        "role": "admin"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_invalid_kenyan_phone_number():
    schema = UserSchema()

    data = {
        "full_name": "Josephine Njuguna",
        "email": "josephine@example.com",
        "password": "password123",
        "phone_number": "12345",
        "role": "farmer"
    }

    with pytest.raises(ValidationError):
        schema.load(data)