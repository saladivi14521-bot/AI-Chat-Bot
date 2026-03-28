"""
SmartRep AI - Analytics Routes
"""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, extract
from app.core.database import get_db
from app.models.models import (
    User, Business, Conversation, Message, Order, Customer,
    AnalyticsEvent, Platform, ConversationStatus, MessageRole,
    SentimentType
)
from app.schemas.schemas import DashboardStatsResponse
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive dashboard analytics"""
    business = await get_user_business(current_user, db)

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    period_start = now - timedelta(days=days)

    # Messages today
    msg_today_result = await db.execute(
        select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.business_id == business.id,
            AnalyticsEvent.event_type == "message_received",
            AnalyticsEvent.created_at >= today_start,
        )
    )
    total_messages_today = msg_today_result.scalar() or 0

    # Messages this month
    msg_month_result = await db.execute(
        select(func.count(AnalyticsEvent.id)).where(
            AnalyticsEvent.business_id == business.id,
            AnalyticsEvent.event_type == "message_received",
            AnalyticsEvent.created_at >= month_start,
        )
    )
    total_messages_month = msg_month_result.scalar() or 0

    # Conversations today
    conv_today_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.business_id == business.id,
            Conversation.created_at >= today_start,
        )
    )
    total_conversations_today = conv_today_result.scalar() or 0

    # Conversations this month
    conv_month_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.business_id == business.id,
            Conversation.created_at >= month_start,
        )
    )
    total_conversations_month = conv_month_result.scalar() or 0

    # Orders today
    orders_today_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.business_id == business.id,
            Order.created_at >= today_start,
        )
    )
    total_orders_today = orders_today_result.scalar() or 0

    # Revenue today
    revenue_today_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0.0)).where(
            Order.business_id == business.id,
            Order.created_at >= today_start,
        )
    )
    revenue_today = float(revenue_today_result.scalar() or 0)

    # Orders this month
    orders_month_result = await db.execute(
        select(func.count(Order.id)).where(
            Order.business_id == business.id,
            Order.created_at >= month_start,
        )
    )
    total_orders_month = orders_month_result.scalar() or 0

    # Revenue this month
    revenue_month_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), 0.0)).where(
            Order.business_id == business.id,
            Order.created_at >= month_start,
        )
    )
    revenue_month = float(revenue_month_result.scalar() or 0)

    # Active conversations
    active_conv_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.business_id == business.id,
            Conversation.status.in_([
                ConversationStatus.ACTIVE,
                ConversationStatus.AI_HANDLING,
                ConversationStatus.HUMAN_HANDLING,
            ]),
        )
    )
    active_conversations = active_conv_result.scalar() or 0

    # AI handled percentage
    ai_conv_result = await db.execute(
        select(func.count(Conversation.id)).where(
            Conversation.business_id == business.id,
            Conversation.status == ConversationStatus.AI_HANDLING,
        )
    )
    ai_count = ai_conv_result.scalar() or 0
    total_active = active_conversations or 1
    ai_handled_percent = round((ai_count / total_active) * 100, 1)

    # Average response time
    avg_time_result = await db.execute(
        select(func.avg(Message.response_time_ms)).where(
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.business_id == business.id)
            ),
            Message.role == MessageRole.AI,
            Message.response_time_ms.isnot(None),
        )
    )
    avg_response_time = int(avg_time_result.scalar() or 0)

    # Sentiment breakdown
    sentiment_data = {}
    for sentiment in ["positive", "neutral", "negative", "angry"]:
        s_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id.in_(
                    select(Conversation.id).where(Conversation.business_id == business.id)
                ),
                Message.role == MessageRole.CUSTOMER,
                Message.sentiment == sentiment,
                Message.created_at >= period_start,
            )
        )
        sentiment_data[sentiment] = s_result.scalar() or 0

    # Language breakdown
    language_data = {}
    lang_result = await db.execute(
        select(
            Message.detected_language,
            func.count(Message.id),
        ).where(
            Message.conversation_id.in_(
                select(Conversation.id).where(Conversation.business_id == business.id)
            ),
            Message.role == MessageRole.CUSTOMER,
            Message.detected_language.isnot(None),
            Message.created_at >= period_start,
        ).group_by(Message.detected_language)
    )
    for row in lang_result.all():
        if row[0]:
            language_data[row[0]] = row[1]

    # Message volume (daily for the period)
    message_volume = []
    for i in range(min(days, 30)):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        day_count_result = await db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.business_id == business.id,
                AnalyticsEvent.event_type == "message_received",
                AnalyticsEvent.created_at >= day_start,
                AnalyticsEvent.created_at < day_end,
            )
        )
        message_volume.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": day_count_result.scalar() or 0,
        })

    message_volume.reverse()

    # Hourly activity (today)
    hourly_activity = []
    for hour in range(24):
        hour_start = today_start.replace(hour=hour)
        hour_end = hour_start + timedelta(hours=1)

        hour_count = await db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.business_id == business.id,
                AnalyticsEvent.event_type == "message_received",
                AnalyticsEvent.created_at >= hour_start,
                AnalyticsEvent.created_at < hour_end,
            )
        )
        hourly_activity.append({
            "hour": hour,
            "count": hour_count.scalar() or 0,
        })

    return DashboardStatsResponse(
        total_messages_today=total_messages_today,
        total_conversations_today=total_conversations_today,
        total_orders_today=total_orders_today,
        revenue_today=revenue_today,
        total_messages_month=total_messages_month,
        total_conversations_month=total_conversations_month,
        total_orders_month=total_orders_month,
        revenue_month=revenue_month,
        active_conversations=active_conversations,
        ai_handled_percent=ai_handled_percent,
        avg_response_time_ms=avg_response_time,
        sentiment_breakdown=sentiment_data,
        language_breakdown=language_data,
        message_volume=message_volume,
        hourly_activity=hourly_activity,
    )
