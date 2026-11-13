from marshmallow import Schema, fields,validate

class CategorySchema(Schema):
    category_id = fields.Int(dump_only=True)

    category_name=fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )

    description=fields.Str(
        allow_none=True
    )