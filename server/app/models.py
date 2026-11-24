
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Numeric, UniqueConstraint
from sqlalchemy.orm import validates

from app.extensions import db, bcrypt


MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_BYTES = 72

ADMIN_STATUSES = ("active", "suspended")
PRODUCT_STATUSES = ("available", "sold_out", "inactive")
REQUEST_STATUSES = ("open", "fulfilled", "closed", "cancelled", "matched")
RESPONSE_STATUSES = ("pending", "accepted", "rejected", "withdrawn")
ORDER_STATUSES = (
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "rejected",
    "expired",
    "paid",
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
    auth_version = db.Column(db.Integer, nullable=False, default=0, server_default="0")
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
        from app.services.passwords import validate_password
        validate_password(password)

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
    county_code = db.Column(db.Text)
    subcounty_code = db.Column(db.Text)
    ward_code = db.Column(db.Text)
    town = db.Column(db.Text)
    directions = db.Column(db.Text)
    landmark = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    land_tenure = db.Column(db.Text)
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

    county_code = db.Column(db.Text)
    subcounty_code = db.Column(db.Text)
    town = db.Column(db.Text)

    user = db.relationship("User", back_populates="buyer_profile")
    requests = db.relationship("BuyerRequest", back_populates="buyer")
    orders = db.relationship("Order", back_populates="buyer")
    saved_products = db.relationship(
        "SavedProduct",
        back_populates="buyer",
        cascade="all, delete-orphan",
    )


class FieldOfficer(db.Model):
    __tablename__ = "field_officers"

    field_officer_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.user_id"),
        nullable=False,
        unique=True,
    )
    coverage = db.Column(db.JSON)
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
    location_snapshot = db.Column(db.JSON)
    location_matches = db.Column(db.Boolean)
    officer_remarks = db.Column(db.Text)
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
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
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
    saved_by = db.relationship(
        "SavedProduct",
        back_populates="product",
        cascade="all, delete-orphan",
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

class SavedProduct(db.Model):
    __tablename__ = "saved_products"

    saved_product_id = db.Column(
        db.Integer,
        primary_key=True,
    )

    buyer_id = db.Column(
        db.Integer,
        db.ForeignKey("buyer_profiles.buyer_id"),
        nullable=False,
        index=True,
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.product_id"),
        nullable=False,
        index=True,
    )

    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        server_default=db.func.now(),
    )

    __table_args__ = (
        UniqueConstraint(
            "buyer_id",
            "product_id",
            name="uq_saved_product_buyer_product",
        ),
    )

    buyer = db.relationship(
        "BuyerProfile",
        back_populates="saved_products",
    )

    product = db.relationship(
        "Product",
        back_populates="saved_by",
    )


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
    checkout_key = db.Column(db.String(64))
    checkout_fingerprint = db.Column(db.String(64))
    confirmation_deadline = db.Column(db.DateTime(timezone=True), index=True)
    payment_deadline = db.Column(db.DateTime(timezone=True), index=True)
    confirmed_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    stock_released_at = db.Column(db.DateTime(timezone=True))
    rejection_reason = db.Column(db.Text)
    total_amount = db.Column(Numeric(12, 2), nullable=False)
    order_status = db.Column(
        db.Text,
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("buyer_id", "farmer_id", "checkout_key", name="uq_order_checkout_farmer"),
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
    product_name = db.Column(db.Text, nullable=False, default="Product")
    unit = db.Column(db.Text, nullable=False, default="kg")
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

    provider_request_id = db.Column(db.Text, unique=True)
    authorization_url = db.Column(db.Text)
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


class MarketplaceSettings(db.Model):
    __tablename__ = "marketplace_settings"
    settings_id = db.Column(db.Integer, primary_key=True)
    confirmation_hours = db.Column(db.Integer, nullable=False, default=12)
    payment_hours = db.Column(db.Integer, nullable=False, default=2)


class AuditEvent(db.Model):
    __tablename__ = "audit_events"
    event_id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    entity_type = db.Column(db.Text, nullable=False)
    entity_id = db.Column(db.Integer, nullable=False, index=True)
    action = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())


class Notification(db.Model):
    __tablename__ = "notifications"
    notification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False, index=True)
    title = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.Text, nullable=False, default="/profile")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())
    read_at = db.Column(db.DateTime(timezone=True))
    email_status = db.Column(db.Text, nullable=False, default="pending")
    email_attempts = db.Column(db.Integer, nullable=False, default=0)
    email_retry_at = db.Column(db.DateTime(timezone=True))
    user = db.relationship("User")


class OrderIssue(db.Model):
    __tablename__ = "order_issues"
    issue_id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.order_id"), nullable=False, index=True)
    requested_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    issue_type = db.Column(db.Text, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.Text, nullable=False, default="open")
    resolution_note = db.Column(db.Text)
    refund_reference = db.Column(db.Text, unique=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.user_id"))
    reviewed_at = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=db.func.now())
    order = db.relationship("Order")
    __table_args__ = (
        CheckConstraint("status IN ('open', 'resolved', 'rejected')", name="check_order_issue_status"),
        CheckConstraint("issue_type IN ('cancellation', 'refund', 'payment')", name="check_order_issue_type"),
    )


class AuthSession(db.Model):
    __tablename__ = 'auth_sessions'
    session_id = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, index=True)
    tab_id = db.Column(db.String(100), nullable=False)
    refresh_hash = db.Column(db.String(64), unique=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False)
    last_activity_at = db.Column(db.DateTime(timezone=True), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    verified_at = db.Column(db.DateTime(timezone=True), nullable=False)
    revoked_at = db.Column(db.DateTime(timezone=True))
    browser = db.Column(db.String(200))
    user = db.relationship('User')


class UsedRefresh(db.Model):
    __tablename__ = 'used_refresh_tokens'
    token_hash = db.Column(db.String(64), primary_key=True)
    session_id = db.Column(db.String(64), db.ForeignKey('auth_sessions.session_id'), nullable=False)


class MediaAsset(TimestampMixin, db.Model):
    __tablename__ = 'media_assets'
    asset_id = db.Column(db.String(64), primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, index=True)
    verification_id = db.Column(db.Integer, db.ForeignKey('farmer_verifications.verification_id'), index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.product_id'), index=True)
    purpose = db.Column(db.Text, nullable=False)
    public_id = db.Column(db.Text, unique=True, nullable=False)
    cloudinary_asset_id = db.Column(db.Text)
    storage_backend = db.Column(db.Text, nullable=False, default='cloudinary', server_default='cloudinary')
    resource_type = db.Column(db.Text, nullable=False)
    delivery_type = db.Column(db.Text, nullable=False)
    file_format = db.Column(db.Text, nullable=False)
    file_size = db.Column(db.Integer, nullable=False)
    original_name = db.Column(db.Text, nullable=False)
    scan_status = db.Column(db.Text, nullable=False, default='pending')
    public_url = db.Column(db.Text)
    page_order = db.Column(db.Integer, nullable=False, default=0)
    deleted_at = db.Column(db.DateTime(timezone=True))
    verification = db.relationship('FarmerVerification')


class MediaContent(db.Model):
    """Binary payloads stay separate from frequently listed media metadata."""
    __tablename__ = 'media_contents'
    asset_id = db.Column(db.String(64), db.ForeignKey('media_assets.asset_id'), primary_key=True)
    data = db.Column(db.LargeBinary, nullable=False)
