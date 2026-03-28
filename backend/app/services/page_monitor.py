"""
SmartRep AI - Page Monitor Service
Monitors Facebook/Instagram page posts and comments.
- Syncs new posts and learns content → Knowledge Base
- Fetches comments on posts and auto-replies using AI + RAG
- Handles real-time webhook events for new posts & comments
"""
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import google.generativeai as genai

from app.core.config import settings
from app.core.database import async_session
from app.models.models import (
    Business, FacebookPage, PagePost, PostCommentReply,
    KnowledgeBase, KnowledgeBaseType, AnalyticsEvent, Platform,
)
from app.services.facebook import facebook_service
from app.services.vector_store import vector_store


class PageMonitorService:
    """
    Core page monitoring service:
    1. Sync page posts → track in DB + learn content into KB
    2. Check post comments → auto-reply with AI
    3. Handle real-time webhook feed events
    """

    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "max_output_tokens": 512,
                },
            )
        return self._model

    # ============================================
    # 1. SYNC PAGE POSTS
    # ============================================

    async def sync_page_posts(
        self,
        business_id: str,
        fb_page_internal_id: str,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Fetch recent posts from the FB page, store new ones,
        and add post content to Knowledge Base for AI learning.
        """
        async with async_session() as db:
            # Get FB page
            result = await db.execute(
                select(FacebookPage).where(
                    FacebookPage.id == fb_page_internal_id,
                    FacebookPage.business_id == business_id,
                )
            )
            fb_page = result.scalar_one_or_none()
            if not fb_page:
                return {"error": "Facebook page not found", "posts_synced": 0}

            # Fetch posts from Facebook
            posts = await facebook_service.fetch_page_posts(
                page_id=fb_page.page_id,
                page_access_token=fb_page.page_access_token,
                limit=limit,
            )

            new_posts = 0
            updated_posts = 0
            kb_entries_added = 0

            for post_data in posts:
                post_fb_id = post_data.get("id", "")
                message = post_data.get("message", "")
                image_url = post_data.get("full_picture", "")
                permalink = post_data.get("permalink_url", "")
                post_type = post_data.get("type", "status")
                reactions = post_data.get("reactions", {}).get("summary", {}).get("total_count", 0)
                comments = post_data.get("comments", {}).get("summary", {}).get("total_count", 0)
                shares = post_data.get("shares", {}).get("count", 0) if post_data.get("shares") else 0
                created_time = post_data.get("created_time", "")

                # Parse created_time
                post_created_at = None
                if created_time:
                    try:
                        post_created_at = datetime.fromisoformat(created_time.replace("+0000", "+00:00"))
                    except Exception:
                        post_created_at = datetime.now(timezone.utc)

                # Check if post already tracked
                existing = await db.execute(
                    select(PagePost).where(PagePost.post_id == post_fb_id)
                )
                existing_post = existing.scalar_one_or_none()

                if existing_post:
                    # Update engagement counts
                    existing_post.reactions_count = reactions
                    existing_post.comments_count = comments
                    existing_post.shares_count = shares
                    if message and not existing_post.message:
                        existing_post.message = message
                    updated_posts += 1
                else:
                    # Create new tracked post
                    new_post = PagePost(
                        business_id=business_id,
                        facebook_page_id=fb_page_internal_id,
                        post_id=post_fb_id,
                        message=message,
                        post_type=post_type,
                        image_url=image_url,
                        permalink=permalink,
                        reactions_count=reactions,
                        comments_count=comments,
                        shares_count=shares,
                        post_created_at=post_created_at,
                        is_learned=False,
                    )
                    db.add(new_post)
                    await db.flush()
                    new_posts += 1

                    # Learn from post content → add to KB
                    if message and len(message.strip()) > 20:
                        kb_entry = await self._learn_from_post(
                            db, business_id, new_post, fb_page.page_name or ""
                        )
                        if kb_entry:
                            kb_entries_added += 1
                            new_post.is_learned = True

            await db.commit()

            logger.info(
                f"📊 Page sync complete: {new_posts} new, {updated_posts} updated, "
                f"{kb_entries_added} KB entries for page {fb_page.page_name}"
            )

            return {
                "posts_synced": new_posts + updated_posts,
                "new_posts": new_posts,
                "updated_posts": updated_posts,
                "kb_entries_added": kb_entries_added,
                "page_name": fb_page.page_name,
            }

    async def _learn_from_post(
        self,
        db: AsyncSession,
        business_id: str,
        post: PagePost,
        page_name: str,
    ) -> Optional[KnowledgeBase]:
        """Analyze a post's content and add to KB if it contains useful info"""
        try:
            model = self._get_model()

            prompt = f"""Analyze this Facebook Page post and determine if it contains useful business information 
(product info, offers, announcements, policies, tips, etc.) that a customer service AI should know.

Page: {page_name}
Post: {post.message or '(no text)'}
Image: {post.image_url or 'none'}
Engagement: {post.reactions_count} reactions, {post.comments_count} comments

If this post has useful info, return a structured summary as JSON:
{{
  "useful": true,
  "title": "Short title for this info",
  "content": "Summarized content that a customer service AI should know",
  "type": "product|offer|announcement|tip|policy|general"
}}

If this is just casual content (memes, personal stuff, greetings), return:
{{"useful": false}}

Return ONLY valid JSON."""

            response = await asyncio.to_thread(model.generate_content, prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)

            result = json.loads(text)

            if not result.get("useful"):
                return None

            # Create KB entry
            kb_type_map = {
                "product": KnowledgeBaseType.PRODUCT,
                "offer": KnowledgeBaseType.GENERAL,
                "announcement": KnowledgeBaseType.GENERAL,
                "tip": KnowledgeBaseType.GENERAL,
                "policy": KnowledgeBaseType.POLICY,
                "general": KnowledgeBaseType.GENERAL,
            }

            kb = KnowledgeBase(
                business_id=business_id,
                title=result.get("title", "Page Post Info"),
                content=result.get("content", post.message or ""),
                type=kb_type_map.get(result.get("type", "general"), KnowledgeBaseType.GENERAL),
                extra_metadata={
                    "source": "page_monitor",
                    "post_id": post.post_id,
                    "permalink": post.permalink,
                    "reactions": post.reactions_count,
                    "auto_learned": True,
                },
            )
            db.add(kb)
            await db.flush()

            # Add to vector store
            try:
                eid = await vector_store.add_document(
                    business_id=business_id,
                    doc_id=kb.id,
                    content=f"{kb.title}\n{kb.content}",
                    metadata={"type": result.get("type", "general"), "title": kb.title, "source": "page_monitor"},
                )
                kb.embedding_id = eid
            except Exception:
                pass

            logger.info(f"📚 Learned from post: {kb.title}")
            return kb

        except json.JSONDecodeError:
            logger.warning("AI returned invalid JSON for post learning")
            return None
        except Exception as e:
            logger.error(f"Failed to learn from post: {e}")
            return None

    # ============================================
    # 2. CHECK & REPLY TO COMMENTS
    # ============================================

    async def check_and_reply_comments(
        self,
        business_id: str,
        fb_page_internal_id: str,
        max_posts: int = 10,
        max_comments_per_post: int = 50,
    ) -> Dict[str, Any]:
        """
        Check recent posts for new comments and auto-reply.
        Only replies to comments that haven't been replied to yet.
        """
        async with async_session() as db:
            # Get business & FB page
            result = await db.execute(
                select(Business).where(Business.id == business_id)
            )
            business = result.scalar_one_or_none()
            if not business or not business.auto_comment_reply_enabled:
                return {"error": "Auto comment reply not enabled", "replies_sent": 0}

            result = await db.execute(
                select(FacebookPage).where(
                    FacebookPage.id == fb_page_internal_id,
                    FacebookPage.business_id == business_id,
                )
            )
            fb_page = result.scalar_one_or_none()
            if not fb_page:
                return {"error": "Facebook page not found", "replies_sent": 0}

            # Get recent tracked posts (most recent first)
            result = await db.execute(
                select(PagePost).where(
                    PagePost.business_id == business_id,
                    PagePost.facebook_page_id == fb_page_internal_id,
                ).order_by(PagePost.post_created_at.desc()).limit(max_posts)
            )
            tracked_posts = result.scalars().all()

            if not tracked_posts:
                return {"replies_sent": 0, "comments_checked": 0, "message": "No posts to check"}

            total_comments_checked = 0
            total_replies_sent = 0

            for post in tracked_posts:
                # Fetch comments from FB
                comments = await facebook_service.fetch_post_comments(
                    post_id=post.post_id,
                    page_access_token=fb_page.page_access_token,
                    limit=max_comments_per_post,
                )

                for comment in comments:
                    comment_id = comment.get("id", "")
                    comment_text = comment.get("message", "")
                    commenter = comment.get("from", {})
                    commenter_name = commenter.get("name", "Unknown")
                    commenter_id = commenter.get("id", "")

                    # Skip if comment from the page itself
                    if commenter_id == fb_page.page_id:
                        continue

                    # Skip empty comments
                    if not comment_text or len(comment_text.strip()) < 2:
                        continue

                    total_comments_checked += 1

                    # Check if already replied
                    existing_reply = await db.execute(
                        select(PostCommentReply).where(
                            PostCommentReply.comment_id == comment_id
                        )
                    )
                    if existing_reply.scalar_one_or_none():
                        continue

                    # Generate AI reply
                    reply_text = await self._generate_comment_reply(
                        business=business,
                        post_text=post.message or "",
                        comment_text=comment_text,
                        commenter_name=commenter_name,
                    )

                    if not reply_text:
                        continue

                    # Send reply via Facebook
                    reply_id = await facebook_service.reply_to_comment(
                        comment_id=comment_id,
                        message=reply_text,
                        page_access_token=fb_page.page_access_token,
                    )

                    if reply_id:
                        # Track the reply
                        comment_reply = PostCommentReply(
                            business_id=business_id,
                            page_post_id=post.id,
                            comment_id=comment_id,
                            commenter_name=commenter_name,
                            comment_text=comment_text,
                            reply_text=reply_text,
                        )
                        db.add(comment_reply)
                        post.comments_replied += 1
                        total_replies_sent += 1

                        # Track analytics
                        event = AnalyticsEvent(
                            business_id=business_id,
                            event_type="comment_auto_reply",
                            data={
                                "post_id": post.post_id,
                                "comment_id": comment_id,
                                "commenter": commenter_name,
                                "comment": comment_text[:200],
                                "reply": reply_text[:200],
                            },
                            platform=Platform.FACEBOOK,
                        )
                        db.add(event)

                # Update last check time
                post.last_comment_check_at = datetime.now(timezone.utc)

            await db.commit()

            logger.info(
                f"💬 Comment check complete: {total_comments_checked} checked, "
                f"{total_replies_sent} replied for page {fb_page.page_name}"
            )

            return {
                "replies_sent": total_replies_sent,
                "comments_checked": total_comments_checked,
                "posts_checked": len(tracked_posts),
                "page_name": fb_page.page_name,
            }

    async def _generate_comment_reply(
        self,
        business: Business,
        post_text: str,
        comment_text: str,
        commenter_name: str,
    ) -> Optional[str]:
        """Generate an AI reply for a post comment using RAG context"""
        try:
            model = self._get_model()

            # Search knowledge base for relevant context
            knowledge_results = await vector_store.search(
                business_id=business.id,
                query=f"{post_text} {comment_text}",
                n_results=5,
            )

            knowledge_context = ""
            if knowledge_results:
                knowledge_context = "\n\nRelevant Knowledge Base:\n"
                for i, doc in enumerate(knowledge_results, 1):
                    knowledge_context += f"{i}. {doc['content'][:300]}\n"

            prompt = f"""You are the social media manager for "{business.name}".
A customer commented on your Facebook page post. Generate a helpful, friendly reply.

BUSINESS: {business.name}
BUSINESS DESCRIPTION: {business.description or 'N/A'}

ORIGINAL POST: {post_text[:500] if post_text else '(photo/video post)'}

CUSTOMER COMMENT by {commenter_name}: {comment_text}

{knowledge_context}

RULES:
1. Reply as the business page (use "we", "our", not "I")
2. Be helpful, warm, and professional
3. If they ask about a product, give info from knowledge base
4. If they ask about price/availability, answer from knowledge base if possible
5. If asking to order/buy, guide them to message the page inbox
6. Keep it SHORT (1-3 sentences max for a comment reply)
7. Use appropriate language - if comment is in Bangla/Banglish, reply in same
8. Add 1-2 relevant emojis
9. If you can't answer, politely ask them to inbox for details
10. NEVER say you are AI

Reply:"""

            response = await asyncio.to_thread(model.generate_content, prompt)
            reply = response.text.strip()

            # Clean up: remove quotes if AI wraps in quotes
            if reply.startswith('"') and reply.endswith('"'):
                reply = reply[1:-1]

            # Sanity check: don't reply if too long or suspicious
            if len(reply) > 500:
                reply = reply[:497] + "..."

            return reply

        except Exception as e:
            logger.error(f"Failed to generate comment reply: {e}")
            return None

    # ============================================
    # 3. HANDLE REAL-TIME WEBHOOK EVENTS
    # ============================================

    async def handle_new_post_event(
        self,
        page_id: str,
        post_id: str,
    ):
        """Handle webhook event: new post created on the page"""
        async with async_session() as db:
            # Find page
            result = await db.execute(
                select(FacebookPage).where(FacebookPage.page_id == page_id)
            )
            fb_page = result.scalar_one_or_none()
            if not fb_page:
                logger.warning(f"Webhook: Unknown page {page_id}")
                return

            # Get business
            result = await db.execute(
                select(Business).where(Business.id == fb_page.business_id)
            )
            business = result.scalar_one_or_none()
            if not business or not business.page_monitor_enabled:
                return

            # Fetch post details
            post_data = await facebook_service.fetch_single_post(
                post_id=post_id,
                page_access_token=fb_page.page_access_token,
            )
            if not post_data:
                return

            # Check if already tracked
            existing = await db.execute(
                select(PagePost).where(PagePost.post_id == post_id)
            )
            if existing.scalar_one_or_none():
                return

            message = post_data.get("message", "")
            image_url = post_data.get("full_picture", "")
            permalink = post_data.get("permalink_url", "")

            # Create tracked post
            new_post = PagePost(
                business_id=business.id,
                facebook_page_id=fb_page.id,
                post_id=post_id,
                message=message,
                post_type=post_data.get("type", "status"),
                image_url=image_url,
                permalink=permalink,
                post_created_at=datetime.now(timezone.utc),
            )
            db.add(new_post)
            await db.flush()

            # Learn from post
            if message and len(message.strip()) > 20:
                kb = await self._learn_from_post(
                    db, business.id, new_post, fb_page.page_name or ""
                )
                if kb:
                    new_post.is_learned = True

            # Track analytics
            event = AnalyticsEvent(
                business_id=business.id,
                event_type="page_post_synced",
                data={
                    "post_id": post_id,
                    "has_text": bool(message),
                    "has_image": bool(image_url),
                    "auto_learned": new_post.is_learned,
                },
                platform=Platform.FACEBOOK,
            )
            db.add(event)

            await db.commit()
            logger.info(f"📝 New post tracked: {post_id} (learned: {new_post.is_learned})")

    async def handle_new_comment_event(
        self,
        page_id: str,
        post_id: str,
        comment_id: str,
    ):
        """Handle webhook event: new comment on a page post"""
        async with async_session() as db:
            # Find page
            result = await db.execute(
                select(FacebookPage).where(FacebookPage.page_id == page_id)
            )
            fb_page = result.scalar_one_or_none()
            if not fb_page:
                return

            # Get business
            result = await db.execute(
                select(Business).where(Business.id == fb_page.business_id)
            )
            business = result.scalar_one_or_none()
            if not business or not business.auto_comment_reply_enabled:
                return

            # Check if already replied to this comment
            existing_reply = await db.execute(
                select(PostCommentReply).where(PostCommentReply.comment_id == comment_id)
            )
            if existing_reply.scalar_one_or_none():
                return

            # Get/create tracked post
            result = await db.execute(
                select(PagePost).where(PagePost.post_id == post_id)
            )
            tracked_post = result.scalar_one_or_none()

            if not tracked_post:
                # Post not tracked yet, fetch & create
                post_data = await facebook_service.fetch_single_post(
                    post_id=post_id,
                    page_access_token=fb_page.page_access_token,
                )
                if not post_data:
                    return

                tracked_post = PagePost(
                    business_id=business.id,
                    facebook_page_id=fb_page.id,
                    post_id=post_id,
                    message=post_data.get("message", ""),
                    post_type=post_data.get("type", "status"),
                    image_url=post_data.get("full_picture", ""),
                    permalink=post_data.get("permalink_url", ""),
                    post_created_at=datetime.now(timezone.utc),
                )
                db.add(tracked_post)
                await db.flush()

            # Fetch comment details
            comment_data = await facebook_service.fetch_single_comment(
                comment_id=comment_id,
                page_access_token=fb_page.page_access_token,
            )
            if not comment_data:
                return

            comment_text = comment_data.get("message", "")
            commenter = comment_data.get("from", {})
            commenter_name = commenter.get("name", "Unknown")
            commenter_id = commenter.get("id", "")

            # Skip comments from the page itself
            if commenter_id == fb_page.page_id:
                return

            # Skip empty or too-short comments
            if not comment_text or len(comment_text.strip()) < 2:
                return

            # Skip replies to comments (only reply to top-level)
            if comment_data.get("parent"):
                return

            # Generate AI reply
            reply_text = await self._generate_comment_reply(
                business=business,
                post_text=tracked_post.message or "",
                comment_text=comment_text,
                commenter_name=commenter_name,
            )

            if not reply_text:
                return

            # Send reply
            reply_id = await facebook_service.reply_to_comment(
                comment_id=comment_id,
                message=reply_text,
                page_access_token=fb_page.page_access_token,
            )

            if reply_id:
                comment_reply = PostCommentReply(
                    business_id=business.id,
                    page_post_id=tracked_post.id,
                    comment_id=comment_id,
                    commenter_name=commenter_name,
                    comment_text=comment_text,
                    reply_text=reply_text,
                )
                db.add(comment_reply)
                tracked_post.comments_replied += 1

                # Track analytics
                event = AnalyticsEvent(
                    business_id=business.id,
                    event_type="comment_auto_reply",
                    data={
                        "post_id": post_id,
                        "comment_id": comment_id,
                        "commenter": commenter_name,
                        "comment": comment_text[:200],
                        "reply": reply_text[:200],
                        "source": "webhook_realtime",
                    },
                    platform=Platform.FACEBOOK,
                )
                db.add(event)

                await db.commit()
                logger.info(f"⚡ Real-time reply sent to {commenter_name} on post {post_id}")

    # ============================================
    # 4. FULL SYNC (Posts + Comments)
    # ============================================

    async def full_sync(
        self,
        business_id: str,
        fb_page_internal_id: str,
    ) -> Dict[str, Any]:
        """Run a full sync: sync posts + check & reply to all comments"""
        sync_result = await self.sync_page_posts(business_id, fb_page_internal_id)
        comment_result = await self.check_and_reply_comments(business_id, fb_page_internal_id)

        return {
            "sync": sync_result,
            "comments": comment_result,
            "message": (
                f"Synced {sync_result.get('new_posts', 0)} new posts, "
                f"learned {sync_result.get('kb_entries_added', 0)} entries, "
                f"replied to {comment_result.get('replies_sent', 0)} comments"
            ),
        }

    # ============================================
    # 5. GET MONITORING STATS
    # ============================================

    async def get_monitor_stats(
        self,
        business_id: str,
        fb_page_internal_id: str,
    ) -> Dict[str, Any]:
        """Get monitoring stats for a page"""
        async with async_session() as db:
            # Total tracked posts
            result = await db.execute(
                select(func.count(PagePost.id)).where(
                    PagePost.business_id == business_id,
                    PagePost.facebook_page_id == fb_page_internal_id,
                )
            )
            total_posts = result.scalar() or 0

            # Posts learned
            result = await db.execute(
                select(func.count(PagePost.id)).where(
                    PagePost.business_id == business_id,
                    PagePost.facebook_page_id == fb_page_internal_id,
                    PagePost.is_learned == True,
                )
            )
            posts_learned = result.scalar() or 0

            # Total comments replied
            result = await db.execute(
                select(func.count(PostCommentReply.id)).where(
                    PostCommentReply.business_id == business_id,
                )
            )
            total_replies = result.scalar() or 0

            # Recent replies (last 24h)
            yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
            result = await db.execute(
                select(func.count(PostCommentReply.id)).where(
                    PostCommentReply.business_id == business_id,
                    PostCommentReply.created_at >= yesterday,
                )
            )
            recent_replies = result.scalar() or 0

            # Recent replies list (last 20)
            result = await db.execute(
                select(PostCommentReply).where(
                    PostCommentReply.business_id == business_id,
                ).order_by(PostCommentReply.created_at.desc()).limit(20)
            )
            recent_reply_records = result.scalars().all()

            return {
                "total_posts_tracked": total_posts,
                "posts_learned": posts_learned,
                "total_comments_replied": total_replies,
                "replies_last_24h": recent_replies,
                "recent_replies": [
                    {
                        "commenter": r.commenter_name,
                        "comment": r.comment_text[:150] if r.comment_text else "",
                        "reply": r.reply_text[:150] if r.reply_text else "",
                        "replied_at": r.replied_at.isoformat() if r.replied_at else "",
                    }
                    for r in recent_reply_records
                ],
            }


# Singleton
page_monitor = PageMonitorService()
