"""
SmartRep AI - Facebook Page Content Analyzer
Analyzes Facebook Page posts, photos, and content to keep AI knowledge updated.
"""
import re
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import httpx
from loguru import logger

import google.generativeai as genai
from app.core.config import settings


class PageContentAnalyzer:
    """
    Fetches and analyzes Facebook Page content:
    - Post texts, photos, offers
    - Extracts product info from posts
    - Updates knowledge base with latest content
    """

    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config={"temperature": 0.3, "max_output_tokens": 4096},
            )
        return self._model

    async def fetch_page_posts(
        self,
        page_id: str,
        page_access_token: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Fetch recent posts from a Facebook Page via Graph API"""
        try:
            url = f"https://graph.facebook.com/v19.0/{page_id}/posts"
            params = {
                "access_token": page_access_token,
                "fields": "id,message,created_time,full_picture,attachments{media,description,title,type},shares,reactions.summary(true),comments.summary(true)",
                "limit": limit,
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

            data = response.json()
            posts = data.get("data", [])
            logger.info(f"📱 Fetched {len(posts)} posts from page {page_id}")
            return posts

        except Exception as e:
            logger.error(f"Failed to fetch page posts: {e}")
            return []

    async def fetch_page_photos(
        self,
        page_id: str,
        page_access_token: str,
        limit: int = 30,
    ) -> List[Dict[str, Any]]:
        """Fetch photos from a Facebook Page"""
        try:
            url = f"https://graph.facebook.com/v19.0/{page_id}/photos"
            params = {
                "access_token": page_access_token,
                "type": "uploaded",
                "fields": "id,name,images,created_time,link",
                "limit": limit,
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

            data = response.json()
            photos = data.get("data", [])
            logger.info(f"📸 Fetched {len(photos)} photos from page {page_id}")
            return photos

        except Exception as e:
            logger.error(f"Failed to fetch page photos: {e}")
            return []

    async def analyze_page_content(
        self,
        page_id: str,
        page_access_token: str,
        page_name: str = "",
    ) -> Dict[str, Any]:
        """
        Full analysis: fetch posts + photos, use AI to extract products, offers, info
        """
        logger.info(f"🔍 Analyzing content for page: {page_name or page_id}")

        # Fetch posts and photos concurrently
        posts, photos = await asyncio.gather(
            self.fetch_page_posts(page_id, page_access_token),
            self.fetch_page_photos(page_id, page_access_token),
        )

        # Prepare post content for AI
        post_texts = []
        post_images = []
        for post in posts:
            msg = post.get("message", "")
            img = post.get("full_picture", "")
            reactions = post.get("reactions", {}).get("summary", {}).get("total_count", 0)
            comments = post.get("comments", {}).get("summary", {}).get("total_count", 0)

            if msg:
                post_texts.append({
                    "text": msg[:500],
                    "image": img,
                    "reactions": reactions,
                    "comments": comments,
                    "date": post.get("created_time", ""),
                })
            if img:
                post_images.append(img)

        # Prepare photo URLs
        photo_urls = []
        for photo in photos:
            images = photo.get("images", [])
            if images:
                photo_urls.append(images[0].get("source", ""))
            name = photo.get("name", "")
            if name:
                post_texts.append({"text": name, "image": photo_urls[-1] if photo_urls else "", "reactions": 0, "comments": 0})

        # Use AI to analyze
        extracted = await self._ai_analyze_posts(post_texts, page_name)

        return {
            "page_id": page_id,
            "page_name": page_name,
            "total_posts_analyzed": len(post_texts),
            "total_photos": len(photo_urls),
            "post_images": post_images[:30],
            "photo_urls": photo_urls[:30],
            **extracted,
        }

    async def _ai_analyze_posts(self, posts: List[Dict], page_name: str) -> Dict[str, Any]:
        """Use AI to extract structured data from Facebook posts"""
        if not posts:
            return {"products": [], "offers": [], "updates": [], "faqs": []}

        model = self._get_model()

        # Format posts for AI
        posts_text = ""
        for i, p in enumerate(posts[:40], 1):
            posts_text += f"\n--- Post #{i} ---\n"
            posts_text += f"Text: {p['text']}\n"
            if p.get("image"):
                posts_text += f"Image: {p['image']}\n"
            posts_text += f"Reactions: {p['reactions']}, Comments: {p['comments']}\n"
            if p.get("date"):
                posts_text += f"Date: {p['date']}\n"

        prompt = f"""You are a social media business analyst for an F-commerce business.
Analyze these Facebook Page posts from "{page_name}" and extract structured data.

POSTS:
{posts_text[:10000]}

Extract and return VALID JSON:
{{
  "products": [
    {{
      "name": "product name",
      "description": "description from posts",
      "price": 0.0,
      "sale_price": null,
      "category": "category",
      "images": ["image_url"],
      "is_available": true,
      "tags": ["tag1"],
      "source_post": "post number"
    }}
  ],
  "offers": [
    {{
      "title": "Combo Offer: 3 for 1000",
      "description": "Buy 3 t-shirts for just ৳1000",
      "products_included": ["T-shirt A", "T-shirt B"],
      "price": 1000,
      "original_price": 1500,
      "discount_percent": 33,
      "image": "url",
      "is_active": true
    }}
  ],
  "updates": [
    {{
      "title": "Business update title",
      "content": "Important info from posts",
      "type": "announcement|stock_update|new_arrival|event"
    }}
  ],
  "popular_products": ["names of most engaged products based on reactions/comments"],
  "business_insights": {{
    "posting_frequency": "how often they post",
    "main_categories": ["categories they sell"],
    "price_range": "price range of products",
    "target_audience": "who they seem to target",
    "selling_style": "how they present products"
  }}
}}

Rules:
- Extract ALL products with prices (BDT/৳/Tk)
- Identify combo offers, discounts, bundle deals specially
- Match product images from posts
- Identify trending/popular items by engagement
- Note any new arrivals or stock updates
- Return ONLY valid JSON, no markdown"""

        try:
            response = await asyncio.to_thread(model.generate_content, prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            return json.loads(text)
        except json.JSONDecodeError:
            logger.error("AI returned invalid JSON for page analysis")
            return {"products": [], "offers": [], "updates": [], "popular_products": []}
        except Exception as e:
            logger.error(f"Page content analysis failed: {e}")
            return {"products": [], "offers": [], "updates": [], "popular_products": []}

    async def analyze_post_for_products(self, post_text: str, post_image: str = "") -> Dict[str, Any]:
        """Analyze a single post for product information (called on new post webhook)"""
        model = self._get_model()
        prompt = f"""Analyze this Facebook post and extract product info if present.

POST: {post_text}
IMAGE: {post_image}

If this post contains product info, return JSON:
{{
  "has_product": true,
  "product": {{
    "name": "...",
    "description": "...",
    "price": 0.0,
    "category": "...",
    "images": ["{post_image}"],
    "is_offer": false,
    "offer_details": ""
  }}
}}

If no product info, return: {{"has_product": false}}
Return ONLY valid JSON."""

        try:
            response = await asyncio.to_thread(model.generate_content, prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            return json.loads(text)
        except Exception as e:
            logger.error(f"Post analysis failed: {e}")
            return {"has_product": False}


# Singleton
page_analyzer = PageContentAnalyzer()
