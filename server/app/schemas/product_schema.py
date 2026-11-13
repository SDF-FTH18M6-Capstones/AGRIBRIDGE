
from marshmallow import Schema, fields, validate, validates_schema, ValidationError


class ProductSchema(Schema):
    """Validate incoming product data."""

    name = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100)
    )

    category = fields.String(
        required=True,
        validate=validate.Length(min=1, max=50)
    )

    price = fields.Float(
        required=True,
        validate=validate.Range(min=0.01)
    )

    quantity = fields.Float(
        required=True,
        validate=validate.Range(min=0)
    )

    unit = fields.String(
        required=True,
        validate=validate.OneOf([
            "kg", "g", "tonnes", "pieces", "bags"
        ])
    )

    @validates_schema
    def validate_text_fields(self, data, **kwargs):
        for field in ("name", "category"):
            if field in data and not data[field].strip():
                raise ValidationError(
                    {field: ["Field cannot be empty or whitespace."]}
                )


product_schema = ProductSchema()
