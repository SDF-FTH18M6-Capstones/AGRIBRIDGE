from marshmallow import Schema, fields, validate

class UserSchema(Schema):
    user_id = fields.Int(dump_only=True)

    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
    )

    email = fields.Email(
        required=True
    )

    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=8),
    )

    phone_number = fields.Str(
        allow_none=True,
        validate=validate.Regexp(r"^(?:\+254|254|0)7\d{8}$",
                                 error="Enter a valid Kenyan mobile number."
                                 )
    )

    role = fields.Str(
        required=True,
        validate=validate.OneOf(
            ["farmer", "buyer"],
            error="Role must be either farmer or buyer."
        )
    )