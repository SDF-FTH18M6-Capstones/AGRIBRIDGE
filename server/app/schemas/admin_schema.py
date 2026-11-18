from marshmallow import Schema, fields

class AdminSchema(Schema):
    admin_id = fields.Int(dump_only=True)

    user_id = fields.Int(dump_only=True)

    status = fields.Str(dump_only=True)
