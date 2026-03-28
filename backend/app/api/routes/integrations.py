"""
SmartRep AI - Facebook Integration Routes
Supports OAuth flow for auto-connecting Facebook Pages + Page Monitoring.
"""
from datetime import datetime, timezone

from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from pydantic import BaseModel
from typing import Optional
from loguru import logger
from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, Business, FacebookPage, Subscription, PageConnectionStatus
from app.schemas.schemas import (
    FacebookPageConnect, FacebookPageResponse, SuccessResponse
)
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business
from app.services.facebook import facebook_service
from app.services.page_monitor import page_monitor

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ============================================
# FACEBOOK OAUTH FLOW
# ============================================

@router.get("/facebook/auth-url")
async def get_facebook_auth_url(
    current_user: User = Depends(get_current_business_owner),
):
    """
    Returns the Facebook OAuth URL.
    The frontend redirects the user to this URL to start the OAuth flow.
    We embed the user's ID in the state parameter for the callback.
    """
    if not settings.FB_APP_ID or settings.FB_APP_ID == "your-facebook-app-id":
        raise HTTPException(
            status_code=400,
            detail="Facebook App not configured. Please set FB_APP_ID and FB_APP_SECRET in .env"
        )

    callback_url = f"{settings.FRONTEND_URL}/dashboard/integrations/facebook/callback"

    params = {
        "client_id": settings.FB_APP_ID,
        "redirect_uri": callback_url,
        "scope": "pages_show_list,pages_messaging,pages_manage_metadata",
        "state": str(current_user.id),
        "response_type": "code",
    }

    auth_url = f"https://www.facebook.com/v21.0/dialog/oauth?{urlencode(params)}"
    return {"auth_url": auth_url, "callback_url": callback_url}


@router.post("/facebook/oauth-callback")
async def handle_facebook_oauth_callback(
    code: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange the OAuth code for tokens and auto-connect all user's Facebook Pages.
    Called by the frontend after Facebook redirects back with the code.
    """
    business = await get_user_business(current_user, db)
    callback_url = f"{settings.FRONTEND_URL}/dashboard/integrations/facebook/callback"

    # Step 1: Exchange code for user access token
    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.get(
            f"{settings.FB_GRAPH_API_URL}/oauth/access_token",
            params={
                "client_id": settings.FB_APP_ID,
                "client_secret": settings.FB_APP_SECRET,
                "redirect_uri": callback_url,
                "code": code,
            },
        )

    if token_resp.status_code != 200:
        logger.error(f"FB token exchange failed: {token_resp.text}")
        raise HTTPException(status_code=400, detail="Failed to exchange code for token. Please try again.")

    token_data = token_resp.json()
    user_access_token = token_data.get("access_token")
    if not user_access_token:
        raise HTTPException(status_code=400, detail="No access token received from Facebook")

    # Step 2: Get long-lived user token
    async with httpx.AsyncClient(timeout=30) as client:
        ll_resp = await client.get(
            f"{settings.FB_GRAPH_API_URL}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.FB_APP_ID,
                "client_secret": settings.FB_APP_SECRET,
                "fb_exchange_token": user_access_token,
            },
        )
    if ll_resp.status_code == 200:
        ll_data = ll_resp.json()
        user_access_token = ll_data.get("access_token", user_access_token)

    # Step 3: Get user's pages
    async with httpx.AsyncClient(timeout=30) as client:
        pages_resp = await client.get(
            f"{settings.FB_GRAPH_API_URL}/me/accounts",
            params={
                "access_token": user_access_token,
                "fields": "id,name,access_token,picture.width(100).height(100)",
            },
        )

    if pages_resp.status_code != 200:
        logger.error(f"FB pages fetch failed: {pages_resp.text}")
        raise HTTPException(status_code=400, detail="Failed to fetch Facebook Pages")

    pages_data = pages_resp.json().get("data", [])
    if not pages_data:
        return {
            "success": True,
            "message": "No Facebook Pages found on your account. Make sure you are an admin of at least one page.",
            "pages_connected": 0,
            "pages": [],
        }

    # Step 4: Connect each page
    connected_pages = []
    skipped = 0
    for fb_page in pages_data:
        page_id = fb_page["id"]
        page_name = fb_page.get("name", "")
        page_token = fb_page.get("access_token", "")
        picture_url = ""
        pic_data = fb_page.get("picture", {}).get("data", {})
        if pic_data:
            picture_url = pic_data.get("url", "")

        # Check if already connected (globally, since page_id is unique)
        existing = await db.execute(
            select(FacebookPage).where(
                FacebookPage.page_id == page_id,
            )
        )
        existing_page = existing.scalar_one_or_none()
        if existing_page:
            # Update token, picture, and reassign to this business
            existing_page.business_id = business.id
            existing_page.page_access_token = page_token
            existing_page.page_name = page_name
            existing_page.page_picture_url = picture_url
            existing_page.is_active = True
            existing_page.status = PageConnectionStatus.CONNECTED
            existing_page.connected_at = datetime.now(timezone.utc)
            connected_pages.append({
                "page_id": page_id,
                "page_name": page_name,
                "picture_url": picture_url,
                "status": "reconnected",
            })
            continue

        # Subscribe to page webhooks
        try:
            await facebook_service.subscribe_to_page(page_token)
        except Exception as e:
            logger.warning(f"Failed to subscribe page {page_name}: {e}")

        # Create new page record
        new_page = FacebookPage(
            business_id=business.id,
            page_id=page_id,
            page_name=page_name,
            page_access_token=page_token,
            page_picture_url=picture_url,
            status=PageConnectionStatus.CONNECTED,
        )
        db.add(new_page)
        connected_pages.append({
            "page_id": page_id,
            "page_name": page_name,
            "picture_url": picture_url,
            "status": "connected",
        })

    await db.flush()

    logger.info(f"✅ Connected {len(connected_pages)} Facebook pages for business {business.name}")

    return {
        "success": True,
        "message": f"Successfully connected {len(connected_pages)} Facebook Page(s)!",
        "pages_connected": len(connected_pages),
        "pages": connected_pages,
    }


# ============================================
# MANUAL CONNECT (existing)
# ============================================


@router.post("/facebook/connect", response_model=FacebookPageResponse)
async def connect_facebook_page(
    data: FacebookPageConnect,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Connect a Facebook Page to the business"""
    business = await get_user_business(current_user, db)

    # Check subscription page limit
    result = await db.execute(
        select(Subscription).where(Subscription.business_id == business.id)
    )
    subscription = result.scalar_one_or_none()

    connected_pages_result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.business_id == business.id,
            FacebookPage.is_active == True,
        )
    )
    connected_count = len(connected_pages_result.scalars().all())

    if subscription and connected_count >= subscription.pages_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Page limit reached ({subscription.pages_limit}). Upgrade your plan.",
        )

    # Check if page already connected
    existing = await db.execute(
        select(FacebookPage).where(FacebookPage.page_id == data.page_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This page is already connected")

    # Subscribe to webhooks
    await facebook_service.subscribe_to_page(data.page_access_token)

    # Create page
    page = FacebookPage(
        business_id=business.id,
        page_id=data.page_id,
        page_name=data.page_name,
        page_access_token=data.page_access_token,
        page_picture_url=data.page_picture_url,
        status=PageConnectionStatus.CONNECTED,
    )
    db.add(page)
    await db.flush()

    return FacebookPageResponse.model_validate(page)


@router.get("/facebook/pages", response_model=list[FacebookPageResponse])
async def list_facebook_pages(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """List connected Facebook Pages"""
    business = await get_user_business(current_user, db)

    result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.business_id == business.id,
            FacebookPage.is_active == True
        )
    )
    pages = result.scalars().all()

    return [FacebookPageResponse.model_validate(p) for p in pages]


@router.delete("/facebook/pages/{page_id}", response_model=SuccessResponse)
async def disconnect_facebook_page(
    page_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Disconnect a Facebook Page"""
    business = await get_user_business(current_user, db)

    result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.id == page_id,
            FacebookPage.business_id == business.id,
        )
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    await db.delete(page)
    await db.flush()

    return SuccessResponse(message="Facebook Page disconnected and removed")


# ============================================
# PAGE MONITORING & AUTO COMMENT REPLY
# ============================================

class PageMonitorSettingsRequest(BaseModel):
    auto_comment_reply_enabled: Optional[bool] = None
    page_monitor_enabled: Optional[bool] = None
    page_sync_interval_minutes: Optional[int] = None


@router.get("/page-monitor/settings")
async def get_page_monitor_settings(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get current page monitoring and auto-reply settings"""
    business = await get_user_business(current_user, db)
    return {
        "auto_comment_reply_enabled": business.auto_comment_reply_enabled,
        "page_monitor_enabled": business.page_monitor_enabled,
        "page_sync_interval_minutes": business.page_sync_interval_minutes,
    }


@router.put("/page-monitor/settings")
async def update_page_monitor_settings(
    data: PageMonitorSettingsRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Update page monitoring and auto-reply settings"""
    business = await get_user_business(current_user, db)

    if data.auto_comment_reply_enabled is not None:
        business.auto_comment_reply_enabled = data.auto_comment_reply_enabled
    if data.page_monitor_enabled is not None:
        business.page_monitor_enabled = data.page_monitor_enabled
    if data.page_sync_interval_minutes is not None:
        business.page_sync_interval_minutes = max(5, min(1440, data.page_sync_interval_minutes))

    await db.flush()
    await db.commit()

    return {
        "success": True,
        "message": "Settings updated",
        "auto_comment_reply_enabled": business.auto_comment_reply_enabled,
        "page_monitor_enabled": business.page_monitor_enabled,
        "page_sync_interval_minutes": business.page_sync_interval_minutes,
    }


@router.post("/page-monitor/sync/{page_id}")
async def sync_page_content(
    page_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a full sync for a Facebook Page:
    - Fetches all recent posts
    - Learns new content into Knowledge Base
    - Checks comments and auto-replies if enabled
    """
    business = await get_user_business(current_user, db)

    # Verify page belongs to business
    result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.id == page_id,
            FacebookPage.business_id == business.id,
        )
    )
    fb_page = result.scalar_one_or_none()
    if not fb_page:
        raise HTTPException(status_code=404, detail="Facebook page not found")

    # Run full sync
    sync_result = await page_monitor.full_sync(
        business_id=business.id,
        fb_page_internal_id=page_id,
    )

    return {
        "success": True,
        **sync_result,
    }


@router.get("/page-monitor/stats/{page_id}")
async def get_page_monitor_stats(
    page_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get monitoring stats for a connected Facebook page"""
    business = await get_user_business(current_user, db)

    result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.id == page_id,
            FacebookPage.business_id == business.id,
        )
    )
    fb_page = result.scalar_one_or_none()
    if not fb_page:
        raise HTTPException(status_code=404, detail="Facebook page not found")

    stats = await page_monitor.get_monitor_stats(
        business_id=business.id,
        fb_page_internal_id=page_id,
    )

    return {
        "success": True,
        "page_name": fb_page.page_name,
        **stats,
    }


@router.post("/page-monitor/check-comments/{page_id}")
async def check_and_reply_comments(
    page_id: str,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger comment check and auto-reply for a page"""
    business = await get_user_business(current_user, db)

    if not business.auto_comment_reply_enabled:
        raise HTTPException(
            status_code=400,
            detail="Auto comment reply is not enabled. Enable it in settings first."
        )

    result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.id == page_id,
            FacebookPage.business_id == business.id,
        )
    )
    fb_page = result.scalar_one_or_none()
    if not fb_page:
        raise HTTPException(status_code=404, detail="Facebook page not found")

    comment_result = await page_monitor.check_and_reply_comments(
        business_id=business.id,
        fb_page_internal_id=page_id,
    )

    return {
        "success": True,
        **comment_result,
    }
