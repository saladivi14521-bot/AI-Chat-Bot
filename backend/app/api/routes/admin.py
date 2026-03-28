"""
SmartRep AI - Admin Routes (Super Admin Panel)
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.core.database import get_db
from app.models.models import (
    User, Business, Subscription, Conversation, Message,
    AnalyticsEvent, UserRole, SubscriptionPlan
)
from app.schemas.schemas import (
    UserResponse, AdminDashboardResponse, PaginatedResponse, SuccessResponse
)
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=AdminDashboardResponse)
async def admin_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get admin dashboard statistics"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total users
    total_users_result = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.BUSINESS_OWNER)
    )
    total_users = total_users_result.scalar() or 0

    # Active businesses
    active_biz_result = await db.execute(
        select(func.count(Business.id)).where(Business.is_active == True)
    )
    active_businesses = active_biz_result.scalar() or 0

    # Messages today
    msg_today_result = await db.execute(
        select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.event_type == "message_received",
            AnalyticsEvent.created_at >= today_start,
        )
    )
    total_messages_today = msg_today_result.scalar() or 0

    # Messages this month
    msg_month_result = await db.execute(
        select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.event_type == "message_received",
            AnalyticsEvent.created_at >= month_start,
        )
    )
    total_messages_month = msg_month_result.scalar() or 0

    # MRR (Monthly Recurring Revenue)
    mrr_result = await db.execute(
        select(func.coalesce(func.sum(Subscription.price_monthly), 0.0)).where(
            Subscription.status == "active",
        )
    )
    mrr = float(mrr_result.scalar() or 0)

    # New users today
    new_today_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.BUSINESS_OWNER,
            User.created_at >= today_start,
        )
    )
    new_users_today = new_today_result.scalar() or 0

    # New users this month
    new_month_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.BUSINESS_OWNER,
            User.created_at >= month_start,
        )
    )
    new_users_month = new_month_result.scalar() or 0

    # Active bots (businesses with auto_reply enabled)
    active_bots_result = await db.execute(
        select(func.count(Business.id)).where(
            Business.auto_reply_enabled == True,
            Business.is_active == True,
        )
    )
    active_bots = active_bots_result.scalar() or 0

    # Plan distribution
    plan_dist = {}
    for plan in ["starter", "growth", "professional", "enterprise"]:
        p_result = await db.execute(
            select(func.count(Subscription.id)).where(Subscription.plan == plan)
        )
        plan_dist[plan] = p_result.scalar() or 0

    # Revenue chart (last 30 days - simplified)
    revenue_chart = []
    for i in range(30):
        day = now - timedelta(days=i)
        revenue_chart.append({
            "date": day.strftime("%Y-%m-%d"),
            "revenue": 0,  # Would aggregate payment data
        })
    revenue_chart.reverse()

    # User growth chart (last 30 days)
    user_growth = []
    for i in range(30):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        ug_result = await db.execute(
            select(func.count(User.id)).where(
                User.created_at >= day_start,
                User.created_at < day_end,
                User.role == UserRole.BUSINESS_OWNER,
            )
        )
        user_growth.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": ug_result.scalar() or 0,
        })
    user_growth.reverse()

    return AdminDashboardResponse(
        total_users=total_users,
        active_businesses=active_businesses,
        total_messages_today=total_messages_today,
        total_messages_month=total_messages_month,
        mrr=mrr,
        new_users_today=new_users_today,
        new_users_month=new_users_month,
        active_bots=active_bots,
        system_health={"api": "healthy", "database": "healthy", "ai": "healthy", "redis": "healthy"},
        revenue_chart=revenue_chart,
        user_growth_chart=user_growth,
        plan_distribution=plan_dist,
    )


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    role: str = Query(None),
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)"""
    query = select(User)

    if search:
        query = query.where(
            (User.full_name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )
    if role:
        query = query.where(User.role == role)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(desc(User.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("/users/{user_id}/toggle-active", response_model=SuccessResponse)
async def toggle_user_active(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot modify admin accounts")

    user.is_active = not user.is_active
    await db.flush()

    status_text = "activated" if user.is_active else "deactivated"
    return SuccessResponse(message=f"User {status_text} successfully")


@router.delete("/users/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user and all their data"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete admin accounts")

    await db.delete(user)
    await db.flush()

    return SuccessResponse(message="User deleted successfully")
