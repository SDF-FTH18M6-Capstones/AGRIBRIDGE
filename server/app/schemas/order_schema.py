from marshmallow import Schema, fields,validate

class OrderSchema(Schema):
    order_id = fields.Int(dump_only=True)
    buyer_id = fields.Int(dump_only=True)
    farmer_id = fields.Int(dump_only=True)

    total_amount = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01)    
    )

    order_status=fields.Str(
        dump_only=True,
        validate=validate.OneOf(
            [
                "pending",
                "confirmed",
                "processing",
                "cancelled",
                "delivered",
            ]
        )
    )

class OrderItemsSchema(Schema):
    order_item_id = fields.Int(dump_only=True)
    order_id = fields.Int(dump_only=True)
    product_id = fields.Int(
        required=True,
        strict=True
    )

    quantity = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.001)
    )

    unit_price = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01)
    )

    subtotal = fields.Decimal(
        dump_only=True,
        as_string=True
    )