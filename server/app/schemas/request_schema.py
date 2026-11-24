from marshmallow import Schema, fields, validate

class BuyerRequestSchema(Schema):
    request_id = fields.Int(dump_only=True)
    buyer_id = fields.Int(dump_only=True)
    category_id = fields.Int(
        required=True,
        strict=True
    )

    product_name=fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )

    quantity=fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.001)
    )

    unit = fields.Str(
        required=True,
        validate=validate.OneOf(
            [
                "kg",
                "gram",
                "tonne",
                "litre",
                "piece",
                "crate",
                "bag",
                "bunch",
            ]
        )
    )

    budget = fields.Decimal(
        required=False,
        allow_none=True,
        as_string=True,
        validate=validate.Range(min=0.01)
    )

    location = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150)
    )

    required_date=fields.Date(
        allow_none=True
    )

    status=fields.Str(
        dump_only=True,
        validate=validate.OneOf(
            ["open", "matched", "fulfilled", "cancelled"]
        )
    )

class RequestResponseSchema(Schema):
    response_id = fields.Int(dump_only=True)
    request_id = fields.Int(dump_only=True)
    farmer_id = fields.Int(dump_only=True)

    message = fields.Str(allow_none=True)

    offered_price = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01)
    )

    available_quantity = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.001)
    )

    status = fields.Str(
        dump_only=True,
        validate=validate.OneOf(["pending", "accepted", "rejected"])
    )
