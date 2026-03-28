"""
SmartRep AI - Conversation & Message Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import (
    User, Business, Conversation, Message, Customer,
    ConversationStatus, MessageRole, SentimentType
)
from app.schemas.schemas import (
    ConversationResponse, MessageResponse, SendMessageRequest,
    ConversationTakeoverRequest, CustomerBriefResponse, CustomerDetailResponse,
    CustomerUpdate, PaginatedResponse, SuccessResponse
)
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=PaginatedResponse)
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status"),
    platform: str = Query(None),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """List conversations for the business"""
    business = await get_user_business(current_user, db)

    query = (
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(Conversation.business_id == business.id)
    )

    if status_filter:
        query = query.where(Conversation.status == status_filter)
    if platform:
        query = query.where(Conversation.platform == platform)

    count_query = select(func.count()).select_from(
        select(Conversation.id)
        .where(Conversation.business_id == business.id)
        .subquery()
    )
    if status_filter:
        count_query = select(func.count()).select_from(
            select(Conversation.id)
            .where(Conversation.business_id == business.id)
            .where(Conversation.status == status_filter)
            .subquery()
        )
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(desc(Conversation.last_message_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    conversations = result.scalars().all()

    # Get last message for each conversation
    items = []
    for conv in conversations:
        msg_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        last_msg = msg_result.scalar_one_or_none()

        conv_data = ConversationResponse.model_validate(conv)
        conv_data.customer = CustomerBriefResponse.model_validate(conv.customer) if conv.customer else None
        conv_data.last_message = MessageResponse.model_validate(last_msg) if last_msg else None
        items.append(conv_data)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific conversation"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(
            Conversation.id == conversation_id,
            Conversation.business_id == business.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv_data = ConversationResponse.model_validate(conv)
    conv_data.customer = CustomerBriefResponse.model_validate(conv.customer) if conv.customer else None
    return conv_data


@router.get("/{conversation_id}/messages", response_model=PaginatedResponse)
async def get_conversation_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a conversation"""
    business = await get_user_business(current_user, db)

    # Verify conversation belongs to business
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == business.id,
        )
    )
    if not conv_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    count_query = select(func.count()).select_from(
        select(Message.id).where(Message.conversation_id == conversation_id).subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    messages = result.scalars().all()

    return PaginatedResponse(
        items=[MessageResponse.model_validate(m) for m in messages],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("/{conversation_id}/send", response_model=MessageResponse)
async def send_human_message(
    conversation_id: str,
    data: SendMessageRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Send a message as a human agent (take over from AI)"""
    business = await get_user_business(current_user, db)

    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(
            Conversation.id == conversation_id,
            Conversation.business_id == business.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Create message
    message = Message(
        conversation_id=conversation_id,
        role=MessageRole.HUMAN_AGENT,
        content=data.content,
    )
    db.add(message)

    # Update conversation status
    conv.status = ConversationStatus.HUMAN_HANDLING
    conv.message_count += 1

    await db.flush()

    # Send via Facebook Messenger
    from app.services.facebook import facebook_service
    await facebook_service.send_message(
        page_id=conv.facebook_page_id,
        recipient_id=conv.customer.platform_id,
        message_text=data.content,
        db=db,
    )

    return MessageResponse.model_validate(message)


@router.post("/{conversation_id}/takeover", response_model=SuccessResponse)
async def takeover_conversation(
    conversation_id: str,
    data: ConversationTakeoverRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Take over or return conversation to AI"""
    business = await get_user_business(current_user, db)

    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.business_id == business.id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if data.action == "take_over":
        conv.status = ConversationStatus.HUMAN_HANDLING
        msg = "Conversation taken over by human agent"
    elif data.action == "return_to_ai":
        conv.status = ConversationStatus.AI_HANDLING
        msg = "Conversation returned to AI"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    await db.flush()
    return SuccessResponse(message=msg)


# ============================================
# CUSTOMER ROUTES
# ============================================

customer_router = APIRouter(prefix="/customers", tags=["Customers"])


@customer_router.get("", response_model=PaginatedResponse)
async def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    segment: str = Query(None),
    search: str = Query(None),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """List customers"""
    business = await get_user_business(current_user, db)

    query = select(Customer).where(Customer.business_id == business.id)

    if segment:
        query = query.where(Customer.segment == segment)
    if search:
        query = query.where(Customer.name.ilike(f"%{search}%"))

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(desc(Customer.last_message_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    customers = result.scalars().all()

    return PaginatedResponse(
        items=[CustomerBriefResponse.model_validate(c) for c in customers],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@customer_router.get("/{customer_id}", response_model=CustomerDetailResponse)
async def get_customer(
    customer_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get customer details"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business.id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerDetailResponse.model_validate(customer)


@customer_router.put("/{customer_id}", response_model=CustomerDetailResponse)
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update customer details (tags, segment, notes)"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Customer).where(
            Customer.id == customer_id,
            Customer.business_id == business.id,
        )
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(customer, key, value)

    await db.flush()
    return CustomerDetailResponse.model_validate(customer)
