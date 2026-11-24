from marshmallow import Schema, fields, validate, validates, validates_schema, ValidationError


class UserSchema(Schema):
    user_id = fields.Int(dump_only=True)

    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
    )

    email = fields.Email(required=True)

    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=8),
    )

    confirm_password = fields.Str(load_only=True)

    @validates_schema
    def passwords_match(self, data, **kwargs):
        if data.get("confirm_password") is not None and data["confirm_password"] != data.get("password"):
            raise ValidationError({"confirm_password":["Passwords do not match."]})

    phone_number = fields.Str(
        allow_none=True,
        load_default=None,
        validate=validate.Regexp(
            r"^(?:\+254|254|0)[17]\d{8}$",
            error="Enter a valid Kenyan mobile number.",
        ),
    )

    role = fields.Str(
        allow_none=True,
        load_default=None,
        validate=validate.OneOf(
            ["farmer", "buyer"],
            error="Role must be either farmer or buyer.",
        ),
    )

    @validates("password")
    def validate_password_bytes(self, value, **kwargs):
        from app.services.passwords import password_errors
        errors = password_errors(value)
        if errors:
            raise ValidationError(errors)

    @validates("full_name")
    def validate_name(self, value, **kwargs):
        if len(value.strip()) < 2:
            raise ValidationError("Enter your full name.")
