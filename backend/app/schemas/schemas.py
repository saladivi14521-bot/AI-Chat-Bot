"""
SmartRep AI - Pydantic Schemas for API Request/Response
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================
# AUTH SCHEMAS
# ============================================

class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=255)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ============================================
# BUSINESS SCHEMAS
# ============================================

class BusinessCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: str = "Asia/Dhaka"
    currency: str = "BDT"


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None


class AISettingsUpdate(BaseModel):
    ai_personality: Optional[str] = None
    ai_language_preference: Optional[str] = None
    upsell_aggressiveness: Optional[int] = Field(None, ge=1, le=10)
    auto_reply_enabled: Optional[bool] = None
    business_hours_only: Optional[bool] = None
    business_hours_start: Optional[str] = None
    business_hours_end: Optional[str] = None
    welcome_message: Optional[str] = None
    away_message: Optional[str] = None


class BusinessResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    timezone: str
    currency: str
    is_active: bool
    ai_personality: str
    ai_language_preference: str
    upsell_aggressiveness: int
    auto_reply_enabled: bool
    business_hours_only: bool
    welcome_message: Optional[str] = None
    away_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# SUBSCRIPTION SCHEMAS
# ============================================

class SubscriptionResponse(BaseModel):
    id: str
    plan: str
    status: str
    price_monthly: float
    messages_limit: int
    pages_limit: int
    messages_used: int
    trial_ends_at: Optional[datetime] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None

    class Config:
        from_attributes = True


class SubscriptionUpgrade(BaseModel):
    plan: str  # growth, professional, enterprise


# ============================================
# PRODUCT SCHEMAS
# ============================================

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    price: float = Field(..., ge=0)
    sale_price: Optional[float] = None
    currency: str = "BDT"
    category: Optional[str] = None
    tags: List[str] = []
    images: List[str] = []
    variants: List[Dict[str, Any]] = []
    stock_quantity: int = 0
    is_available: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    variants: Optional[List[Dict[str, Any]]] = None
    stock_quantity: Optional[int] = None
    is_available: Optional[bool] = None


class ProductResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    currency: str
    category: Optional[str] = None
    tags: List[str] = []
    images: List[str] = []
    variants: List[Dict[str, Any]] = []
    stock_quantity: int
    is_available: bool
    ai_description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# KNOWLEDGE BASE SCHEMAS
# ============================================

class KnowledgeBaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    type: str = "general"  # product, faq, custom_qa, policy, general
    metadata: Dict[str, Any] = {}


class KnowledgeBaseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class KnowledgeBaseResponse(BaseModel):
    id: str
    title: str
    content: str
    type: str
    extra_metadata: Dict[str, Any] = Field(default={}, alias="extra_metadata")
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# ============================================
# FACEBOOK SCHEMAS
# ============================================

class FacebookPageConnect(BaseModel):
    page_id: str
    page_name: str
    page_access_token: str
    page_picture_url: Optional[str] = None


class FacebookPageResponse(BaseModel):
    id: str
    page_id: str
    page_name: Optional[str] = None
    page_picture_url: Optional[str] = None
    status: str
    is_active: bool
    connected_at: datetime
    last_webhook_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# CONVERSATION & MESSAGE SCHEMAS
# ============================================

class ConversationResponse(BaseModel):
    id: str
    customer_id: str
    platform: str
    status: str
    detected_language: str
    current_sentiment: str
    intent: Optional[str] = None
    summary: Optional[str] = None
    message_count: int
    is_abandoned: bool
    last_message_at: Optional[datetime] = None
    created_at: datetime
    customer: Optional["CustomerBriefResponse"] = None
    last_message: Optional["MessageResponse"] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    detected_language: Optional[str] = None
    sentiment: Optional[str] = None
    intent: Optional[str] = None
    confidence_score: Optional[float] = None
    is_read: bool
    response_time_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1)


class ConversationTakeoverRequest(BaseModel):
    action: str  # "take_over" or "return_to_ai"


# ============================================
# CUSTOMER SCHEMAS
# ============================================

class CustomerBriefResponse(BaseModel):
    id: str
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    platform: str
    segment: str
    sentiment: str
    total_conversations: int
    total_orders: int
    total_spent: float
    last_message_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CustomerDetailResponse(CustomerBriefResponse):
    platform_id: str
    tags: List[str] = []
    notes: Optional[str] = None
    created_at: datetime


class CustomerUpdate(BaseModel):
    segment: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


# ============================================
# ORDER SCHEMAS
# ============================================

class OrderItemCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: int = 1
    unit_price: float
    variant: Optional[str] = None


class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    items: List[OrderItemCreate]
    delivery_address: Optional[str] = None
    delivery_phone: Optional[str] = None
    customer_name: Optional[str] = None
    payment_method: Optional[str] = None
    discount: float = 0.0
    delivery_charge: float = 0.0
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    payment_status: Optional[str] = None
    notes: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: str
    product_name: str
    quantity: int
    unit_price: float
    total_price: float
    variant: Optional[str] = None

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    id: str
    order_number: str
    status: str
    subtotal: float
    discount: float
    delivery_charge: float
    total: float
    currency: str
    delivery_address: Optional[str] = None
    delivery_phone: Optional[str] = None
    customer_name: Optional[str] = None
    payment_method: Optional[str] = None
    payment_status: str
    ai_extracted: bool
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# CAMPAIGN SCHEMAS
# ============================================

class CampaignCreate(BaseModel):
    name: str
    message_template: str
    target_segment: Optional[str] = None
    is_ai_personalized: bool = True
    scheduled_at: Optional[datetime] = None


class CampaignResponse(BaseModel):
    id: str
    name: str
    message_template: str
    target_segment: Optional[str] = None
    target_count: int
    sent_count: int
    opened_count: int
    replied_count: int
    is_ai_personalized: bool
    status: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# ANALYTICS SCHEMAS
# ============================================

class DashboardStatsResponse(BaseModel):
    total_messages_today: int = 0
    total_conversations_today: int = 0
    total_orders_today: int = 0
    revenue_today: float = 0.0
    total_messages_month: int = 0
    total_conversations_month: int = 0
    total_orders_month: int = 0
    revenue_month: float = 0.0
    active_conversations: int = 0
    ai_handled_percent: float = 0.0
    avg_response_time_ms: int = 0
    sentiment_breakdown: Dict[str, int] = {}
    language_breakdown: Dict[str, int] = {}
    top_products: List[Dict[str, Any]] = []
    hourly_activity: List[Dict[str, Any]] = []
    message_volume: List[Dict[str, Any]] = []
    conversion_rate: float = 0.0


class AdminDashboardResponse(BaseModel):
    total_users: int = 0
    active_businesses: int = 0
    total_messages_today: int = 0
    total_messages_month: int = 0
    mrr: float = 0.0
    new_users_today: int = 0
    new_users_month: int = 0
    active_bots: int = 0
    system_health: Dict[str, str] = {}
    revenue_chart: List[Dict[str, Any]] = []
    user_growth_chart: List[Dict[str, Any]] = []
    top_businesses: List[Dict[str, Any]] = []
    plan_distribution: Dict[str, int] = {}


# ============================================
# COMMON SCHEMAS
# ============================================

class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageBase(BaseModel):
    message: str


class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "Operation successful"


class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    detail: Optional[str] = None


# Fix forward references
TokenResponse.model_rebuild()
ConversationResponse.model_rebuild()
