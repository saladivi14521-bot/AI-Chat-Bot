"""
SmartRep AI - Main FastAPI Application
Your AI-Powered Business Representative
"""
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


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
