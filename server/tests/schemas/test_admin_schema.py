import pytest
from marshmallow import ValidationError

from app.schemas.admin_schema import AdminSchema

def test_admin_serialization():
    schema = AdminSchema()

    admin = {
        "admin_id": 1,
        "user_id": 5,
        "status": "active"
    }

    result = schema.dump(admin)

    assert result["admin_id"] == 1
    assert result["user_id"] == 5
    assert result["status"] == "active"


def test_admin_fields_are_dump_only():
    schema = AdminSchema()

    with pytest.raises(ValidationError):
        schema.load({
            "admin_id": 1,
            "user_id": 5,
            "status": "active"
        })


def test_admin_serialization_with_suspended_status():
    schema = AdminSchema()

    admin = {
        "admin_id": 2,
        "user_id": 8,
        "status": "suspended"
    }

    result = schema.dump(admin)

    assert result["status"] == "suspended"
