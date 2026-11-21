
from datetime import datetime

from sqlalchemy import CheckConstraint, Numeric, UniqueConstraint
from sqlalchemy.orm import validates

from app.extensions import db, bcrypt


MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_BYTES = 72

ADMIN_STATUSES = ("active", "suspended")
PRODUCT_STATUSES = ("available", "sold_out", "inactive")
REQUEST_STATUSES = ("open", "fulfilled", "closed", "cancelled")
RESPONSE_STATUSES = ("pending", "accepted", "rejected", "withdrawn")
ORDER_STATUSES = (
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
)
PAYMENT_STATUSES = ("pending", "paid", "failed", "refunded")


def _in(column, values):
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class TimestampMixin:
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
        onupdate=db.func.now(),
    )


class Role(db.Model):
    __tablename__ = "roles"

    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.Text, nullable=False, unique=True)
    description = db.Column(db.Text)

    users = db.relationship("User", back_populates="role")


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.Text, nullable=False)
    email = db.Column(db.Text, nullable=False, unique=True)
    password_hash = db.Column(db.Text, nullable=False)
    phone_number = db.Column(db.Text, unique=True)
    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.role_id"),
        nullable=True,
        index=True,
    )

    role = db.relationship("Role", back_populates="users")
    farmer_profile = db.relationship(
        "FarmerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    buyer_profile = db.relationship(
        "BuyerProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    admin_profile = db.relationship(
        "Admin",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    field_officer = db.relationship(
        "FieldOfficer",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @validates("email")
    def normalize_email(self, key, value):
        if not isinstance(value, str):
            raise ValueError("Email must be a string.")
        return value.strip().lower()

    @validates("phone_number")
    def normalize_phone(self, key, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Phone number must be a string.")
        value = value.strip()
        return value or None

    def set_password(self, password):
        if not isinstance(password, str):
            raise ValueError("Password must be a string.")
        if len(password) < MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Password must be at least {MIN_PASSWORD_LENGTH} characters long."
            )
        if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError(
                f"Password must not exceed {MAX_PASSWORD_BYTES} bytes."
            )

        self.password_hash = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")

    def check_password(self, password):
        if not isinstance(password, str) or not password:
            return False
        if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
            return False
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(
            self.password_hash,
            password,
        )


class Admin(TimestampMixin, db.Model):
    __tablename__ = "admins"

    admin_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )
    status = db.Column(
        db.Text,
        nullable=False,
        default="active",
        server_default="active",
    )

    __table_args__ = (
        CheckConstraint(
            _in("status", ADMIN_STATUSES),
            name="check_admin_status",
        ),
    )

    user = db.relationship("User", back_populates="admin_profile")
    assigned_verifications = db.relationship(
        "FarmerVerification",
        foreign_keys="FarmerVerification.assigned_by_admin_id",
        back_populates="assigned_by_admin",
    )
    reviewed_verifications = db.relationship(
        "FarmerVerification",
        foreign_keys="FarmerVerification.reviewed_by_admin_id",
        back_populates="reviewed_by_admin",
    )


class FarmerProfile(db.Model):
    __tablename__ = "farmer_profiles"

    farmer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )
    farm_name = db.Column(db.Text, nullable=False)
    location = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    verification_status = db.Column(
        db.Text,
        nullable=False,
        default="pending",
    )

    user = db.relationship("User", back_populates="farmer_profile")
    products = db.relationship("Product", back_populates="farmer")
    request_responses = db.relationship(
        "RequestResponse",
        back_populates="farmer",
    )
    orders = db.relationship("Order", back_populates="farmer")
    verifications = db.relationship(
        "FarmerVerification",
        back_populates="farmer",
        cascade="all, delete-orphan",
    )


class BuyerProfile(db.Model):
    __tablename__ = "buyer_profiles"

    buyer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )
    business_name = db.Column(db.Text)
    buyer_type = db.Column(db.Text, nullable=False)
    location = db.Column(db.Text, nullable=False)

    user = db.relationship("User", back_populates="buyer_profile")
    requests = db.relationship("BuyerRequest", back_populates="buyer")
    orders = db.relationship("Order", back_populates="buyer")


class FieldOfficer(db.Model):
    __tablename__ = "field_officers"

    field_officer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )
    staff_number = db.Column(
        db.Text,
        nullable=False,
        unique=True,
    )
    status = db.Column(
        db.Text,
        nullable=False,
        default="active",
    )

    user = db.relationship("User", back_populates="field_officer")
    verifications = db.relationship(
        "FarmerVerification",
        foreign_keys="FarmerVerification.field_officer_id",
        back_populates="field_officer",
    )


class FarmerVerification(db.Model):
    __tablename__ = "farmer_verifications"

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'assigned', 'submitted', 'approved', 'rejected')",
            name="check_verification_status",
        ),
        CheckConstraint(
            "recommendation IS NULL OR recommendation IN ('approve', 'reject')",
            name="check_verification_recommendation",
        ),
    )

    verification_id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmer_profiles.farmer_id"),
        nullable=False,
    )
    field_officer_id = db.Column(
        db.Integer,
        db.ForeignKey("field_officers.field_officer_id"),
        nullable=True,
    )
    assigned_by_admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.admin_id"),
        nullable=True,
    )
    recommendation = db.Column(db.Text)
    status = db.Column(
        db.Text,
        nullable=False,
        default="pending",
    )
    farm_location = db.Column(db.Text)
    visit_date = db.Column(db.DateTime)
    remarks = db.Column(db.Text)
    evidence_url = db.Column(db.Text)
    reviewed_by_admin_id = db.Column(
        db.Integer,
        db.ForeignKey("admins.admin_id"),
        nullable=True,
    )
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    farmer = db.relationship(
        "FarmerProfile",
        back_populates="verifications",
    )
    field_officer = db.relationship(
        "FieldOfficer",
        foreign_keys=[field_officer_id],
        back_populates="verifications",
    )
    assigned_by_admin = db.relationship(
        "Admin",
        foreign_keys=[assigned_by_admin_id],
        back_populates="assigned_verifications",
    )
    reviewed_by_admin = db.relationship(
        "Admin",
        foreign_keys=[reviewed_by_admin_id],
        back_populates="reviewed_verifications",
    )


class Category(db.Model):
    __tablename__ = "categories"

    category_id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.Text, nullable=False, unique=True)
    description = db.Column(db.Text)

    products = db.relationship("Product", back_populates="category")
    buyer_requests = db.relationship(
        "BuyerRequest",
        back_populates="category",
    )


class Product(TimestampMixin, db.Model):
    __tablename__ = "products"

    product_id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmer_profiles.farmer_id"),
        nullable=False,
        index=True,
    )
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.category_id"),
        nullable=False,
        index=True,
    )
    product_name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    price = db.Column(Numeric(12, 2), nullable=False)
    quantity_available = db.Column(Numeric(12, 3), nullable=False)
    unit = db.Column(db.Text, nullable=False)
    quality = db.Column(db.Text)
    availability_date = db.Column(db.Date)
    status = db.Column(
        db.Text,
        nullable=False,
        default="available",
        server_default="available",
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "price > 0",
            name="check_product_price_positive",
        ),
        CheckConstraint(
            "quantity_available >= 0",
            name="check_product_quantity_not_negative",
        ),
        CheckConstraint(
            _in("status", PRODUCT_STATUSES),
            name="check_product_status",
        ),
    )

    farmer = db.relationship("FarmerProfile", back_populates="products")
    category = db.relationship("Category", back_populates="products")
    images = db.relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
    )
    order_items = db.relationship(
        "OrderItem",
        back_populates="product",
    )


class ProductImage(db.Model):
    __tablename__ = "product_images"

    image_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=False,
        index=True,
    )
    image_url = db.Column(db.Text, nullable=False)

    product = db.relationship("Product", back_populates="images")


class BuyerRequest(TimestampMixin, db.Model):
    __tablename__ = "buyer_requests"

    request_id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(
        db.Integer,
        db.ForeignKey("buyer_profiles.buyer_id"),
        nullable=False,
        index=True,
    )
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.category_id"),
        nullable=False,
        index=True,
    )
    product_name = db.Column(db.Text, nullable=False)
    quantity = db.Column(Numeric(12, 3), nullable=False)
    unit = db.Column(db.Text, nullable=False)
    budget = db.Column(Numeric(12, 2))
    location = db.Column(db.Text, nullable=False)
    required_date = db.Column(db.Date)
    status = db.Column(
        db.Text,
        nullable=False,
        default="open",
        server_default="open",
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="check_buyer_request_quantity_positive",
        ),
        CheckConstraint(
            "budget IS NULL OR budget > 0",
            name="check_buyer_request_budget_positive",
        ),
        CheckConstraint(
            _in("status", REQUEST_STATUSES),
            name="check_buyer_request_status",
        ),
    )

    buyer = db.relationship("BuyerProfile", back_populates="requests")
    category = db.relationship(
        "Category",
        back_populates="buyer_requests",
    )
    responses = db.relationship(
        "RequestResponse",
        back_populates="request",
        cascade="all, delete-orphan",
    )


class RequestResponse(TimestampMixin, db.Model):
    __tablename__ = "request_responses"

    response_id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(
        db.Integer,
        db.ForeignKey("buyer_requests.request_id"),
        nullable=False,
    )
    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmer_profiles.farmer_id"),
        nullable=False,
        index=True,
    )
    message = db.Column(db.Text)
    offered_price = db.Column(Numeric(12, 2), nullable=False)
    available_quantity = db.Column(Numeric(12, 3), nullable=False)
    status = db.Column(
        db.Text,
        nullable=False,
        default="pending",
        server_default="pending",
    )

    __table_args__ = (
        UniqueConstraint(
            "request_id",
            "farmer_id",
            name="uq_request_response_farmer",
        ),
        CheckConstraint(
            "offered_price > 0",
            name="check_response_price_positive",
        ),
        CheckConstraint(
            "available_quantity > 0",
            name="check_response_quantity_positive",
        ),
        CheckConstraint(
            _in("status", RESPONSE_STATUSES),
            name="check_response_status",
        ),
    )

    request = db.relationship(
        "BuyerRequest",
        back_populates="responses",
    )
    farmer = db.relationship(
        "FarmerProfile",
        back_populates="request_responses",
    )


class Order(TimestampMixin, db.Model):
    __tablename__ = "orders"

    order_id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(
        db.Integer,
        db.ForeignKey("buyer_profiles.buyer_id"),
        nullable=False,
        index=True,
    )
    farmer_id = db.Column(
        db.Integer,
        db.ForeignKey("farmer_profiles.farmer_id"),
        nullable=False,
        index=True,
    )
    total_amount = db.Column(Numeric(12, 2), nullable=False)
    order_status = db.Column(
        db.Text,
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )

    __table_args__ = (
        CheckConstraint(
            "total_amount > 0",
            name="check_order_total_positive",
        ),
        CheckConstraint(
            _in("order_status", ORDER_STATUSES),
            name="check_order_status",
        ),
    )

    buyer = db.relationship("BuyerProfile", back_populates="orders")
    farmer = db.relationship("FarmerProfile", back_populates="orders")
    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    payments = db.relationship(
        "Payment",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    review = db.relationship(
        "Review",
        back_populates="order",
        uselist=False,
        cascade="all, delete-orphan",
    )


class OrderItem(db.Model):
    __tablename__ = "order_items"

    order_item_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.order_id"),
        nullable=False,
        index=True,
    )
    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=False,
        index=True,
    )
    quantity = db.Column(Numeric(12, 3), nullable=False)
    unit_price = db.Column(Numeric(12, 2), nullable=False)
    subtotal = db.Column(Numeric(12, 2), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="check_order_item_quantity_positive",
        ),
        CheckConstraint(
            "unit_price > 0",
            name="check_order_item_price_positive",
        ),
        CheckConstraint(
            "subtotal > 0",
            name="check_order_item_subtotal_positive",
        ),
    )

    order = db.relationship("Order", back_populates="items")
    product = db.relationship("Product", back_populates="order_items")


class Payment(TimestampMixin, db.Model):
    __tablename__ = "payments"

    payment_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.order_id"),
        nullable=False,
        index=True,
    )
    payment_method = db.Column(db.Text, nullable=False)
    transaction_reference = db.Column(db.Text, unique=True)
    amount = db.Column(Numeric(12, 2), nullable=False)
    payment_status = db.Column(
        db.Text,
        nullable=False,
        default="pending",
        server_default="pending",
    )
    paid_at = db.Column(db.DateTime(timezone=True))

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="check_payment_amount_positive",
        ),
        CheckConstraint(
            _in("payment_status", PAYMENT_STATUSES),
            name="check_payment_status",
        ),
    )

    order = db.relationship("Order", back_populates="payments")


class Review(TimestampMixin, db.Model):
    __tablename__ = "reviews"

    review_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.order_id"),
        nullable=False,
        unique=True,
    )
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)

    __table_args__ = (
        CheckConstraint(
            "rating >= 1 AND rating <= 5",
            name="check_review_rating_range",
        ),
    )

    order = db.relationship("Order", back_populates="review")


class RevokedToken(db.Model):
    __tablename__ = "revoked_tokens"

    revoked_token_id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True)
    revoked_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )


class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_tokens"

    reset_token_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = db.Column(
        db.String(64),
        nullable=False,
        unique=True,
    )
    expires_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
    )
    used_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )

    user = db.relationship("User")
