import pytest
from marshmallow import ValidationError

from app.schemas.role_schema import RoleSchema

def test_valid_admin_role():
    schema = RoleSchema()

    data = {
        "role_name": "admin",
        "description": "Full platform management"
    }

    result = schema.load(data)

    assert result["role_name"] == "admin"


def test_valid_farmer_role():
    schema = RoleSchema()

    data = {"role_name": "farmer"}

    result = schema.load(data)

    assert result["role_name"] == "farmer"


def test_valid_buyer_role():
    schema = RoleSchema()

    data = {"role_name": "buyer"}

    result = schema.load(data)

    assert result["role_name"] == "buyer"

def test_valid_field_officer_role():
    schema = RoleSchema()

    data = {
        "role_name": "field_officer",
        "description": "Responsible for physical farmer verification"
    }

    result = schema.load(data)

    assert result["role_name"] == "field_officer"


def test_role_name_is_required():
    schema = RoleSchema()

    with pytest.raises(ValidationError):
        schema.load({"description": "A role"})


def test_invalid_role_name():
    schema = RoleSchema()

    with pytest.raises(ValidationError):
        schema.load({"role_name": "seller"})


def test_role_id_is_dump_only():
    schema = RoleSchema()

    with pytest.raises(ValidationError):
        schema.load({
            "role_id": 1,
            "role_name": "admin"
        })


def test_role_serialization():
    schema = RoleSchema()

    role = {
        "role_id": 1,
        "role_name": "admin",
        "description": "Full platform management"
    }

    result = schema.dump(role)

    assert result["role_id"] == 1
    assert result["role_name"] == "admin"
