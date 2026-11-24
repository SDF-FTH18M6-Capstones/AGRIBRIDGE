from marshmallow import Schema, fields, validate, validates, ValidationError

class FieldOfficerSchema(Schema):

    field_officer_id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)
    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100)
    )
    email = fields.Email(required=True)
    phone_number = fields.Str(
        required=True,
        validate=validate.Regexp(
            r"^(?:\+254|254|0)7\d{8}$"
        )
    )
    password = fields.Str(
        required=True,
        load_only=True,
        validate=validate.Length(min=8)
    )
    staff_number = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=50)
    )
    status = fields.Str(dump_only=True)

    @validates('password')
    def strong_password(self, value, **kwargs):
        from app.services.passwords import password_errors
        errors = password_errors(value)
        if errors:
            raise ValidationError(errors)
