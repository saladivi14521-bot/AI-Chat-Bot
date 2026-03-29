"""
SmartRep AI - Facebook Webhook Routes
Handles incoming messages from Facebook Messenger + Feed events (posts, comments)
"""
import asyncio
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger
from app.core.config import settings
from app.core.database import get_db, async_session
from app.models.models import (
    FacebookPage, Business, Customer, Conversation, Message,
    AnalyticsEvent, Platform, ConversationStatus, MessageRole,
    CustomerSegment, SentimentType
)
from app.services.ai_engine import ai_engine
from app.services.facebook import facebook_service
from app.services.page_monitor import page_monitor

router = APIRouter(prefix="/webhook", tags=["Webhooks"])


@router.get("/facebook")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """Facebook webhook verification endpoint"""
    if hub_mode == "subscribe" and hub_verify_token == settings.FB_VERIFY_TOKEN:
        logger.info("Facebook webhook verified successfully")
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/facebook")
async def handle_facebook_webhook(request: Request):
    """Handle incoming Facebook Messenger messages + Feed events (posts, comments)"""
    body = await request.json()
    logger.info(f"Webhook received: {body.get('object', 'unknown')}")

    if body.get("object") != "page":
        return {"status": "ignored"}

    # Process each entry
    for entry in body.get("entry", []):
        page_id = entry.get("id")

        # ===== MESSAGING EVENTS (Messenger) =====
        for messaging_event in entry.get("messaging", []):
            sender_id = messaging_event.get("sender", {}).get("id")
            recipient_id = messaging_event.get("recipient", {}).get("id")

            # Skip if it's our own message
            if sender_id == page_id:
                continue

            # Handle text messages
            message = messaging_event.get("message", {})
            if message and message.get("text"):
                # Process in background to respond quickly to Facebook
                logger.info(f"📩 Message from {sender_id} to page {recipient_id}: {message['text'][:100]}")
                task = asyncio.create_task(
                    process_incoming_message(
                        page_id=recipient_id,
                        sender_id=sender_id,
                        message_text=message["text"],
                        message_id=message.get("mid"),
                    )
                )
                task.add_done_callback(_task_done_callback)

        # ===== FEED EVENTS (Posts, Comments) =====
        for change in entry.get("changes", []):
            field = change.get("field")
            value = change.get("value", {})

            if field == "feed":
                item = value.get("item")
                verb = value.get("verb")  # add, edit, remove

                if item == "post" and verb == "add":
                    # New post on the page
                    post_id = value.get("post_id", "")
                    if post_id:
                        logger.info(f"📝 New post webhook: {post_id}")
                        asyncio.create_task(
                            page_monitor.handle_new_post_event(
                                page_id=page_id,
                                post_id=post_id,
                            )
                        )

                elif item == "comment" and verb == "add":
                    # New comment on a post
                    comment_id = value.get("comment_id", "")
                    post_id = value.get("post_id", "")
                    # Skip if the comment is from the page itself
                    sender_id = value.get("from", {}).get("id", "")
                    if comment_id and post_id and sender_id != page_id:
                        logger.info(f"💬 New comment webhook: {comment_id} on post {post_id}")
                        asyncio.create_task(
                            page_monitor.handle_new_comment_event(
                                page_id=page_id,
                                post_id=post_id,
                                comment_id=comment_id,
                            )
                        )

    return {"status": "ok"}


def _task_done_callback(task: asyncio.Task):
    """Callback to log exceptions from background tasks that would otherwise be silent"""
    try:
        exc = task.exception()
        if exc:
            logger.error(f"🔴 Background task FAILED: {exc}")
            logger.error(f"Task traceback: {''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))}")
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error(f"Error in task callback: {e}")


async def process_incoming_message(
    page_id: str,
    sender_id: str,
    message_text: str,
    message_id: str = None,
):
    """Process an incoming message from Facebook"""
    logger.info(f"🔄 process_incoming_message STARTED: page={page_id}, sender={sender_id}")
    async with async_session() as db:
        try:
            # 1. Find the Facebook page and business
            logger.info(f"Looking up FacebookPage with page_id={page_id}")
            result = await db.execute(
                select(FacebookPage).where(FacebookPage.page_id == page_id)
            )
            fb_page = result.scalar_one_or_none()
            if not fb_page:
                logger.warning(f"Unknown page: {page_id}")
                return

            # Update last webhook time
            fb_page.last_webhook_at = datetime.now(timezone.utc)

            # Get business
            result = await db.execute(
                select(Business).where(Business.id == fb_page.business_id)
            )
            business = result.scalar_one_or_none()
            if not business:
                logger.warning(f"No business found for page {page_id}")
                return
            if not business.auto_reply_enabled:
                logger.info(f"Auto-reply disabled for business {business.name} ({business.id})")
                return
            logger.info(f"Processing message for business: {business.name} (auto_reply={business.auto_reply_enabled})")

            # 2. Find or create customer
            result = await db.execute(
                select(Customer).where(
                    Customer.business_id == business.id,
                    Customer.platform_id == sender_id,
                    Customer.platform == Platform.FACEBOOK,
                )
            )
            customer = result.scalar_one_or_none()

            if not customer:
                # Get profile from Facebook
                profile = await facebook_service.get_user_profile(
                    sender_id, fb_page.page_access_token
                )
                customer = Customer(
                    business_id=business.id,
                    platform=Platform.FACEBOOK,
                    platform_id=sender_id,
                    name=profile.get("name", "Unknown") if profile else "Unknown",
                    profile_picture=profile.get("profile_picture") if profile else None,
                    segment=CustomerSegment.NEW,
                )
                db.add(customer)
                await db.flush()

            # 3. Find or create conversation
            result = await db.execute(
                select(Conversation).where(
                    Conversation.customer_id == customer.id,
                    Conversation.business_id == business.id,
                    Conversation.status.in_([
                        ConversationStatus.ACTIVE,
                        ConversationStatus.AI_HANDLING,
                    ]),
                ).order_by(Conversation.created_at.desc()).limit(1)
            )
            conversation = result.scalar_one_or_none()

            if not conversation:
                conversation = Conversation(
                    business_id=business.id,
                    customer_id=customer.id,
                    facebook_page_id=fb_page.id,
                    platform=Platform.FACEBOOK,
                    status=ConversationStatus.AI_HANDLING,
                )
                db.add(conversation)
                await db.flush()

            # If human is handling, don't auto-reply
            if conversation.status == ConversationStatus.HUMAN_HANDLING:
                # Still save the message
                msg = Message(
                    conversation_id=conversation.id,
                    role=MessageRole.CUSTOMER,
                    content=message_text,
                    platform_message_id=message_id,
                )
                db.add(msg)
                conversation.message_count += 1
                conversation.last_message_at = datetime.now(timezone.utc)
                await db.commit()
                return

            # 4. Save customer message
            customer_msg = Message(
                conversation_id=conversation.id,
                role=MessageRole.CUSTOMER,
                content=message_text,
                platform_message_id=message_id,
            )
            db.add(customer_msg)
            conversation.message_count += 1
            conversation.last_message_at = datetime.now(timezone.utc)
            customer.last_message_at = datetime.now(timezone.utc)
            await db.flush()

            # 5. Send typing indicator
            await facebook_service.send_typing_indicator(
                fb_page.page_access_token, sender_id
            )

            # 6. Get conversation history
            msg_result = await db.execute(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.asc())
                .limit(20)
            )
            history_messages = msg_result.scalars().all()
            conversation_history = [
                {"role": m.role.value if hasattr(m.role, 'value') else m.role, "content": m.content}
                for m in history_messages
            ]

            # 7. Build business context
            business_context = {
                "business_name": business.name,
                "business_description": business.description or "",
                "currency": business.currency,
                "ai_personality": business.ai_personality,
                "upsell_aggressiveness": business.upsell_aggressiveness,
            }

            # 8. Process with AI Engine
            start_time = datetime.now(timezone.utc)
            ai_result = await ai_engine.process_message(
                customer_message=message_text,
                business_id=business.id,
                business_context=business_context,
                conversation_history=conversation_history,
            )
            end_time = datetime.now(timezone.utc)
            response_time = int((end_time - start_time).total_seconds() * 1000)

            # 9. Save AI response message
            ai_msg = Message(
                conversation_id=conversation.id,
                role=MessageRole.AI,
                content=ai_result["response"],
                detected_language=ai_result["language"],
                sentiment=ai_result["sentiment"],
                intent=ai_result["intent"],
                response_time_ms=response_time,
            )
            db.add(ai_msg)

            # Update conversation metadata
            conversation.detected_language = ai_result["language"]
            conversation.current_sentiment = ai_result["sentiment"]
            conversation.intent = ai_result["intent"]
            conversation.message_count += 1

            # Update customer message metadata
            customer_msg.detected_language = ai_result["language"]
            customer_msg.sentiment = ai_result["sentiment"]
            customer_msg.intent = ai_result["intent"]

            # 10. Track analytics events
            analytics_event = AnalyticsEvent(
                business_id=business.id,
                event_type="message_received",
                data={
                    "language": ai_result["language"],
                    "intent": ai_result["intent"],
                    "sentiment": ai_result["sentiment"],
                    "response_time_ms": response_time,
                },
                platform=Platform.FACEBOOK,
                conversation_id=conversation.id,
                customer_id=customer.id,
            )
            db.add(analytics_event)

            # 11. Check for sentiment alerts
            if ai_result["sentiment"] == "angry":
                alert_event = AnalyticsEvent(
                    business_id=business.id,
                    event_type="sentiment_alert",
                    data={
                        "customer_name": customer.name,
                        "sentiment": "angry",
                        "message": message_text,
                        "conversation_id": conversation.id,
                    },
                    platform=Platform.FACEBOOK,
                    conversation_id=conversation.id,
                    customer_id=customer.id,
                )
                db.add(alert_event)

            await db.commit()
            logger.info(f"✅ AI response ready for {sender_id}: {ai_result['response'][:100]}")

            # 12. Send AI response via Facebook
            logger.info(f"📤 Sending reply to {sender_id} via Facebook...")
            await facebook_service.send_message(
                page_id=fb_page.id,
                recipient_id=sender_id,
                message_text=ai_result["response"],
                db=db,
            )

            logger.info(
                f"Processed message from {sender_id}: "
                f"lang={ai_result['language']}, intent={ai_result['intent']}, "
                f"sentiment={ai_result['sentiment']}, time={response_time}ms"
            )

        except Exception as e:
            logger.error(f"Error processing message from {sender_id}: {e}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            await db.rollback()
