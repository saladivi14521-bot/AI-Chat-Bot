"""
SmartRep AI - Facebook Messenger Service
Handles sending/receiving messages via Facebook Graph API
"""
import httpx
from typing import Optional, Dict, List
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.models import FacebookPage


class FacebookService:
    """Facebook Messenger API integration"""

    def __init__(self):
        self.base_url = settings.FB_GRAPH_API_URL

    async def send_message(
        self,
        page_id: str,
        recipient_id: str,
        message_text: str,
        db: AsyncSession,
    ) -> bool:
        """Send a text message via Facebook Messenger"""
        try:
            # Get page access token
            result = await db.execute(
                select(FacebookPage).where(FacebookPage.id == page_id)
            )
            page = result.scalar_one_or_none()
            if not page:
                logger.error(f"Facebook page not found: {page_id}")
                return False

            url = f"{self.base_url}/me/messages"
            payload = {
                "recipient": {"id": recipient_id},
                "message": {"text": message_text},
                "messaging_type": "RESPONSE",
            }
            params = {"access_token": page.page_access_token}

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, params=params, timeout=30)

                if response.status_code == 200:
                    logger.info(f"Message sent to {recipient_id}")
                    return True
                else:
                    logger.error(f"FB API error: {response.status_code} - {response.text}")
                    return False

        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False

    async def send_typing_indicator(
        self,
        page_access_token: str,
        recipient_id: str,
        action: str = "typing_on",
    ):
        """Send typing indicator"""
        try:
            url = f"{self.base_url}/me/messages"
            payload = {
                "recipient": {"id": recipient_id},
                "sender_action": action,
            }
            params = {"access_token": page_access_token}

            async with httpx.AsyncClient() as client:
                await client.post(url, json=payload, params=params, timeout=10)
        except Exception as e:
            logger.error(f"Typing indicator failed: {e}")

    async def get_user_profile(
        self,
        user_id: str,
        page_access_token: str,
    ) -> Optional[Dict]:
        """Get Facebook user profile"""
        try:
            url = f"{self.base_url}/{user_id}"
            params = {
                "fields": "first_name,last_name,profile_pic",
                "access_token": page_access_token,
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    return {
                        "name": f"{data.get('first_name', '')} {data.get('last_name', '')}".strip(),
                        "profile_picture": data.get("profile_pic"),
                    }
                return None
        except Exception as e:
            logger.error(f"Failed to get user profile: {e}")
            return None

    async def subscribe_to_page(self, page_access_token: str) -> bool:
        """Subscribe app to page webhooks (messaging + feed)"""
        try:
            url = f"{self.base_url}/me/subscribed_apps"
            params = {"access_token": page_access_token}
            payload = {
                "subscribed_fields": [
                    "messages", "messaging_postbacks", "messaging_optins",
                    "feed",  # New posts, comments, reactions on page
                ],
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, params=params, timeout=30)
                if response.status_code == 200:
                    logger.info("Subscribed to page webhooks (messages + feed)")
                    return True
                else:
                    logger.error(f"Subscribe failed: {response.text}")
                    return False
        except Exception as e:
            logger.error(f"Page subscription failed: {e}")
            return False

    # ============================================
    # POST & COMMENT METHODS (NEW)
    # ============================================

    async def fetch_page_posts(
        self,
        page_id: str,
        page_access_token: str,
        limit: int = 50,
    ) -> List[Dict]:
        """Fetch recent posts from a Facebook Page"""
        try:
            url = f"{self.base_url}/{page_id}/posts"
            params = {
                "access_token": page_access_token,
                "fields": "id,message,created_time,full_picture,permalink_url,type,"
                          "shares,reactions.summary(true),comments.summary(true)",
                "limit": limit,
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    posts = data.get("data", [])
                    logger.info(f"📱 Fetched {len(posts)} posts from page {page_id}")
                    return posts
                else:
                    logger.error(f"Failed to fetch posts: {response.status_code} {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Failed to fetch page posts: {e}")
            return []

    async def fetch_post_comments(
        self,
        post_id: str,
        page_access_token: str,
        limit: int = 100,
    ) -> List[Dict]:
        """Fetch comments on a specific post"""
        try:
            url = f"{self.base_url}/{post_id}/comments"
            params = {
                "access_token": page_access_token,
                "fields": "id,from,message,created_time,attachment,comment_count,like_count",
                "limit": limit,
                "order": "reverse_chronological",
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    comments = data.get("data", [])
                    logger.info(f"💬 Fetched {len(comments)} comments for post {post_id}")
                    return comments
                else:
                    logger.error(f"Failed to fetch comments: {response.status_code} {response.text}")
                    return []
        except Exception as e:
            logger.error(f"Failed to fetch post comments: {e}")
            return []

    async def reply_to_comment(
        self,
        comment_id: str,
        message: str,
        page_access_token: str,
    ) -> Optional[str]:
        """Reply to a comment on a post. Returns the reply comment ID."""
        try:
            url = f"{self.base_url}/{comment_id}/comments"
            payload = {"message": message}
            params = {"access_token": page_access_token}

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, json=payload, params=params)
                if response.status_code == 200:
                    reply_id = response.json().get("id")
                    logger.info(f"✅ Replied to comment {comment_id}: {reply_id}")
                    return reply_id
                else:
                    logger.error(f"Failed to reply to comment: {response.status_code} {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Failed to reply to comment: {e}")
            return None

    async def fetch_single_post(
        self,
        post_id: str,
        page_access_token: str,
    ) -> Optional[Dict]:
        """Fetch details for a single post by ID"""
        try:
            url = f"{self.base_url}/{post_id}"
            params = {
                "access_token": page_access_token,
                "fields": "id,message,created_time,full_picture,permalink_url,type,"
                          "shares,reactions.summary(true),comments.summary(true)",
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to fetch post {post_id}: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Failed to fetch post {post_id}: {e}")
            return None

    async def fetch_single_comment(
        self,
        comment_id: str,
        page_access_token: str,
    ) -> Optional[Dict]:
        """Fetch details for a single comment by ID"""
        try:
            url = f"{self.base_url}/{comment_id}"
            params = {
                "access_token": page_access_token,
                "fields": "id,from,message,created_time,attachment,parent",
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to fetch comment {comment_id}: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Failed to fetch comment {comment_id}: {e}")
            return None


# Singleton
facebook_service = FacebookService()
