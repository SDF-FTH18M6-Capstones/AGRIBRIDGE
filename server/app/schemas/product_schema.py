from marshmallow import (
    Schema,
    fields,
    validate,
    validates_schema,
    ValidationError,
)


class ProductSchema(Schema):
    product_id = fields.Int(dump_only=True)
    farmer_id = fields.Int(dump_only=True)

    category_id = fields.Int(
        required=True,
        strict=True,
    )

    product_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
    )

    description = fields.Str(allow_none=True)

    price = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01),
    )

    quantity_available = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.001),
    )

    unit = fields.Str(
        required=True,
        validate=validate.OneOf([
            "kg",
            "gram",
            "tonne",
            "litre",
            "piece",
            "crate",
            "bag",
            "bunch",
        ]),
    )

    quality = fields.Str(allow_none=True)
    availability_date = fields.Date(allow_none=True)

    status = fields.Str(
        required=True,
        validate=validate.OneOf([
            "available",
            "sold_out",
            "inactive"
        ]),
    )


class ProductCRUDSchema(Schema):
    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100),
    )

    category = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=50),
    )

    price = fields.Float(
        required=True,
        validate=validate.Range(min=0.01),
    )

    quantity = fields.Float(
        required=True,
        validate=validate.Range(min=0),
    )

    unit = fields.Str(
        required=True,
        validate=validate.OneOf([
            "kg",
            "g",
            "tonnes",
            "pieces",
            "bags",
        ]),
    )

    @validates_schema
    def validate_text_fields(self, data, **kwargs):
        errors = {}

        for field in ("name", "category"):
            if field in data and not data[field].strip():
                errors[field] = [
                    "Field cannot be empty or whitespace."
                ]

        if errors:
            raise ValidationError(errors)


class ProductImageSchema(Schema):
    image_id = fields.Int(dump_only=True)
    product_id = fields.Int(dump_only=True)

    image_url = fields.Url(required=True)


product_schema = ProductCRUDSchema()

class ProductSearchSchema(Schema):
    product_id = fields.Int()
    product_name = fields.Str()
    description = fields.Str(allow_none=True)
    price = fields.Decimal(as_string=True)
    quantity_available = fields.Decimal(as_string=True)
    unit = fields.Str()
    quality = fields.Str(allow_none=True)
    availability_date = fields.Date(allow_none=True)
    status = fields.Str()

    category_id = fields.Int()
    category_name = fields.Method("get_category_name")

    farmer_id = fields.Int()
    farm_name = fields.Method("get_farm_name")
    farmer_location = fields.Method("get_farmer_location")

    def get_category_name(self, product):
        return product.category.category_name if product.category else None

    def get_farm_name(self, product):
        return product.farmer.farm_name if product.farmer else None

    def get_farmer_location(self, product):
        return product.farmer.location if product.farmer else None


product_search_schema = ProductSearchSchema(many=True)