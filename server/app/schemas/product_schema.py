from marshmallow import Schema, fields,validate

class ProductSchema(Schema):
    product_id = fields.Int(dump_only=True)
    farmer_id = fields.Int(dump_only=True)
    category_id = fields.Int(
        required=True,
        strict=True
    )

    product_name = fields.Str(
        required=True,
        validate=validate.Length(min=2,max=100)
    )

    description = fields.Str(
        allow_none=True
    )

    price=fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01)
    )

    quantity_available = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.001)
    )

    unit = fields.Str(
        required=True,
        validate=validate.OneOf(
            [
                "kg",
                "gram"
                "tonne",
                "litre",
                "piece",
                "crate",
                "bag",
                "bunch",
            ]
        )
    )

    quality = fields.Str(
        allow_none=True
    )

    availability_date = fields.Date(
        allow_none=True
    )

    status = fields.Str(
        required=True,
        validate=validate.OneOf(
            ["available", "unavailable"]
        )
    )

class ProductImageSchema(Schema):
        image_id = fields.Int(dump_only=True)
        product_id = fields.Int(dump_only=True)

        image_url = fields.Url(
            required=True
        )