from sqlalchemy import Numeric
from extensions import db


class User(db.Model):
    __tablename__ = "users"
    user_id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.Text, nullable=False)
    email = db.Column(db.Text, nullable=False, unique=True)
    password_hash = db.Column(db.Text, nullable=False)
    phone_number = db.Column(db.Text, unique=True)
    role = db.Column(db.Text, nullable=False)

    farmer_profile = db.relationship("FarmerProfile", back_populates="user", uselist=False)
    buyer_profile = db.relationship("BuyerProfile", back_populates="user", uselist=False)


class FarmerProfile(db.Model):
    __tablename__ = "farmer_profiles"
    farmer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False, unique=True)
    farm_name = db.Column(db.Text, nullable=False)
    location = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)

    user = db.relationship("User", back_populates="farmer_profile")
    products = db.relationship("Product", back_populates="farmer")
    request_responses = db.relationship("RequestResponse", back_populates="farmer")
    orders = db.relationship("Order", back_populates="farmer")


class BuyerProfile(db.Model):
    __tablename__ = "buyer_profiles"
    buyer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False, unique=True)
    business_name = db.Column(db.Text)
    buyer_type = db.Column(db.Text, nullable=False)
    location = db.Column(db.Text, nullable=False)

    user = db.relationship("User", back_populates="buyer_profile")
    requests = db.relationship("BuyerRequest", back_populates="buyer")
    orders = db.relationship("Order", back_populates="buyer")


class Category(db.Model):
    __tablename__ = "categories"
    category_id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.Text, nullable=False, unique=True)
    description = db.Column(db.Text)

    products = db.relationship("Product", back_populates="category")
    buyer_requests = db.relationship("BuyerRequest", back_populates="category")


class Product(db.Model):
    __tablename__ = "products"
    product_id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmer_profiles.farmer_id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"), nullable=False)
    product_name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    price = db.Column(Numeric(12, 2), nullable=False)
    quantity_available = db.Column(Numeric(12, 3), nullable=False)
    unit = db.Column(db.Text, nullable=False)
    quality = db.Column(db.Text)
    availability_date = db.Column(db.Date)
    status = db.Column(db.Text, nullable=False)

    farmer = db.relationship("FarmerProfile", back_populates="products")
    category = db.relationship("Category", back_populates="products")
    images = db.relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    order_items = db.relationship("OrderItem", back_populates="product")


class ProductImage(db.Model):
    __tablename__ = "product_images"
    image_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.product_id"), nullable=False)
    image_url = db.Column(db.Text, nullable=False)

    product = db.relationship("Product", back_populates="images")


class BuyerRequest(db.Model):
    __tablename__ = "buyer_requests"
    request_id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyer_profiles.buyer_id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.category_id"), nullable=False)
    product_name = db.Column(db.Text, nullable=False)
    quantity = db.Column(Numeric(12, 3), nullable=False)
    unit = db.Column(db.Text, nullable=False)
    budget = db.Column(Numeric(12, 2))
    location = db.Column(db.Text, nullable=False)
    required_date = db.Column(db.Date)
    status = db.Column(db.Text, nullable=False)

    buyer = db.relationship("BuyerProfile", back_populates="requests")
    category = db.relationship("Category", back_populates="buyer_requests")
    responses = db.relationship("RequestResponse", back_populates="request", cascade="all, delete-orphan")


class RequestResponse(db.Model):
    __tablename__ = "request_responses"
    response_id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("buyer_requests.request_id"), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmer_profiles.farmer_id"), nullable=False)
    message = db.Column(db.Text)
    offered_price = db.Column(Numeric(12, 2), nullable=False)
    available_quantity = db.Column(Numeric(12, 3), nullable=False)
    status = db.Column(db.Text, nullable=False)

    request = db.relationship("BuyerRequest", back_populates="responses")
    farmer = db.relationship("FarmerProfile", back_populates="request_responses")


class Order(db.Model):
    __tablename__ = "orders"
    order_id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyer_profiles.buyer_id"), nullable=False)
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmer_profiles.farmer_id"), nullable=False)
    total_amount = db.Column(Numeric(12, 2), nullable=False)
    order_status = db.Column(db.Text, nullable=False)

    buyer = db.relationship("BuyerProfile", back_populates="orders")
    farmer = db.relationship("FarmerProfile", back_populates="orders")
    items = db.relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = db.relationship("Payment", back_populates="order", cascade="all, delete-orphan")
    review = db.relationship("Review", back_populates="order", uselist=False, cascade="all, delete-orphan")


class OrderItem(db.Model):
    __tablename__ = "order_items"
    order_item_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.product_id"), nullable=False)
    quantity = db.Column(Numeric(12, 3), nullable=False)
    unit_price = db.Column(Numeric(12, 2), nullable=False)
    subtotal = db.Column(Numeric(12, 2), nullable=False)

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product", back_populates="order_items")


class Payment(db.Model):
    __tablename__ = "payments"
    payment_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False)
    payment_method = db.Column(db.Text, nullable=False)
    transaction_reference = db.Column(db.Text, unique=True)
    amount = db.Column(Numeric(12, 2), nullable=False)
    payment_status = db.Column(db.Text, nullable=False)
    paid_at = db.Column(db.DateTime)

    order = db.relationship("Order", back_populates="payments")


class Review(db.Model):
    __tablename__ = "reviews"
    review_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False, unique=True)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)

    order = db.relationship("Order", back_populates="review")