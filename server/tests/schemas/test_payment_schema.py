import pytest
from decimal import Decimal
from marshmallow import ValidationError

from app.schemas.payment_schema import PaymentSchema


def test_valid_payment():
    schema = PaymentSchema()

    data = {
        "order_id": 1,
        "payment_method": "paystack",
        "transaction_reference": "QWE123456",
        "amount": "5000.00"
    }

    result = schema.load(data)

    assert result["order_id"] == 1
    assert result["payment_method"] == "paystack"
    assert result["amount"] == Decimal("5000.00")


def test_payment_requires_order_id():
    schema = PaymentSchema()

    data = {
        "payment_method": "paystack",
        "amount": "5000.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_payment_rejects_invalid_payment_method():
    schema = PaymentSchema()

    data = {
        "order_id": 1,
        "payment_method": "cash",
        "amount": "5000.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_payment_rejects_negative_amount():
    schema = PaymentSchema()

    data = {
        "order_id": 1,
        "payment_method": "paystack",
        "amount": "-100.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_payment_rejects_zero_amount():
    schema = PaymentSchema()

    data = {
        "order_id": 1,
        "payment_method": "paystack",
        "amount": "0"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_payment_allows_missing_transaction_reference():
    schema = PaymentSchema()

    data = {
        "order_id": 1,
        "payment_method": "paystack",
        "amount": "5000.00"
    }

    result = schema.load(data)

    assert result["order_id"] == 1


def test_payment_id_is_dump_only():
    schema = PaymentSchema()

    data = {
        "payment_id": 10,
        "order_id": 1,
        "payment_method": "paystack",
        "amount": "5000.00"
    }

    with pytest.raises(ValidationError):
        schema.load(data)


def test_payment_status_is_dump_only():
    schema = PaymentSchema()

    data = {
        "order_id": 1,
        "payment_method": "paystack",
        "amount": "5000.00",
        "payment_status": "completed"
    }

    with pytest.raises(ValidationError):
        schema.load(data)
