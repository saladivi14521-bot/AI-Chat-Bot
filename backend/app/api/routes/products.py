"""
SmartRep AI - Product Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import User, Business, Product
from app.schemas.schemas import (
    ProductCreate, ProductUpdate, ProductResponse,
    PaginatedResponse, SuccessResponse
)
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str = Query(None),
    search: str = Query(None),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """List all products for the business"""
    business = await get_user_business(current_user, db)

    query = select(Product).where(Product.business_id == business.id)

    if category:
        query = query.where(Product.category == category)
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Product.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    products = result.scalars().all()

    return PaginatedResponse(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Create a new product"""
    business = await get_user_business(current_user, db)

    product = Product(
        business_id=business.id,
        **data.model_dump(),
    )
    db.add(product)
    await db.flush()

    # TODO: Generate AI description & embed in ChromaDB

    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific product"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update a product"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    await db.flush()

    # TODO: Re-embed in ChromaDB if content changed

    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", response_model=SuccessResponse)
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Delete a product"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.delete(product)
    await db.flush()

    # TODO: Remove from ChromaDB

    return SuccessResponse(message="Product deleted successfully")


@router.post("/bulk-delete", response_model=SuccessResponse)
async def bulk_delete_products(
    ids: List[str] = Body(..., embed=True),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple products at once"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Product).where(
            Product.business_id == business.id,
            Product.id.in_(ids),
        )
    )
    products = result.scalars().all()
    deleted = 0
    for product in products:
        await db.delete(product)
        deleted += 1
    await db.flush()
    return SuccessResponse(message=f"{deleted} products deleted successfully")


@router.post("/{product_id}/generate-description", response_model=ProductResponse)
async def generate_ai_description(
    product_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI description for a product"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.business_id == business.id,
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Generate AI description using Gemini
    from app.services.ai_engine import ai_engine
    description = await ai_engine.generate_product_description(product)
    product.ai_description = description
    await db.flush()

    return ProductResponse.model_validate(product)
