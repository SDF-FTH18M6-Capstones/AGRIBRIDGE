import pytest
from decimal import Decimal
from marshmallow import ValidationError

from app.schemas.order_schema import OrderSchema, OrderItemsSchema


def test_valid_order():
    schema = OrderSchema()

    data = {
        "total_amount": "5000.00"
    }

    result = schema.load(data)

    assert result["total_amount"] == Decimal("5000.00")


def test_order_requires_total_amount():
    schema = OrderSchema()

    with pytest.raises(ValidationError):
        schema.load({})


def test_order_rejects_zero_total_amount():
    schema = OrderSchema()

    data = {
        "total_amount": "0"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_order_rejects_negative_total_amount():
    schema = OrderSchema()

    data = {
        "total_amount": "-100.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_order_id_is_dump_only():
    schema = OrderSchema()

    data = {
        "order_id": 1,
        "total_amount": "5000.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_valid_order_item():
    schema = OrderItemsSchema()

    data = {
        "product_id": 1,
        "quantity": "10.000",
        "unit_price": "200.00"
    }

    result = schema.load(data)

    assert result["product_id"] == 1
    assert result["quantity"] == Decimal("10.000")
    assert result["unit_price"] == Decimal("200.00")


def test_order_item_requires_product_id():
    schema = OrderItemsSchema()

    data = {
        "quantity": "10.000",
        "unit_price": "200.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_order_item_rejects_negative_quantity():
    schema = OrderItemsSchema()

    data = {
        "product_id": 1,
        "quantity": "-5",
        "unit_price": "200.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_order_item_rejects_zero_unit_price():
    schema = OrderItemsSchema()

    data = {
        "product_id": 1,
        "quantity": "10",
        "unit_price": "0"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_subtotal_is_dump_only():
    schema = OrderItemsSchema()

    data = {
        "product_id": 1,
        "quantity": "10",
        "unit_price": "200",
        "subtotal": "2000"
    }

    with pytest.raises(ValidationError):
        schema.load(data)
