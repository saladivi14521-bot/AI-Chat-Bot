"""
SmartRep AI - Order Routes
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import User, Business, Order, OrderItem
from app.schemas.schemas import (
    OrderCreate, OrderUpdate, OrderResponse, OrderItemResponse,
    PaginatedResponse, SuccessResponse
)
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business

router = APIRouter(prefix="/orders", tags=["Orders"])


def generate_order_number():
    return f"SR-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.get("", response_model=PaginatedResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str = Query(None, alias="status"),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """List all orders for the business"""
    business = await get_user_business(current_user, db)

    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.business_id == business.id)
    )

    if status_filter:
        query = query.where(Order.status == status_filter)

    count_query = select(func.count()).select_from(
        select(Order.id).where(Order.business_id == business.id).subquery()
    )
    if status_filter:
        count_query = select(func.count()).select_from(
            select(Order.id)
            .where(Order.business_id == business.id, Order.status == status_filter)
            .subquery()
        )
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(desc(Order.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    orders = result.scalars().unique().all()

    return PaginatedResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific order"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.business_id == business.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse.model_validate(order)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Create a manual order"""
    business = await get_user_business(current_user, db)

    subtotal = sum(item.unit_price * item.quantity for item in data.items)
    total = subtotal - data.discount + data.delivery_charge

    order = Order(
        business_id=business.id,
        customer_id=data.customer_id,
        order_number=generate_order_number(),
        subtotal=subtotal,
        discount=data.discount,
        delivery_charge=data.delivery_charge,
        total=total,
        currency=business.currency,
        delivery_address=data.delivery_address,
        delivery_phone=data.delivery_phone,
        customer_name=data.customer_name,
        payment_method=data.payment_method,
        notes=data.notes,
        ai_extracted=False,
    )
    db.add(order)
    await db.flush()

    for item_data in data.items:
        item = OrderItem(
            order_id=order.id,
            product_id=item_data.product_id,
            product_name=item_data.product_name,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total_price=item_data.unit_price * item_data.quantity,
            variant=item_data.variant,
        )
        db.add(item)

    await db.flush()

    # Re-fetch with items
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order.id)
    )
    order = result.scalar_one()
    return OrderResponse.model_validate(order)


@router.put("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    data: OrderUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update order status, tracking, etc."""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.business_id == business.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    await db.flush()
    return OrderResponse.model_validate(order)
