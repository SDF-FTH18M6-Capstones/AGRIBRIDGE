from marshmallow import Schema, fields, validate

class FarmerVerificationSchema(Schema):

    verification_id = fields.Int(dump_only=True)
    farmer_id = fields.Int(required=True)
    field_officer_id = fields.Int(allow_none=True)
    assigned_by_admin_id = fields.Int(dump_only=True)

    recommendation = fields.Str(
        allow_none=True,
        validate=validate.OneOf(
            ["approve", "reject"],
            error="Recommendation must be approve or reject."
        )
    )

    status = fields.Str(dump_only=True)
    farm_location = fields.Str(allow_none=True)
    visit_date = fields.DateTime(allow_none=True)
    remarks = fields.Str(allow_none=True)
    evidence_url = fields.Str(allow_none=True)

    reviewed_by_admin_id = fields.Int(dump_only=True)
    reviewed_at = fields.DateTime(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
