"""
SmartRep AI - Main FastAPI Application
Your AI-Powered Business Representative
"""
import os
# Suppress grpc plugin_credentials errors BEFORE any grpc imports
os.environ["GRPC_VERBOSITY"] = "NONE"
os.environ["GRPC_TRACE"] = ""
os.environ["GRPC_ENABLE_FORK_SUPPORT"] = "0"

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import init_db, engine
from app.core.security import hash_password
from app.api.routes import auth, business, products, knowledge_base, conversations, analytics, admin, webhook, integrations, orders, scraper


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events"""
    logger.info("🚀 Starting SmartRep AI Backend...")

    # Initialize database
    await init_db()
    logger.info("✅ Database initialized")

    # Create admin user if not exists
    await create_admin_user()

    # Sync products & knowledge base to ChromaDB in background (don't block server startup)
    import asyncio
    asyncio.create_task(_background_sync())

    logger.info("✅ SmartRep AI Backend is ready!")
    yield

    # Shutdown
    await engine.dispose()
    logger.info("👋 SmartRep AI Backend shut down")


async def create_admin_user():
    """Create the super admin user on first startup"""
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.models import User, UserRole

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        admin = result.scalar_one_or_none()

        if not admin:
            admin = User(
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                full_name="Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            await db.commit()
            logger.info(f"✅ Admin user created: {settings.ADMIN_EMAIL}")
        else:
            logger.info("ℹ️ Admin user already exists")


async def _background_sync():
    """Run sync in background so server starts immediately"""
    try:
        await asyncio.sleep(2)  # Let server fully start first
        logger.info("📚 Starting background knowledge sync...")
        await sync_knowledge_to_vectorstore()
    except Exception as e:
        logger.error(f"Background sync failed: {e}")


async def sync_knowledge_to_vectorstore():
    """Sync all products and knowledge base articles to ChromaDB on startup.
    This is needed because Railway uses in-memory ChromaDB that resets on each deploy."""
    from sqlalchemy import select
    from app.core.database import async_session
    from app.models.models import Product, KnowledgeBase, Business
    from app.services.vector_store import vector_store

    try:
        async with async_session() as db:
            # Get all businesses
            result = await db.execute(select(Business))
            businesses = result.scalars().all()

            total_products = 0
            total_kb = 0

            for biz in businesses:
                # Sync products
                prod_result = await db.execute(
                    select(Product).where(
                        Product.business_id == biz.id,
                        Product.is_available == True,
                    )
                )
                products = prod_result.scalars().all()

                for prod in products:
                    doc_content = f"Product: {prod.name}"
                    if prod.description:
                        doc_content += f"\nDescription: {prod.description}"
                    if prod.price:
                        doc_content += f"\nPrice: {prod.price} {prod.currency}"
                    if prod.sale_price:
                        doc_content += f"\nSale Price: {prod.sale_price} {prod.currency}"
                    if prod.category:
                        doc_content += f"\nCategory: {prod.category}"
                    if prod.stock_quantity is not None:
                        doc_content += f"\nStock: {prod.stock_quantity}"
                    if prod.ai_description:
                        doc_content += f"\n{prod.ai_description}"

                    try:
                        await vector_store.add_document(
                            business_id=str(biz.id),
                            doc_id=f"product_{prod.id}",
                            content=doc_content,
                            metadata={"type": "product", "name": prod.name, "price": str(prod.price)},
                        )
                        total_products += 1
                    except Exception as e:
                        logger.warning(f"Failed to sync product {prod.name}: {e}")

                # Sync knowledge base articles
                kb_result = await db.execute(
                    select(KnowledgeBase).where(
                        KnowledgeBase.business_id == biz.id,
                        KnowledgeBase.is_active == True,
                    )
                )
                articles = kb_result.scalars().all()

                for article in articles:
                    try:
                        await vector_store.add_document(
                            business_id=str(biz.id),
                            doc_id=f"kb_{article.id}",
                            content=f"{article.title}\n{article.content}",
                            metadata={"type": "knowledge_base", "title": article.title},
                        )
                        total_kb += 1
                    except Exception as e:
                        logger.warning(f"Failed to sync KB article {article.title}: {e}")

            logger.info(f"📚 Synced to ChromaDB: {total_products} products, {total_kb} KB articles across {len(businesses)} businesses")

    except Exception as e:
        logger.error(f"Knowledge sync failed (non-fatal): {e}")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Business Representative for F-Commerce & E-Commerce",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(business.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(knowledge_base.router, prefix="/api/v1")
app.include_router(conversations.router, prefix="/api/v1")
app.include_router(conversations.customer_router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(webhook.router, prefix="/api/v1")
app.include_router(integrations.router, prefix="/api/v1")
app.include_router(scraper.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "message": "Welcome to SmartRep AI - Your AI-Powered Business Representative 🚀",
    }


@app.get("/debug/chromadb")
async def debug_chromadb():
    """Check ChromaDB status and document count"""
    from app.services.vector_store import vector_store
    try:
        collections = vector_store.client.list_collections()
        result = {"collections": []}
        for col in collections:
            result["collections"].append({
                "name": col.name,
                "count": col.count(),
            })
        result["total_collections"] = len(collections)
        result["client_type"] = type(vector_store.client).__name__
        return result
    except Exception as e:
        return {"error": str(e)}


@app.get("/debug/force-sync")
async def force_sync():
    """Force sync products and KB to ChromaDB"""
    try:
        await sync_knowledge_to_vectorstore()
        return {"status": "sync completed"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
