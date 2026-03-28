"""
SmartRep AI - Knowledge Base Routes
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import User, Business, KnowledgeBase
from app.schemas.schemas import (
    KnowledgeBaseCreate, KnowledgeBaseUpdate, KnowledgeBaseResponse,
    PaginatedResponse, SuccessResponse
)
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])


@router.get("", response_model=PaginatedResponse)
async def list_knowledge_base(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: str = Query(None),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """List all knowledge base entries"""
    business = await get_user_business(current_user, db)

    query = select(KnowledgeBase).where(KnowledgeBase.business_id == business.id)

    if type:
        query = query.where(KnowledgeBase.type == type)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(KnowledgeBase.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedResponse(
        items=[KnowledgeBaseResponse.model_validate(kb) for kb in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=KnowledgeBaseResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    data: KnowledgeBaseCreate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Create a new knowledge base entry"""
    business = await get_user_business(current_user, db)

    kb = KnowledgeBase(
        business_id=business.id,
        title=data.title,
        content=data.content,
        type=data.type,
        extra_metadata=data.metadata,
    )
    db.add(kb)
    await db.flush()

    # Embed in ChromaDB
    from app.services.vector_store import vector_store
    embedding_id = await vector_store.add_document(
        business_id=business.id,
        doc_id=kb.id,
        content=f"{kb.title}\n{kb.content}",
        metadata={"type": kb.type, "title": kb.title},
    )
    kb.embedding_id = embedding_id
    await db.flush()

    return KnowledgeBaseResponse.model_validate(kb)


@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
async def get_knowledge_base(
    kb_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific knowledge base entry"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.business_id == business.id,
        )
    )
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")
    return KnowledgeBaseResponse.model_validate(kb)


@router.put("/{kb_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge_base(
    kb_id: str,
    data: KnowledgeBaseUpdate,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update a knowledge base entry"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.business_id == business.id,
        )
    )
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(kb, key, value)

    await db.flush()

    # Re-embed in ChromaDB
    from app.services.vector_store import vector_store
    await vector_store.update_document(
        business_id=business.id,
        doc_id=kb.id,
        content=f"{kb.title}\n{kb.content}",
        metadata={"type": kb.type, "title": kb.title},
    )

    return KnowledgeBaseResponse.model_validate(kb)


@router.delete("/{kb_id}", response_model=SuccessResponse)
async def delete_knowledge_base(
    kb_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Delete a knowledge base entry"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.id == kb_id,
            KnowledgeBase.business_id == business.id,
        )
    )
    kb = result.scalar_one_or_none()
    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge base entry not found")

    # Remove from ChromaDB
    from app.services.vector_store import vector_store
    await vector_store.delete_document(business_id=business.id, doc_id=kb.id)

    await db.delete(kb)
    await db.flush()

    return SuccessResponse(message="Knowledge base entry deleted")


@router.post("/bulk-delete", response_model=SuccessResponse)
async def bulk_delete_knowledge_base(
    ids: List[str] = Body(..., embed=True),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple knowledge base entries at once"""
    business = await get_user_business(current_user, db)
    result = await db.execute(
        select(KnowledgeBase).where(
            KnowledgeBase.business_id == business.id,
            KnowledgeBase.id.in_(ids),
        )
    )
    entries = result.scalars().all()
    deleted = 0
    for kb in entries:
        try:
            from app.services.vector_store import vector_store
            await vector_store.delete_document(business_id=business.id, doc_id=kb.id)
        except Exception:
            pass
        await db.delete(kb)
        deleted += 1
    await db.flush()
    return SuccessResponse(message=f"{deleted} entries deleted successfully")
