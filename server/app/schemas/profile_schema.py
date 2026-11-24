from marshmallow import Schema, fields, validate, validates_schema, ValidationError

class ProfileBase(Schema):
    county_code = fields.Str(allow_none=True)
    subcounty_code = fields.Str(allow_none=True)
    town = fields.Str(allow_none=True, validate=validate.Length(max=150))
    @validates_schema
    def normalize_text(self, data, **kwargs):
        for key in ("farm_name", "location"):
            if key in data:
                data[key] = data[key].strip()
                if len(data[key]) < 2:
                    raise ValidationError({key: ["Enter at least two non-space characters."]})
        if isinstance(data.get("business_name"), str):
            data["business_name"] = data["business_name"].strip() or None


class FarmerProfileSchema(ProfileBase):
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

    ward_code = fields.Str(allow_none=True)
    directions = fields.Str(allow_none=True, validate=validate.Length(max=1000))
    landmark = fields.Str(allow_none=True, validate=validate.Length(max=200))
    latitude = fields.Float(allow_none=True)
    longitude = fields.Float(allow_none=True)
    land_tenure = fields.Str(allow_none=True, validate=validate.OneOf(['owner','lease','family']))
    description = fields.Str(
        allow_none=True
    )

class BuyerProfileSchema(ProfileBase):
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