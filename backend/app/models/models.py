"""
SmartRep AI - Database Models
All SQLAlchemy models for the application
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum, Index, BigInteger
)
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ============================================
# ENUMS
# ============================================

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    BUSINESS_OWNER = "business_owner"
    TEAM_MEMBER = "team_member"


class SubscriptionPlan(str, enum.Enum):
    STARTER = "starter"
    GROWTH = "growth"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    TRIAL = "trial"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class ConversationStatus(str, enum.Enum):
    ACTIVE = "active"
    AI_HANDLING = "ai_handling"
    HUMAN_HANDLING = "human_handling"
    CLOSED = "closed"
    FLAGGED = "flagged"


class MessageRole(str, enum.Enum):
    CUSTOMER = "customer"
    AI = "ai"
    HUMAN_AGENT = "human_agent"


class Platform(str, enum.Enum):
    FACEBOOK = "facebook"
    WHATSAPP = "whatsapp"


class CustomerSegment(str, enum.Enum):
    HOT_LEAD = "hot_lead"
    WARM_LEAD = "warm_lead"
    COLD_LEAD = "cold_lead"
    REPEAT_BUYER = "repeat_buyer"
    VIP = "vip"
    UNHAPPY = "unhappy"
    NEW = "new"


class SentimentType(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    ANGRY = "angry"


class KnowledgeBaseType(str, enum.Enum):
    PRODUCT = "product"
    FAQ = "faq"
    CUSTOM_QA = "custom_qa"
    POLICY = "policy"
    GENERAL = "general"


class PageConnectionStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    RETURNED = "returned"


# ============================================
# HELPER
# ============================================

def generate_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


# ============================================
# MODELS
# ============================================

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.BUSINESS_OWNER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    businesses = relationship("Business", back_populates="owner", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
    )


class Business(Base):
    __tablename__ = "businesses"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    industry = Column(String(100), nullable=True)
    website = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    timezone = Column(String(50), default="Asia/Dhaka")
    currency = Column(String(10), default="BDT")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # AI Settings
    ai_personality = Column(String(50), default="friendly")  # friendly, professional, casual
    ai_language_preference = Column(String(20), default="auto")  # auto, bangla, english, banglish
    upsell_aggressiveness = Column(Integer, default=5)  # 1-10 scale
    auto_reply_enabled = Column(Boolean, default=True)
    auto_comment_reply_enabled = Column(Boolean, default=False)  # Auto-reply to FB/IG post comments
    page_monitor_enabled = Column(Boolean, default=False)  # Monitor page posts for learning
    page_sync_interval_minutes = Column(Integer, default=30)  # How often to sync page content
    business_hours_only = Column(Boolean, default=False)
    business_hours_start = Column(String(5), default="09:00")
    business_hours_end = Column(String(5), default="22:00")
    welcome_message = Column(Text, nullable=True)
    away_message = Column(Text, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="businesses")
    facebook_pages = relationship("FacebookPage", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    knowledge_bases = relationship("KnowledgeBase", back_populates="business", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="business", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="business", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="business", uselist=False, cascade="all, delete-orphan")
    analytics_events = relationship("AnalyticsEvent", back_populates="business", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="business", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_business_owner", "owner_id"),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan = Column(SAEnum(SubscriptionPlan), default=SubscriptionPlan.STARTER)
    status = Column(SAEnum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    price_monthly = Column(Float, default=0.0)
    messages_limit = Column(Integer, default=100)
    pages_limit = Column(Integer, default=1)
    messages_used = Column(Integer, default=0)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business", back_populates="subscription")


class FacebookPage(Base):
    __tablename__ = "facebook_pages"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    page_id = Column(String(100), unique=True, nullable=False)
    page_name = Column(String(255), nullable=True)
    page_access_token = Column(Text, nullable=False)
    page_picture_url = Column(Text, nullable=True)
    status = Column(SAEnum(PageConnectionStatus), default=PageConnectionStatus.CONNECTED)
    is_active = Column(Boolean, default=True)
    connected_at = Column(DateTime(timezone=True), default=utc_now)
    last_webhook_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    business = relationship("Business", back_populates="facebook_pages")
    conversations = relationship("Conversation", back_populates="facebook_page")

    __table_args__ = (
        Index("idx_fb_page_id", "page_id"),
        Index("idx_fb_business", "business_id"),
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    sale_price = Column(Float, nullable=True)
    currency = Column(String(10), default="BDT")
    category = Column(String(100), nullable=True)
    tags = Column(JSONB, default=list)
    images = Column(JSONB, default=list)  # List of image URLs
    variants = Column(JSONB, default=list)  # [{name, price, stock}]
    stock_quantity = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    ai_description = Column(Text, nullable=True)  # AI-generated description
    embedding_id = Column(String(255), nullable=True)  # ChromaDB reference
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

    __table_args__ = (
        Index("idx_product_business", "business_id"),
        Index("idx_product_category", "category"),
    )


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(SAEnum(KnowledgeBaseType), default=KnowledgeBaseType.GENERAL)
    extra_metadata = Column(JSONB, default=dict)
    embedding_id = Column(String(255), nullable=True)  # ChromaDB reference
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business", back_populates="knowledge_bases")

    __table_args__ = (
        Index("idx_kb_business", "business_id"),
        Index("idx_kb_type", "type"),
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    platform = Column(SAEnum(Platform), nullable=False)
    platform_id = Column(String(255), nullable=False)  # FB user ID or WhatsApp number
    name = Column(String(255), nullable=True)
    profile_picture = Column(String(500), nullable=True)
    segment = Column(SAEnum(CustomerSegment), default=CustomerSegment.NEW)
    sentiment = Column(SAEnum(SentimentType), default=SentimentType.NEUTRAL)
    tags = Column(JSONB, default=list)
    total_conversations = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    extra_metadata = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    conversations = relationship("Conversation", back_populates="customer")
    orders = relationship("Order", back_populates="customer")

    __table_args__ = (
        Index("idx_customer_business", "business_id"),
        Index("idx_customer_platform", "platform_id"),
        Index("idx_customer_segment", "segment"),
    )


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    facebook_page_id = Column(String, ForeignKey("facebook_pages.id", ondelete="SET NULL"), nullable=True)
    platform = Column(SAEnum(Platform), nullable=False)
    status = Column(SAEnum(ConversationStatus), default=ConversationStatus.AI_HANDLING)
    detected_language = Column(String(20), default="auto")
    current_sentiment = Column(SAEnum(SentimentType), default=SentimentType.NEUTRAL)
    intent = Column(String(100), nullable=True)  # product_query, order_status, complaint, etc.
    summary = Column(Text, nullable=True)  # AI-generated summary
    message_count = Column(Integer, default=0)
    is_abandoned = Column(Boolean, default=False)
    abandoned_recovered = Column(Boolean, default=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business", back_populates="conversations")
    customer = relationship("Customer", back_populates="conversations")
    facebook_page = relationship("FacebookPage", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

    __table_args__ = (
        Index("idx_conv_business", "business_id"),
        Index("idx_conv_customer", "customer_id"),
        Index("idx_conv_status", "status"),
        Index("idx_conv_platform", "platform"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(SAEnum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    detected_language = Column(String(20), nullable=True)
    sentiment = Column(SAEnum(SentimentType), nullable=True)
    intent = Column(String(100), nullable=True)
    confidence_score = Column(Float, nullable=True)  # AI confidence in response
    extra_metadata = Column(JSONB, default=dict)  # Extra data like attachments, quick replies
    platform_message_id = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    response_time_ms = Column(Integer, nullable=True)  # Time taken to generate response
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")

    __table_args__ = (
        Index("idx_msg_conversation", "conversation_id"),
        Index("idx_msg_role", "role"),
        Index("idx_msg_created", "created_at"),
    )


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    order_number = Column(String(50), unique=True, nullable=False)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.PENDING)
    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    delivery_charge = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    currency = Column(String(10), default="BDT")
    delivery_address = Column(Text, nullable=True)
    delivery_phone = Column(String(50), nullable=True)
    customer_name = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)  # bkash, nagad, cod
    payment_status = Column(String(50), default="pending")
    notes = Column(Text, nullable=True)
    source_conversation_id = Column(String, nullable=True)
    ai_extracted = Column(Boolean, default=False)  # Was order extracted by AI?
    tracking_number = Column(String(100), nullable=True)
    tracking_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_order_business", "business_id"),
        Index("idx_order_customer", "customer_id"),
        Index("idx_order_status", "status"),
        Index("idx_order_number", "order_number"),
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    total_price = Column(Float, default=0.0)
    variant = Column(String(255), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    message_template = Column(Text, nullable=False)
    target_segment = Column(SAEnum(CustomerSegment), nullable=True)
    target_count = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    opened_count = Column(Integer, default=0)
    replied_count = Column(Integer, default=0)
    is_ai_personalized = Column(Boolean, default=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="draft")  # draft, scheduled, sending, sent, cancelled
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business", back_populates="campaigns")

    __table_args__ = (
        Index("idx_campaign_business", "business_id"),
    )


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(100), nullable=False)
    # Types: message_received, message_sent, order_created, conversation_started,
    #        conversation_closed, human_takeover, sentiment_alert, abandoned_chat,
    #        abandoned_recovered, upsell_success, upsell_attempted
    data = Column(JSONB, default=dict)
    platform = Column(SAEnum(Platform), nullable=True)
    conversation_id = Column(String, nullable=True)
    customer_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    business = relationship("Business", back_populates="analytics_events")

    __table_args__ = (
        Index("idx_analytics_business", "business_id"),
        Index("idx_analytics_type", "event_type"),
        Index("idx_analytics_created", "created_at"),
        Index("idx_analytics_business_type_created", "business_id", "event_type", "created_at"),
    )


class PagePost(Base):
    """Tracks synced Facebook/Instagram Page posts for monitoring & comment replies"""
    __tablename__ = "page_posts"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    facebook_page_id = Column(String, ForeignKey("facebook_pages.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(String(255), unique=True, nullable=False)  # FB post ID
    message = Column(Text, nullable=True)  # Post text
    post_type = Column(String(50), default="status")  # status, photo, video, link, offer
    image_url = Column(String(500), nullable=True)
    permalink = Column(String(500), nullable=True)
    reactions_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)
    last_comment_check_at = Column(DateTime(timezone=True), nullable=True)
    comments_replied = Column(Integer, default=0)  # How many comments we auto-replied to
    is_learned = Column(Boolean, default=False)  # Content added to KB
    post_created_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    business = relationship("Business")
    facebook_page = relationship("FacebookPage")

    __table_args__ = (
        Index("idx_page_post_business", "business_id"),
        Index("idx_page_post_fb_page", "facebook_page_id"),
        Index("idx_page_post_id", "post_id"),
    )


class PostCommentReply(Base):
    """Tracks comments we've already replied to (avoid duplicates)"""
    __tablename__ = "post_comment_replies"

    id = Column(String, primary_key=True, default=generate_uuid)
    business_id = Column(String, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    page_post_id = Column(String, ForeignKey("page_posts.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(String(255), unique=True, nullable=False)  # FB comment ID
    commenter_name = Column(String(255), nullable=True)
    comment_text = Column(Text, nullable=True)
    reply_text = Column(Text, nullable=True)
    replied_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index("idx_comment_reply_post", "page_post_id"),
        Index("idx_comment_reply_comment_id", "comment_id"),
    )
