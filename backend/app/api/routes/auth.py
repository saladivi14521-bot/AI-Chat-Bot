"""
SmartRep AI - Auth Routes
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.models import User, UserRole, Business, Subscription, SubscriptionPlan, SubscriptionStatus
from app.schemas.schemas import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    UserUpdate, PasswordChange, SuccessResponse
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new business owner"""
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.BUSINESS_OWNER,
        is_active=True,
        is_verified=False,
        last_login=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.flush()

    # Create default business
    business = Business(
        owner_id=user.id,
        name=f"{data.full_name}'s Business",
        description="",
    )
    db.add(business)
    await db.flush()

    # Create starter subscription (14-day trial)
    subscription = Subscription(
        business_id=business.id,
        plan=SubscriptionPlan.STARTER,
        status=SubscriptionStatus.TRIAL,
        price_monthly=0.0,
        messages_limit=100,
        pages_limit=1,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(subscription)
    await db.flush()

    # Generate token
    token = create_access_token(data={"sub": user.id, "role": user.role.value})

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with email and password"""
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact support.",
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    token = create_access_token(data={"sub": user.id, "role": user.role.value})

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile"""
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url

    await db.flush()
    return UserResponse.model_validate(current_user)


@router.post("/change-password", response_model=SuccessResponse)
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change password"""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = hash_password(data.new_password)
    await db.flush()

    return SuccessResponse(message="Password changed successfully")
