from extensions import db
from flask_bcrypt import generate_password_hash
from models import (
    User, FarmerProfile, BuyerProfile, Category, Product,
    ProductImage, BuyerRequest, RequestResponse, Order,
    OrderItem, Payment, Review
)
from datetime import date, datetime
from decimal import Decimal


def seed_database(app):
    with app.app_context():
        print("Seeding AGRIBRIDGE database...")

        try:
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

            db.session.flush()

            cat_cereals = Category(
                category_name="Cereals & Grains",
                description="Maize, wheat, and rice"
            )

            cat_horticulture = Category(
                category_name="Horticulture",
                description="Fresh fruits and vegetables"
            )

            db.session.add_all([cat_cereals, cat_horticulture])
            db.session.flush()

            user_farmer = User(
                full_name="John Kiprop",
                email="farmer.john@agribridge.com",
                password_hash=generate_password_hash("Farmer123!").decode("utf-8"),
                phone_number="+254712345678",
                role="farmer"
            )

            user_buyer = User(
                full_name="Amina Mohamed",
                email="buyer.amina@agribridge.com",
                password_hash=generate_password_hash("Buyer123!").decode("utf-8"),
                phone_number="+254798765432",
                role="buyer"
            )

            db.session.add_all([user_farmer, user_buyer])
            db.session.flush()

            farmer_profile = FarmerProfile(
                user_id=user_farmer.user_id,
                farm_name="Rift Valley Green Farm",
                location="Nakuru",
                description="Organic maize and legume production."
            )

            buyer_profile = BuyerProfile(
                user_id=user_buyer.user_id,
                business_name="Amina Fresh Foods Ltd",
                buyer_type="wholesaler",
                location="Nairobi"
            )

            db.session.add_all([farmer_profile, buyer_profile])
            db.session.flush()

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
                status="available"
            )

            db.session.add(product)
            db.session.flush()

            image = ProductImage(
                product_id=product.product_id,
                image_url="https://images.example.com/maize.jpg"
            )

            buyer_request = BuyerRequest(
                buyer_id=buyer_profile.buyer_id,
                category_id=cat_cereals.category_id,
                product_name="White Maize",
                quantity=Decimal("500.000"),
                unit="kg",
                budget=Decimal("25000.00"),
                location="Nairobi",
                required_date=date(2026, 11, 25),
                status="open"
            )

            db.session.add_all([image, buyer_request])
            db.session.flush()

            response = RequestResponse(
                request_id=buyer_request.request_id,
                farmer_id=farmer_profile.farmer_id,
                message="We have quality Grade 1 white maize available.",
                offered_price=Decimal("45.00"),
                available_quantity=Decimal("500.000"),
                status="pending"
            )

            db.session.add(response)
            db.session.flush()

            order = Order(
                buyer_id=buyer_profile.buyer_id,
                farmer_id=farmer_profile.farmer_id,
                total_amount=Decimal("22750.00"),
                order_status="pending"
            )

            db.session.add(order)
            db.session.flush()

            order_item = OrderItem(
                order_id=order.order_id,
                product_id=product.product_id,
                quantity=Decimal("500.000"),
                unit_price=Decimal("45.50"),
                subtotal=Decimal("22750.00")
            )

            payment = Payment(
                order_id=order.order_id,
                payment_method="mpesa",
                transaction_reference="AGRIBRIDGE-TEST-001",
                amount=Decimal("22750.00"),
                payment_status="pending",
                paid_at=None
            )

            db.session.add_all([order_item, payment])
            db.session.flush()

            review = Review(
                order_id=order.order_id,
                rating=5,
                comment="Good quality maize and reliable service."
            )

            db.session.add(review)

            db.session.commit()

            print("Database seeding completed successfully!")

        except Exception:
            db.session.rollback()
            raise


if __name__ == "__main__":
    from app import app
    seed_database(app)