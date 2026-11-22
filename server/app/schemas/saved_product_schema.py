from marshmallow import Schema, fields, validate

from app.schemas.product_schema import product_schema


class SavedProductSchema(Schema):
    saved_product_id = fields.Int(dump_only=True)

    product_id = fields.Int(
        required=True,
        strict=True,
        validate=validate.Range(min=1),
    )

    created_at = fields.DateTime(dump_only=True)

    product = fields.Nested(
        product_schema,
        dump_only=True,
    )


saved_product_schema = SavedProductSchema()
saved_product_list_schema = SavedProductSchema(many=True)
