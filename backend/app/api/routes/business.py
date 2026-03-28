"""
SmartRep AI - Business Routes (Dashboard, Business CRUD, AI Settings)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import User, Business, Subscription
from app.schemas.schemas import (
    BusinessCreate, BusinessUpdate, BusinessResponse,
    AISettingsUpdate, SubscriptionResponse, SubscriptionUpgrade,
    SuccessResponse
)
from app.api.deps import get_current_business_owner

router = APIRouter(prefix="/business", tags=["Business"])


async def get_user_business(user: User, db: AsyncSession) -> Business:
    """Helper to get the user's primary business"""
    result = await db.execute(
        select(Business)
        .options(selectinload(Business.subscription))
        .where(Business.owner_id == user.id)
        .limit(1)
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found. Please create one first.",
        )
    return business


@router.get("/me", response_model=BusinessResponse)
async def get_my_business(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's business"""
    business = await get_user_business(current_user, db)
    return BusinessResponse.model_validate(business)


@router.put("/me", response_model=BusinessResponse)
async def update_my_business(
    data: BusinessUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update business details"""
    business = await get_user_business(current_user, db)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(business, key, value)

    await db.flush()
    return BusinessResponse.model_validate(business)


@router.put("/ai-settings", response_model=BusinessResponse)
async def update_ai_settings(
    data: AISettingsUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update AI settings for the business"""
    business = await get_user_business(current_user, db)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(business, key, value)

    await db.flush()
    return BusinessResponse.model_validate(business)


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get current subscription details"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Subscription).where(Subscription.business_id == business.id)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    return SubscriptionResponse.model_validate(subscription)


@router.post("/subscription/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    data: SubscriptionUpgrade,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade subscription plan"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Subscription).where(Subscription.business_id == business.id)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    # Plan configurations
    plans = {
        "growth": {"price": 14.99, "messages": 2000, "pages": 3},
        "professional": {"price": 34.99, "messages": 10000, "pages": 10},
        "enterprise": {"price": 119.00, "messages": 50000, "pages": 999},
    }

    plan_config = plans.get(data.plan)
    if not plan_config:
        raise HTTPException(status_code=400, detail="Invalid plan")

    subscription.plan = data.plan
    subscription.status = "active"
    subscription.price_monthly = plan_config["price"]
    subscription.messages_limit = plan_config["messages"]
    subscription.pages_limit = plan_config["pages"]

    await db.flush()
    return SubscriptionResponse.model_validate(subscription)
