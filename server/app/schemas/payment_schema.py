from marshmallow import Schema, fields,validate

class PaymentSchema(Schema):
    payment_id = fields.Int(dump_only=True)
    order_id = fields.Int(
        required=True,
        strict=True
    )

    payment_method = fields.Str(
        required=True,
        validate=validate.OneOf(
            ["mpesa", "airtel_money", "bank_transfer"]
        )
    )

    transaction_reference = fields.Str(
        allow_none=True,
        validate=validate.Length(min=1, max=100)
    )

    amount = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01)
    )

    payment_status = fields.Str(
        dump_only=True,
        validate=validate.OneOf([
            "pending",
            "paid",
            "failed",
            "refunded"
        ])
    )

    paid_at = fields.DateTime(
        dump_only=True,
        allow_none=True
    )