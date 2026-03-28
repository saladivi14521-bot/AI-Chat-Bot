"""
SmartRep AI - Scraper Routes
Website scraping and Facebook Page content analysis
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from loguru import logger

from app.core.database import get_db
from app.models.models import (
    User, Business, Product, KnowledgeBase, FacebookPage,
    KnowledgeBaseType,
)
from app.schemas.schemas import SuccessResponse
from app.api.deps import get_current_business_owner
from app.api.routes.business import get_user_business
from app.services.website_scraper import website_scraper
from app.services.page_analyzer import page_analyzer
from app.services.vector_store import vector_store


router = APIRouter(prefix="/scraper", tags=["Scraper"])


# ============================================
# REQUEST SCHEMAS
# ============================================

class WebsiteScrapeRequest(BaseModel):
    url: str
    auto_add_products: bool = True
    auto_add_kb: bool = True
    max_pages: int = 10


class SingleProductScrapeRequest(BaseModel):
    url: str


class PageAnalyzeRequest(BaseModel):
    page_id: str  # Our internal FB page record ID


# ============================================
# RESPONSE SCHEMAS
# ============================================

class ScrapeStatusResponse(BaseModel):
    success: bool
    message: str
    pages_scraped: int = 0
    products_found: int = 0
    products_added: int = 0
    kb_entries_added: int = 0
    offers_found: int = 0
    data: dict = {}


class PageAnalysisResponse(BaseModel):
    success: bool
    message: str
    posts_analyzed: int = 0
    products_found: int = 0
    products_added: int = 0
    offers_found: int = 0
    updates_found: int = 0
    data: dict = {}


# ============================================
# WEBSITE SCRAPER ENDPOINTS
# ============================================

@router.post("/website", response_model=ScrapeStatusResponse)
async def scrape_website(
    data: WebsiteScrapeRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Scrape a website and auto-import products + knowledge base"""
    business = await get_user_business(current_user, db)

    # Validate URL
    url = data.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    logger.info(f"🌐 User {current_user.email} scraping website: {url}")

    try:
        result = await website_scraper.scrape_website(url, max_pages=data.max_pages)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to scrape website: {str(e)}")

    products_added = 0
    kb_entries_added = 0

    # Auto-add products
    if data.auto_add_products:
        for product_data in result.get("products", []):
            try:
                # Check if product already exists
                existing = await db.execute(
                    select(Product).where(
                        Product.business_id == business.id,
                        Product.name == product_data.get("name", ""),
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                product = Product(
                    business_id=business.id,
                    name=product_data.get("name", "Unknown Product"),
                    description=product_data.get("description", ""),
                    price=float(product_data.get("price", 0)),
                    sale_price=float(product_data["sale_price"]) if product_data.get("sale_price") else None,
                    category=product_data.get("category", ""),
                    images=product_data.get("images", []),
                    variants=product_data.get("variants", []),
                    tags=product_data.get("tags", []),
                    is_available=True,
                    stock_quantity=10,  # Default
                )
                db.add(product)
                await db.flush()
                products_added += 1

                # Also add to KB for RAG (include variants info)
                variants_text = ""
                if product.variants:
                    variant_lines = []
                    for v in product.variants:
                        vname = v.get("name", "")
                        vprice = v.get("price", "")
                        variant_lines.append(f"  - {vname}: ৳{vprice}")
                    variants_text = "\nAvailable Variants:\n" + "\n".join(variant_lines)

                kb = KnowledgeBase(
                    business_id=business.id,
                    title=f"Product: {product.name}",
                    content=f"Product Name: {product.name}\nPrice: ৳{product.price}\nDescription: {product.description}\nCategory: {product.category}{variants_text}",
                    type=KnowledgeBaseType.PRODUCT,
                    extra_metadata={"source": "website_scrape", "url": url, "product_id": product.id},
                )
                db.add(kb)
                await db.flush()

                # Embed in ChromaDB
                try:
                    embedding_id = await vector_store.add_document(
                        business_id=business.id,
                        doc_id=kb.id,
                        content=f"{kb.title}\n{kb.content}",
                        metadata={"type": "product", "title": kb.title},
                    )
                    kb.embedding_id = embedding_id
                except Exception:
                    pass

                kb_entries_added += 1
            except Exception as e:
                logger.error(f"Failed to add product: {e}")
                continue

    # Auto-add KB entries (FAQs, policies, general info)
    if data.auto_add_kb:
        for faq in result.get("faqs", []):
            try:
                kb = KnowledgeBase(
                    business_id=business.id,
                    title=faq.get("question", "FAQ"),
                    content=f"Q: {faq.get('question', '')}\nA: {faq.get('answer', '')}",
                    type=KnowledgeBaseType.FAQ,
                    extra_metadata={"source": "website_scrape", "url": url},
                )
                db.add(kb)
                await db.flush()
                try:
                    eid = await vector_store.add_document(
                        business_id=business.id, doc_id=kb.id,
                        content=f"{kb.title}\n{kb.content}",
                        metadata={"type": "faq", "title": kb.title},
                    )
                    kb.embedding_id = eid
                except Exception:
                    pass
                kb_entries_added += 1
            except Exception as e:
                logger.error(f"Failed to add FAQ: {e}")

        for policy in result.get("policies", []):
            try:
                kb = KnowledgeBase(
                    business_id=business.id,
                    title=policy.get("title", "Policy"),
                    content=policy.get("content", ""),
                    type=KnowledgeBaseType.POLICY,
                    extra_metadata={"source": "website_scrape", "url": url},
                )
                db.add(kb)
                await db.flush()
                try:
                    eid = await vector_store.add_document(
                        business_id=business.id, doc_id=kb.id,
                        content=f"{kb.title}\n{kb.content}",
                        metadata={"type": "policy", "title": kb.title},
                    )
                    kb.embedding_id = eid
                except Exception:
                    pass
                kb_entries_added += 1
            except Exception as e:
                logger.error(f"Failed to add policy: {e}")

        for info in result.get("general_info", []):
            try:
                kb = KnowledgeBase(
                    business_id=business.id,
                    title=info.get("title", "Info"),
                    content=info.get("content", ""),
                    type=KnowledgeBaseType.GENERAL,
                    extra_metadata={"source": "website_scrape", "url": url},
                )
                db.add(kb)
                await db.flush()
                try:
                    eid = await vector_store.add_document(
                        business_id=business.id, doc_id=kb.id,
                        content=f"{kb.title}\n{kb.content}",
                        metadata={"type": "general", "title": kb.title},
                    )
                    kb.embedding_id = eid
                except Exception:
                    pass
                kb_entries_added += 1
            except Exception as e:
                logger.error(f"Failed to add info: {e}")

    # Update business info if found
    biz_info = result.get("business_info", {})
    if biz_info:
        if biz_info.get("name") and not business.description:
            business.description = biz_info.get("description", "")
        if biz_info.get("industry") and not business.industry:
            business.industry = biz_info.get("industry")
        if biz_info.get("phone") and not business.phone:
            business.phone = biz_info.get("phone")
        if biz_info.get("address") and not business.address:
            business.address = biz_info.get("address")
        if not business.website:
            business.website = url

    await db.commit()

    return ScrapeStatusResponse(
        success=True,
        message=f"Website scraped successfully! Added {products_added} products and {kb_entries_added} KB entries.",
        pages_scraped=result.get("pages_scraped", 0),
        products_found=len(result.get("products", [])),
        products_added=products_added,
        kb_entries_added=kb_entries_added,
        offers_found=len(result.get("products", [p for p in result.get("products", []) if p.get("is_combo")])),
        data=result,
    )


@router.post("/product-page", response_model=ScrapeStatusResponse)
async def scrape_product_page(
    data: SingleProductScrapeRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Scrape a single product page and add to catalog"""
    business = await get_user_business(current_user, db)

    url = data.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    try:
        product_data = await website_scraper.scrape_single_product_page(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if "error" in product_data:
        raise HTTPException(status_code=400, detail=product_data["error"])

    # Add product
    product = Product(
        business_id=business.id,
        name=product_data.get("name", "Product"),
        description=product_data.get("description", ""),
        price=float(product_data.get("price", 0)),
        sale_price=float(product_data["sale_price"]) if product_data.get("sale_price") else None,
        category=product_data.get("category", ""),
        images=product_data.get("images", []),
        tags=product_data.get("tags", []),
        variants=product_data.get("variants", []),
        is_available=product_data.get("stock_status") != "out_of_stock",
    )
    db.add(product)
    await db.flush()

    # Add to KB
    kb = KnowledgeBase(
        business_id=business.id,
        title=f"Product: {product.name}",
        content=f"Product Name: {product.name}\nPrice: ৳{product.price}\nDescription: {product.description}\nCategory: {product.category}",
        type=KnowledgeBaseType.PRODUCT,
        extra_metadata={"source": "product_page_scrape", "url": url, "product_id": product.id},
    )
    db.add(kb)
    await db.flush()

    try:
        eid = await vector_store.add_document(
            business_id=business.id, doc_id=kb.id,
            content=f"{kb.title}\n{kb.content}",
            metadata={"type": "product", "title": kb.title},
        )
        kb.embedding_id = eid
    except Exception:
        pass

    await db.commit()

    return ScrapeStatusResponse(
        success=True,
        message=f"Product '{product.name}' added successfully!",
        products_found=1,
        products_added=1,
        kb_entries_added=1,
        data=product_data,
    )


# ============================================
# FACEBOOK PAGE CONTENT ANALYZER
# ============================================

@router.post("/analyze-page", response_model=PageAnalysisResponse)
async def analyze_facebook_page(
    data: PageAnalyzeRequest,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db),
):
    """Analyze Facebook Page posts to extract products, offers, and updates"""
    business = await get_user_business(current_user, db)

    # Get the FB page
    result = await db.execute(
        select(FacebookPage).where(
            FacebookPage.id == data.page_id,
            FacebookPage.business_id == business.id,
        )
    )
    fb_page = result.scalar_one_or_none()
    if not fb_page:
        raise HTTPException(status_code=404, detail="Facebook page not found")

    logger.info(f"📱 Analyzing FB page: {fb_page.page_name}")

    try:
        analysis = await page_analyzer.analyze_page_content(
            page_id=fb_page.page_id,
            page_access_token=fb_page.page_access_token,
            page_name=fb_page.page_name or "",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")

    products_added = 0
    offers_found = len(analysis.get("offers", []))

    # Auto-add discovered products
    for product_data in analysis.get("products", []):
        try:
            existing = await db.execute(
                select(Product).where(
                    Product.business_id == business.id,
                    Product.name == product_data.get("name", ""),
                )
            )
            if existing.scalar_one_or_none():
                continue

            product = Product(
                business_id=business.id,
                name=product_data.get("name", ""),
                description=product_data.get("description", ""),
                price=float(product_data.get("price", 0)),
                category=product_data.get("category", ""),
                images=product_data.get("images", []),
                tags=product_data.get("tags", []),
                is_available=product_data.get("is_available", True),
                stock_quantity=10,
            )
            db.add(product)
            await db.flush()
            products_added += 1

            # Add to KB
            kb = KnowledgeBase(
                business_id=business.id,
                title=f"Product: {product.name}",
                content=f"Product: {product.name}\nPrice: ৳{product.price}\n{product.description}",
                type=KnowledgeBaseType.PRODUCT,
                extra_metadata={"source": "facebook_page", "page_id": fb_page.page_id},
            )
            db.add(kb)
            await db.flush()

            try:
                eid = await vector_store.add_document(
                    business_id=business.id, doc_id=kb.id,
                    content=f"{kb.title}\n{kb.content}",
                    metadata={"type": "product", "title": kb.title},
                )
                kb.embedding_id = eid
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Failed to add FB product: {e}")

    # Add offers as KB entries
    for offer in analysis.get("offers", []):
        try:
            kb = KnowledgeBase(
                business_id=business.id,
                title=f"Offer: {offer.get('title', 'Special Offer')}",
                content=f"Offer: {offer.get('title')}\n{offer.get('description')}\nPrice: ৳{offer.get('price', 0)}\nOriginal: ৳{offer.get('original_price', 0)}\nDiscount: {offer.get('discount_percent', 0)}%\nProducts: {', '.join(offer.get('products_included', []))}",
                type=KnowledgeBaseType.GENERAL,
                extra_metadata={"source": "facebook_page", "type": "offer", "page_id": fb_page.page_id},
            )
            db.add(kb)
            await db.flush()
            try:
                eid = await vector_store.add_document(
                    business_id=business.id, doc_id=kb.id,
                    content=f"{kb.title}\n{kb.content}",
                    metadata={"type": "offer", "title": kb.title},
                )
                kb.embedding_id = eid
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Failed to add offer: {e}")

    # Add business updates
    for update in analysis.get("updates", []):
        try:
            kb = KnowledgeBase(
                business_id=business.id,
                title=update.get("title", "Update"),
                content=update.get("content", ""),
                type=KnowledgeBaseType.GENERAL,
                extra_metadata={"source": "facebook_page", "type": "update", "page_id": fb_page.page_id},
            )
            db.add(kb)
            await db.flush()
            try:
                eid = await vector_store.add_document(
                    business_id=business.id, doc_id=kb.id,
                    content=f"{kb.title}\n{kb.content}",
                    metadata={"type": "update", "title": kb.title},
                )
                kb.embedding_id = eid
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Failed to add update: {e}")

    await db.commit()

    return PageAnalysisResponse(
        success=True,
        message=f"Page analyzed! Found {len(analysis.get('products', []))} products, {offers_found} offers. Added {products_added} new products.",
        posts_analyzed=analysis.get("total_posts_analyzed", 0),
        products_found=len(analysis.get("products", [])),
        products_added=products_added,
        offers_found=offers_found,
        updates_found=len(analysis.get("updates", [])),
        data=analysis,
    )
