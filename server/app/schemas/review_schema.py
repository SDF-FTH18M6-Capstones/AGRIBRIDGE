from marshmallow import Schema, fields, validate

class ReviewSchema(Schema):
    review_id = fields.Int(dump_only=True)

    order_id = fields.Int(
        required=True,
        strict=True
    )

    rating = fields.Int(
        required=True,
        strict=True,
        validate=validate.Range(min=1, max=5)
    )

    comment = fields.Str(
        allow_none=True,
        validate=validate.Length(max=100)
    )
