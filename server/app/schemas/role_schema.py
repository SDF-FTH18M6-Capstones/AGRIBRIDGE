from marshmallow import Schema, fields, validate

class RoleSchema(Schema):
    role_id = fields.Int(dump_only=True)

    role_name = fields.Str(
        required=True,
        validate=[
            validate.Length(min=2, max=50),
            validate.OneOf(
                ["admin", "farmer", "buyer", "field_officer"],
                error="Role must be admin, farmer, buyer or field_officer."
            )
        ]
    )

    description = fields.Str(
        allow_none=True
    )
