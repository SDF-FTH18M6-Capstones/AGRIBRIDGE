"""Repeatable sample data for local AgriBridge development."""

from datetime import date, datetime, timedelta
from decimal import Decimal

import click
from sqlalchemy import select
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import (
    BuyerProfile,
    BuyerRequest,
    Category,
    FarmerProfile,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductImage,
    RequestResponse,
    Review,
    User,
)


SEED_PASSWORD = "AgriBridge123!"


def _upsert(model, lookup, values):
    """Find a sample record by its stable key, inserting or refreshing it."""
    record = db.session.scalar(select(model).filter_by(**lookup))
    if record is None:
        record = model(**lookup, **values)
        db.session.add(record)
    else:
        for field, value in values.items():
            setattr(record, field, value)
    db.session.flush()
    return record


def seed_database():
    """Populate the current database without deleting existing records."""
    people = (
        ("Amina Wanjiku", "amina.farmer@example.com", "+254700100101", "farmer"),
        ("Peter Mwangi", "peter.farmer@example.com", "+254700100102", "farmer"),
        ("Grace Njeri", "grace.buyer@example.com", "+254700100103", "buyer"),
        ("Kisumu Fresh Market", "kisumu.buyer@example.com", "+254700100104", "buyer"),
        ("AgriBridge Admin", "admin@example.com", "+254700100100", "admin"),
    )
    users = {}
    for full_name, email, phone, role in people:
        user = db.session.scalar(select(User).filter_by(email=email))
        if user is None:
            user = User(
                full_name=full_name,
                email=email,
                phone_number=phone,
                role=role,
                password_hash=generate_password_hash(SEED_PASSWORD),
            )
            db.session.add(user)
            db.session.flush()
        else:
            user.full_name = full_name
            user.phone_number = phone
            user.role = role
        users[email] = user

    farmer_data = (
        ("amina", "amina.farmer@example.com", "Green Valley Farm", "Limuru, Kiambu",
         "Family farm growing fresh vegetables with sustainable practices."),
        ("peter", "peter.farmer@example.com", "Lakeview Produce Farm", "Ahero, Kisumu",
         "Smallholder farm supplying seasonal produce from the Lake Victoria basin."),
    )
    farmers = {
        key: _upsert(
            FarmerProfile,
            {"user_id": users[email].user_id},
            {"farm_name": farm_name, "location": location, "description": description},
        )
        for key, email, farm_name, location, description in farmer_data
    }
    buyer_data = (
        ("grace", "grace.buyer@example.com", "Nairobi Table Restaurant", "restaurant", "Westlands, Nairobi"),
        ("market", "kisumu.buyer@example.com", "Kisumu Fresh Market", "retailer", "Kisumu, Kisumu County"),
    )
    buyers = {
        key: _upsert(
            BuyerProfile,
            {"user_id": users[email].user_id},
            {"business_name": business, "buyer_type": buyer_type, "location": location},
        )
        for key, email, business, buyer_type, location in buyer_data
    }

    category_data = (
        ("Vegetables", "Fresh leafy and garden vegetables"),
        ("Fruits", "Fresh seasonal fruit"),
        ("Grains", "Cereals and staple grains"),
        ("Roots & Tubers", "Root vegetables and tubers"),
    )
    categories = {
        name: _upsert(Category, {"category_name": name}, {"description": description})
        for name, description in category_data
    }

    product_data = (
        ("amina", "Tomatoes", "Vegetables", "Ripe tomatoes harvested this week.", "85.00", "120.000", "kg", "Grade A", "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800"),
        ("amina", "Kale (Sukuma Wiki)", "Vegetables", "Freshly cut tender sukuma wiki leaves.", "45.00", "80.000", "bunch", "Grade A", "https://images.unsplash.com/photo-1515543904379-3d757ffeee2e?w=800"),
        ("amina", "Red Onions", "Vegetables", "Well-cured red onions, medium size.", "110.00", "65.000", "kg", "Grade A", "https://images.unsplash.com/photo-1508747703725-719777637510?w=800"),
        ("peter", "Sweet Bananas", "Fruits", "Naturally ripened bananas, sold by weight.", "70.00", "100.000", "kg", "Grade A", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800"),
        ("peter", "Dry Maize", "Grains", "Clean, well-dried maize suitable for milling.", "62.00", "500.000", "kg", "Grade A", "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=800"),
        ("peter", "Irish Potatoes", "Roots & Tubers", "Fresh medium-sized potatoes from the latest harvest.", "55.00", "200.000", "kg", "Grade A", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800"),
    )
    products = {}
    for farmer_key, name, category, description, price, quantity, unit, quality, image_url in product_data:
        product = _upsert(
            Product,
            {"farmer_id": farmers[farmer_key].farmer_id, "product_name": name},
            {"category_id": categories[category].category_id,
             "description": description, "price": Decimal(price),
             "quantity_available": Decimal(quantity), "unit": unit,
             "quality": quality, "availability_date": date.today(), "status": "available"},
        )
        products[name] = product
        _upsert(
            ProductImage,
            {"product_id": product.product_id,
             "image_url": image_url},
            {},
        )

    request = _upsert(
        BuyerRequest,
        {"buyer_id": buyers["grace"].buyer_id, "product_name": "Fresh tomatoes"},
        {"category_id": categories["Vegetables"].category_id,
         "quantity": Decimal("40.000"), "unit": "kg", "budget": Decimal("3800.00"),
         "location": "Westlands, Nairobi", "required_date": date.today() + timedelta(days=7),
         "status": "open"},
    )
    _upsert(
        RequestResponse,
        {"request_id": request.request_id, "farmer_id": farmers["amina"].farmer_id},
        {"message": "We can deliver freshly harvested Grade A tomatoes to Westlands.",
         "offered_price": Decimal("80.00"), "available_quantity": Decimal("40.000"),
         "status": "pending"},
    )

    order = _upsert(
        Order,
        {"buyer_id": buyers["market"].buyer_id, "farmer_id": farmers["peter"].farmer_id},
        {"total_amount": Decimal("1400.00"), "order_status": "delivered"},
    )
    _upsert(
        OrderItem,
        {"order_id": order.order_id, "product_id": products["Sweet Bananas"].product_id},
        {"quantity": Decimal("20.000"), "unit_price": Decimal("70.00"),
         "subtotal": Decimal("1400.00")},
    )
    _upsert(
        Payment,
        {"transaction_reference": "AGRIBRIDGE-SEED-PAYMENT-001"},
        {"order_id": order.order_id, "payment_method": "M-Pesa",
         "amount": Decimal("1400.00"), "payment_status": "completed",
         "paid_at": datetime.utcnow() - timedelta(days=1)},
    )
    _upsert(
        Review,
        {"order_id": order.order_id},
        {"rating": 5, "comment": "Fresh bananas, delivered on time. We will order again."},
    )
    db.session.commit()


def register_seed_command(app):
    @app.cli.command("seed")
    def seed_command():
        """Create missing tables and add repeatable local sample data."""
        try:
            db.create_all()
            seed_database()
        except Exception:
            db.session.rollback()
            raise
        click.echo(f"Sample data is ready. Demo password: {SEED_PASSWORD}")
