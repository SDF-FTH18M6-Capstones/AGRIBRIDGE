from marshmallow import Schema, fields,validate

class FarmerProfileSchema(Schema):
    farmer_id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)

    farm_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150)
    )

    location = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150)
    )

    description = fields.Str(
        allow_none=True
    )

class BuyerProfileSchema(Schema):
    buyer_id = fields.Int(dump_only=True)
    user_id = fields.Int(dump_only=True)

    business_name = fields.Str(
        allow_none=True,
        validate=validate.Length(max=150) 
    )

    buyer_type = fields.Str(
        required=True,
        validate=validate.OneOf(
            [
                "retailer",
                "wholesaler",
                "individual",
                "restaurant",
            ],
            error="Select a valid buyer type."
        )
    )

    location = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=150)
    )