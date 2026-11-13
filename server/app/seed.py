from extensions import db
from models import (
    User, FarmerProfile, BuyerProfile, Category, Product,
    ProductImage, BuyerRequest, RequestResponse, Order, OrderItem, Payment, Review
)
from datetime import date
from decimal import Decimal

def seed_database(app):
    with app.app_context():
        print("🌱 Seeding AGRIBRIDGE database...")
        Review.query.delete()
        Payment.query.delete()
        OrderItem.query.delete()
        Order.query.delete()
        RequestResponse.query.delete()
        BuyerRequest.query.delete()
        ProductImage.query.delete()
        Product.query.delete()
        BuyerProfile.query.delete()
        FarmerProfile.query.delete()
        Category.query.delete()
        User.query.delete()
        db.session.commit()
        cat_cereals = Category(category_name="Cereals & Grains", description="Maize, wheat, and rice")
        cat_horticulture = Category(category_name="Horticulture", description="Fresh fruits and vegetables")
        db.session.add_all([cat_cereals, cat_horticulture])
        db.session.commit()
        user_farmer = User(
            full_name="John Kiprop",
            email="farmer.john@agribridge.com",
            password_hash="hashed_pass_123",
            phone_number="+254712345678",
            role="farmer"
        )
        user_buyer = User(
            full_name="Amina Mohamed",
            email="buyer.amina@agribridge.com",
            password_hash="hashed_pass_456",
            phone_number="+254798765432",
            role="buyer"
        )
        db.session.add_all([user_farmer, user_buyer])
        db.session.commit()
        farmer_profile = FarmerProfile(
            user_id=user_farmer.user_id,
            farm_name="Rift Valley Green Farm",
            location="Nakuru",
            description="Organic maize and legume production."
        )
        buyer_profile = BuyerProfile(
            user_id=user_buyer.user_id,
            business_name="Amina Fresh Foods Ltd",
            buyer_type="Wholesaler",
            location="Nairobi"
        )
        db.session.add_all([farmer_profile, buyer_profile])
        db.session.commit()
        product = Product(
            farmer_id=farmer_profile.farmer_id,
            category_id=cat_cereals.category_id,
            product_name="Dry Grade 1 White Maize",
            description="Clean, well-dried white maize harvested this season.",
            price=Decimal("45.50"),
            quantity_available=Decimal("1500.000"),
            unit="kg",
            quality="Grade 1",
            availability_date=date(2026, 11, 20),
            status="Available"
        )
        db.session.add(product)
        db.session.commit()
        image = ProductImage(
            product_id=product.product_id,
            image_url="https://images.example.com/maize.jpg"
        )
        db.session.add(image)
        db.session.commit()
        print("✅ Database seeding completed successfully!")

if __name__ == "__main__":
    from app import app
    seed_database(app)