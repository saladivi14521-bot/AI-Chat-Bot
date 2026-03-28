"""
SmartRep AI - Website Scraper Service
Scrapes business websites to auto-extract products, FAQs, policies, and content
for Knowledge Base and Product catalog.

Supports:
- Inertia.js SPAs (Laravel + Vue/React) via data-page JSON
- JSON-LD structured data
- Regular HTML with AI-powered extraction
"""
import re
import json
import asyncio
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup
from loguru import logger

import google.generativeai as genai
from app.core.config import settings


def _strip_html(html_str: str) -> str:
    """Strip HTML tags from a string, returning plain text."""
    if not html_str:
        return ""
    return BeautifulSoup(html_str, "lxml").get_text(separator=" ", strip=True)


class WebsiteScraper:
    """
    Scrapes websites and uses AI to extract structured data:
    - Products (name, price, description, images, category)
    - FAQs
    - Policies (return, shipping, etc.)
    - General business info
    """

    def __init__(self):
        self._model = None
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
        }

    def _get_model(self):
        if self._model is None:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                generation_config={"temperature": 0.3, "max_output_tokens": 8192},
            )
        return self._model

    # ──────────────────────────────────────────────
    # Inertia.js / SPA data extraction
    # ──────────────────────────────────────────────
    def _extract_inertia_data(self, soup: BeautifulSoup) -> Optional[Dict]:
        """Extract data-page JSON from Inertia.js apps (Laravel + Vue/React)."""
        app_div = soup.find("div", id="app")
        if not app_div:
            return None
        data_page = app_div.get("data-page")
        if not data_page:
            return None
        try:
            return json.loads(data_page)
        except (json.JSONDecodeError, TypeError):
            return None

    def _extract_jsonld(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract JSON-LD structured data (<script type='application/ld+json'>)."""
        results = []
        for tag in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(tag.string or "")
                if isinstance(data, list):
                    results.extend(data)
                else:
                    results.append(data)
            except (json.JSONDecodeError, TypeError):
                continue
        return results

    def _parse_inertia_products(self, inertia: Dict, base_url: str) -> Dict[str, Any]:
        """
        Parse a full Inertia.js page payload and return structured SmartRep data.
        Works with typical Laravel e-commerce Inertia pages.
        Products may live in props.products, props.collections[*].products, or props.items.
        """
        props = inertia.get("props", {})

        # ── Collect raw products from multiple sources ──
        raw_products = props.get("products", props.get("items", []))
        if isinstance(raw_products, dict):
            raw_products = raw_products.get("data", [])

        # Also gather from collections (many Inertia shops keep products here)
        collections = props.get("collections", [])
        seen_ids = {p.get("id") for p in raw_products if p.get("id")}
        for coll in collections:
            for p in coll.get("products", []):
                pid = p.get("id")
                if pid and pid not in seen_ids:
                    seen_ids.add(pid)
                    raw_products.append(p)

        categories_raw = props.get("categories", [])
        site_info = props.get("siteInfo", {})
        basic = site_info.get("basic", {})
        services = site_info.get("services", [])

        # Build category lookup
        cat_lookup: Dict[int, str] = {}
        for c in categories_raw:
            cat_lookup[c.get("id")] = c.get("name", "")

        # ── Collect product slugs for detail-page fetching ──
        product_slugs: List[Dict] = []

        # ── Products (basic data from homepage) ──
        products = []
        for p in raw_products:
            if not p.get("is_active", True):
                continue
            title = p.get("title") or p.get("name") or ""
            desc_html = p.get("description", "")
            desc = _strip_html(desc_html)
            sale_price = float(p.get("sale_price") or p.get("price") or 0)
            final_price = float(p.get("final_price") or sale_price)
            discount_value = float(p.get("discount_value") or 0)

            # Determine if there's a real discount
            real_sale_price = None
            if discount_value > 0 and final_price < sale_price:
                real_sale_price = final_price

            images = p.get("images", [])
            primary = p.get("primary_image")
            if primary and primary not in images:
                images = [primary] + images

            # Detect combos
            is_combo = (
                "combo" in title.lower()
                or "pack" in title.lower()
                or "+" in title
                or "bundle" in title.lower()
            )
            combo_items = []
            if is_combo:
                # Try to parse combo items from description
                for line in desc_html.split("</p>"):
                    clean = _strip_html(line).strip()
                    if re.match(r"^\d+\s*(ml|gm|pcs)", clean, re.IGNORECASE):
                        combo_items.append(clean)

            # Category from slug or collections
            category = ""
            slug = p.get("slug", "")
            if "oil" in slug:
                category = "Hair Growth Oils"
            elif "shampoo" in slug:
                category = "Shampoo"
            elif "serum" in slug:
                category = "Scalp Care"
            elif "spa" in slug or "mehedi" in slug or "mehndi" in slug:
                category = "Hair Treatment"
            elif "comb" in slug or "massager" in slug:
                category = "Hair Care Essentials"
            elif is_combo:
                category = "Combo Packs"

            products.append({
                "name": title,
                "description": desc[:500],
                "price": sale_price,
                "sale_price": real_sale_price,
                "category": category,
                "images": images,
                "tags": [t for t in [p.get("sku", ""), category] if t],
                "is_combo": is_combo,
                "combo_items": combo_items,
                "variants": [],  # will be filled from detail pages
                "slug": slug,
            })
            # Track slug for detail page fetching
            if slug:
                product_slugs.append({"slug": slug, "index": len(products) - 1})

        # ── Business info ──
        business_info = {}
        if basic:
            business_info = {
                "name": basic.get("name", ""),
                "description": _strip_html(basic.get("details", "")),
                "phone": basic.get("primary_phone", ""),
                "email": basic.get("primary_email", ""),
                "address": basic.get("address", ""),
                "industry": "Hair Care / Beauty",
            }

        # ── Policies / Services (terms, privacy, return policies) ──
        policies = []
        for svc in services:
            if svc.get("is_active"):
                policies.append({
                    "title": svc.get("name", ""),
                    "content": _strip_html(svc.get("content", ""))[:2000],
                })

        # ── General info ──
        general_info = []
        if basic.get("details"):
            general_info.append({
                "title": f"About {basic.get('name', 'the Business')}",
                "content": _strip_html(basic.get("details", "")),
            })

        # Categories as KB entry
        if categories_raw:
            cat_names = [c.get("name") for c in categories_raw if c.get("name")]
            general_info.append({
                "title": "Product Categories",
                "content": "Available categories: " + ", ".join(cat_names),
            })

        # Spin discount / coupon offers
        spin_discounts = props.get("spinDiscounts", [])
        for sd in spin_discounts:
            if sd.get("products"):
                for sp in sd["products"]:
                    general_info.append({
                        "title": f"Special Offer: {sp.get('title', '')}",
                        "content": f"Use coupon code {sd.get('code', '')} for {sd.get('name', '')}. Product: {sp.get('title', '')} at ৳{sp.get('final_price', '')}",
                    })

        logger.info(f"✅ Inertia extraction: {len(products)} products, {len(policies)} policies, {len(general_info)} info entries")

        # Also extract FAQs from homepage if available
        faqs = []
        raw_faqs = props.get("faqs", [])
        for faq in raw_faqs:
            q = faq.get("question", "")
            a = _strip_html(faq.get("answer", ""))
            if q and a:
                faqs.append({"question": q, "answer": a})

        return {
            "products": products,
            "product_slugs": product_slugs,
            "faqs": faqs,
            "policies": policies,
            "general_info": general_info,
            "business_info": business_info,
        }

    # ──────────────────────────────────────────────
    # Product detail page parsing (variants, all images)
    # ──────────────────────────────────────────────
    def _parse_inertia_product_detail(self, inertia: Dict) -> Dict[str, Any]:
        """
        Parse a product detail Inertia.js page to extract:
        - All variants (sizes/options with their prices)
        - Per-variant images (merged into one images list)
        - Product description, ingredients, how_to_use
        - Product FAQs
        """
        props = inertia.get("props", {})
        product = props.get("initialProduct", {})
        raw_variants = props.get("initialVariant", []) or []
        variant_media = props.get("initialProductVariantMedia", []) or []
        attributes = props.get("initialAttributes", []) or []
        product_faqs = props.get("initialProductFaqs", []) or []
        highlights = props.get("initialHighlight", []) or []

        # ── Build attribute value lookup for variant naming ──
        # attributes: [{name: "SIZE", values: [{id: 36, value: "200 ml"}, ...]}]
        attr_value_map: Dict[str, str] = {}
        for attr in attributes:
            attr_name = attr.get("name", "")
            for val in attr.get("values", []):
                # Map by position or id
                attr_value_map[str(val.get("id", ""))] = f"{attr_name}: {val.get('value', '')}"

        # ── Build variant media lookup ──
        media_lookup: Dict[str, List[str]] = {}
        for vm in variant_media:
            vid = str(vm.get("id", ""))
            media_lookup[vid] = vm.get("images", [])

        # ── Parse variants ──
        variants = []
        all_images: List[str] = []
        for v in raw_variants:
            vid = str(v.get("id", ""))
            sku = v.get("sku", "")
            sale_price = float(v.get("sale_price") or 0)
            final_price = float(v.get("final_price") or sale_price)
            is_default = bool(v.get("is_default", False))
            is_active = bool(v.get("is_active", True))

            # Derive a human-readable name from SKU (e.g. "SKU-14-200 ml" -> "200 ml")
            variant_name = sku
            parts = sku.split("-")
            if len(parts) >= 3:
                variant_name = "-".join(parts[2:])  # e.g. "200 ml"

            # Determine the effective price (with discount if any)
            discount_type = v.get("discount_type")
            discount_value = float(v.get("discount_value") or 0)
            effective_price = final_price
            original_price = sale_price if discount_value > 0 and final_price < sale_price else None

            variants.append({
                "name": variant_name,
                "sku": sku,
                "price": effective_price,
                "original_price": original_price,
                "stock": int(v.get("visible_quantity") or v.get("actual_quantity") or 0),
                "is_default": is_default,
                "is_active": is_active,
            })

            # Collect images from this variant
            v_images = media_lookup.get(vid, [])
            for img in v_images:
                if img and img not in all_images:
                    all_images.append(img)

        # ── Description enrichment ──
        description = _strip_html(product.get("description", ""))
        ingredients = _strip_html(product.get("ingredients", ""))
        how_to_use = _strip_html(product.get("how_to_use", ""))

        # ── Product-level FAQs ──
        faqs = []
        for faq in product_faqs:
            q = faq.get("question", "")
            a = _strip_html(faq.get("answer", ""))
            if q and a:
                faqs.append({"question": q, "answer": a})

        # ── Highlights / badges ──
        highlight_list = [h.get("value", "") for h in highlights if h.get("value")]

        return {
            "variants": variants,
            "all_images": all_images,
            "description": description[:1000],
            "ingredients": ingredients[:500],
            "how_to_use": how_to_use[:500],
            "faqs": faqs,
            "highlights": highlight_list,
        }

    # ──────────────────────────────────────────────
    # Core scraping
    # ──────────────────────────────────────────────
    async def fetch_html(self, url: str) -> Optional[str]:
        """Fetch raw HTML from a URL."""
        try:
            async with httpx.AsyncClient(timeout=30, follow_redirects=True, verify=False) as client:
                resp = await client.get(url, headers=self.headers)
                resp.raise_for_status()
                return resp.text
        except Exception as e:
            logger.error(f"Failed to fetch {url}: {e}")
            return None

    async def scrape_url(self, url: str) -> Dict[str, Any]:
        """Scrape a single URL and return raw content"""
        html = await self.fetch_html(url)
        if html is None:
            return {"url": url, "success": False, "error": "Failed to fetch"}

        soup = BeautifulSoup(html, "lxml")

        # ── 1. Try Inertia.js data-page first ──
        inertia = self._extract_inertia_data(soup)
        if inertia:
            return {
                "url": url,
                "success": True,
                "type": "inertia",
                "inertia_data": inertia,
                "title": soup.title.string if soup.title else "",
            }

        # ── 2. Try JSON-LD ──
        jsonld = self._extract_jsonld(soup)

        # ── 3. Regular HTML parsing ──
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "iframe"]):
            tag.decompose()

        title = soup.title.string if soup.title else ""
        text = soup.get_text(separator="\n", strip=True)
        text = re.sub(r"\n{3,}", "\n\n", text)[:8000]

        # Images
        images = []
        for img in soup.find_all("img", src=True):
            src = img.get("src", "")
            alt = img.get("alt", "")
            if src and not src.startswith("data:"):
                full_url = urljoin(url, src)
                if any(ext in full_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    images.append({"url": full_url, "alt": alt})

        # Links for crawling
        links = []
        for a in soup.find_all("a", href=True):
            href = a.get("href", "")
            link_text = a.get_text(strip=True)
            if href and not href.startswith(("#", "javascript:", "mailto:", "tel:")):
                full_url = urljoin(url, href)
                if urlparse(full_url).netloc == urlparse(url).netloc:
                    links.append({"url": full_url, "text": link_text})

        prices = re.findall(r'[৳$][\s]*[\d,]+\.?\d*|[\d,]+\.?\d*\s*(?:BDT|Tk|TK|taka)', text)

        return {
            "url": url,
            "title": title,
            "text": text,
            "images": images[:50],
            "links": links[:100],
            "prices": prices[:50],
            "jsonld": jsonld,
            "success": True,
            "type": "html",
        }

    async def discover_pages(self, base_url: str) -> List[str]:
        """Discover important pages from a website"""
        result = await self.scrape_url(base_url)
        if not result["success"]:
            return [base_url]

        # If Inertia.js, we already have all data from one page — no need to crawl
        if result.get("type") == "inertia":
            return [base_url]

        urls = {base_url}
        priority_keywords = [
            "product", "shop", "store", "category", "collection",
            "faq", "help", "support", "about", "contact",
            "policy", "return", "refund", "shipping", "delivery",
            "offer", "sale", "combo", "bundle", "deal",
            "terms", "privacy",
        ]

        for link in result.get("links", []):
            link_url = link["url"].rstrip("/")
            link_text = link.get("text", "").lower()
            link_path = urlparse(link_url).path.lower()
            for keyword in priority_keywords:
                if keyword in link_text or keyword in link_path:
                    urls.add(link_url)
                    break

        return list(urls)[:15]

    async def scrape_website(self, base_url: str, max_pages: int = 10) -> Dict[str, Any]:
        """
        Full website scrape: discover pages, scrape them, extract structured data.
        """
        logger.info(f"🌐 Starting website scrape: {base_url}")

        # First scrape the main URL
        first_result = await self.scrape_url(base_url)

        # ── Fast path: Inertia.js SPA – all data in one page ──
        if first_result.get("type") == "inertia" and first_result.get("inertia_data"):
            logger.info("⚡ Detected Inertia.js SPA – extracting data from page payload")
            extracted = self._parse_inertia_products(first_result["inertia_data"], base_url)

            # ── Enrich products with detail pages (variants + all images) ──
            product_slugs = extracted.pop("product_slugs", [])
            products = extracted.get("products", [])
            if product_slugs:
                logger.info(f"📦 Fetching {len(product_slugs)} product detail pages for variants & images…")
                parsed_base = urlparse(base_url)
                origin = f"{parsed_base.scheme}://{parsed_base.netloc}"

                # Fetch detail pages in batches of 3
                for batch_start in range(0, len(product_slugs), 3):
                    batch = product_slugs[batch_start:batch_start + 3]
                    tasks = []
                    for ps in batch:
                        detail_url = f"{origin}/products/{ps['slug']}"
                        tasks.append(self.scrape_url(detail_url))

                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    for ps, res in zip(batch, results):
                        if isinstance(res, Exception) or not isinstance(res, dict):
                            continue
                        if res.get("type") == "inertia" and res.get("inertia_data"):
                            detail = self._parse_inertia_product_detail(res["inertia_data"])
                            idx = ps["index"]
                            if idx < len(products):
                                prod = products[idx]
                                # Merge variants
                                if detail.get("variants"):
                                    prod["variants"] = detail["variants"]
                                # Merge all images (detail pages have per-variant images)
                                if detail.get("all_images"):
                                    prod["images"] = detail["all_images"]
                                # Enrich description
                                if detail.get("description") and len(detail["description"]) > len(prod.get("description", "")):
                                    prod["description"] = detail["description"][:500]
                                # Add extra info
                                if detail.get("ingredients"):
                                    prod["ingredients"] = detail["ingredients"]
                                if detail.get("how_to_use"):
                                    prod["how_to_use"] = detail["how_to_use"]
                                if detail.get("highlights"):
                                    prod["highlights"] = detail["highlights"]
                                # Merge product-level FAQs
                                if detail.get("faqs"):
                                    extracted.setdefault("faqs", []).extend(detail["faqs"])

                    await asyncio.sleep(0.3)

                logger.info(f"✅ Enriched {len(product_slugs)} products with variants & images")

            pages_scraped = 1 + len(product_slugs)
            return {
                "base_url": base_url,
                "pages_scraped": pages_scraped,
                "urls_found": [base_url],
                **extracted,
            }

        # ── Regular path: crawl multiple pages + AI extraction ──
        urls = await self.discover_pages(base_url)
        urls = urls[:max_pages]

        all_content = []
        if first_result.get("success") and first_result.get("type") == "html":
            all_content.append(first_result)

        remaining = [u for u in urls if u != base_url]
        for i in range(0, len(remaining), 3):
            batch = remaining[i:i + 3]
            tasks = [self.scrape_url(u) for u in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, dict) and r.get("success"):
                    # If any page is Inertia, use that
                    if r.get("type") == "inertia" and r.get("inertia_data"):
                        extracted = self._parse_inertia_products(r["inertia_data"], base_url)
                        return {
                            "base_url": base_url,
                            "pages_scraped": 1,
                            "urls_found": urls,
                            **extracted,
                        }
                    all_content.append(r)
            await asyncio.sleep(0.5)

        logger.info(f"📄 Scraped {len(all_content)} pages from {base_url}")

        # Combine text + use AI
        combined_text = ""
        all_images = []
        for page in all_content:
            combined_text += f"\n\n=== PAGE: {page.get('title', '')} ({page['url']}) ===\n"
            combined_text += page.get("text", "")[:3000]
            all_images.extend(page.get("images", []))

        combined_text = combined_text[:15000]
        extracted = await self._ai_extract(combined_text, all_images, base_url)

        return {
            "base_url": base_url,
            "pages_scraped": len(all_content),
            "urls_found": urls,
            **extracted,
        }

    async def _ai_extract(self, text: str, images: List[Dict], base_url: str) -> Dict[str, Any]:
        """Use Gemini AI to extract structured data from scraped content"""
        model = self._get_model()

        prompt = f"""You are a data extraction AI. Analyze this website content and extract structured data.

WEBSITE: {base_url}

CONTENT:
{text}

IMAGES FOUND: {json.dumps(images[:20], ensure_ascii=False)}

Extract and return VALID JSON with these fields:
{{
  "business_info": {{
    "name": "business name",
    "description": "short description",
    "industry": "industry type",
    "phone": "phone if found",
    "address": "address if found",
    "email": "email if found"
  }},
  "products": [
    {{
      "name": "product name",
      "description": "product description",
      "price": 0.0,
      "sale_price": null,
      "category": "category",
      "images": ["image_url1"],
      "is_combo": false,
      "combo_items": [],
      "tags": ["tag1"]
    }}
  ],
  "faqs": [
    {{"question": "...", "answer": "..."}}
  ],
  "policies": [
    {{"title": "Return Policy", "content": "..."}}
  ],
  "general_info": [
    {{"title": "About", "content": "..."}}
  ]
}}

Rules:
- Extract ALL products you can find with prices in BDT
- Identify combo/bundle offers specially
- Match product images from the IMAGES FOUND list
- Extract FAQs if any
- Extract shipping, return, payment policies
- Extract any useful business information
- If price has ৳ or Tk or BDT, convert to number
- Return ONLY valid JSON, no markdown
"""

        try:
            response = await asyncio.to_thread(model.generate_content, prompt)
            result_text = response.text.strip()
            if result_text.startswith("```"):
                result_text = re.sub(r"^```(?:json)?\n?", "", result_text)
                result_text = re.sub(r"\n?```$", "", result_text)
            return json.loads(result_text)
        except json.JSONDecodeError as e:
            logger.error(f"AI returned invalid JSON: {e}")
            return {"products": [], "faqs": [], "policies": [], "general_info": [], "business_info": {}}
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return {"products": [], "faqs": [], "policies": [], "general_info": [], "business_info": {}}

    async def scrape_single_product_page(self, url: str) -> Dict[str, Any]:
        """Scrape a single product page for detailed info"""
        html = await self.fetch_html(url)
        if html is None:
            return {"error": "Failed to fetch page"}

        soup = BeautifulSoup(html, "lxml")

        # Try Inertia first
        inertia = self._extract_inertia_data(soup)
        if inertia:
            props = inertia.get("props", {})

            # Modern Inertia product pages: initialProduct + initialVariant + initialProductVariantMedia
            init_product = props.get("initialProduct", {})
            if init_product:
                title = init_product.get("title") or init_product.get("name", "")
                desc = _strip_html(init_product.get("description", ""))
                ingredients = _strip_html(init_product.get("ingredients", ""))
                how_to_use = _strip_html(init_product.get("how_to_use", ""))

                # Parse variants and images via detail parser
                detail = self._parse_inertia_product_detail(inertia)
                variants = detail.get("variants", [])
                all_images = detail.get("all_images", [])

                # Default price = cheapest active variant's price, or 0
                default_price = 0
                for v in variants:
                    if v.get("is_default"):
                        default_price = v.get("price", 0)
                        break
                if not default_price and variants:
                    default_price = variants[0].get("price", 0)

                return {
                    "name": title,
                    "description": desc[:500],
                    "price": default_price,
                    "sale_price": None,
                    "category": "",
                    "images": all_images,
                    "variants": variants,
                    "tags": [],
                    "is_combo": "combo" in title.lower() or "+" in title or "pack" in title.lower(),
                    "stock_status": "in_stock" if init_product.get("is_stock", True) else "out_of_stock",
                    "ingredients": ingredients[:500],
                    "how_to_use": how_to_use[:500],
                    "faqs": detail.get("faqs", []),
                    "highlights": detail.get("highlights", []),
                }

            # Fallback: legacy product key
            product = props.get("product", {})
            if product:
                title = product.get("title") or product.get("name", "")
                desc = _strip_html(product.get("description", ""))
                images = product.get("images", [])
                primary = product.get("primary_image")
                if primary and primary not in images:
                    images = [primary] + images
                return {
                    "name": title,
                    "description": desc[:500],
                    "price": float(product.get("sale_price") or product.get("price") or 0),
                    "sale_price": float(product["final_price"]) if product.get("final_price") and float(product.get("final_price", 0)) < float(product.get("sale_price", 0)) else None,
                    "category": "",
                    "images": images,
                    "variants": [],
                    "tags": [product.get("sku", "")],
                    "is_combo": "combo" in title.lower() or "+" in title or "pack" in title.lower(),
                    "stock_status": "in_stock" if product.get("is_stock") else "out_of_stock",
                }

        # Fall back to AI extraction
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "iframe"]):
            tag.decompose()
        text = soup.get_text(separator="\n", strip=True)[:5000]
        img_list = []
        for img in soup.find_all("img", src=True):
            src = img.get("src", "")
            if src and not src.startswith("data:"):
                img_list.append({"url": urljoin(url, src), "alt": img.get("alt", "")})

        model = self._get_model()
        prompt = f"""Extract product information from this page:

URL: {url}
TITLE: {soup.title.string if soup.title else ""}
CONTENT: {text}
IMAGES: {json.dumps(img_list[:10], ensure_ascii=False)}

Return VALID JSON:
{{
  "name": "product name",
  "description": "detailed description",
  "price": 0.0,
  "sale_price": null,
  "category": "category",
  "images": ["url1", "url2"],
  "variants": [{{"name": "Size M", "price": 500}}],
  "tags": ["tag1"],
  "is_combo": false,
  "combo_items": ["item1", "item2"],
  "stock_status": "in_stock"
}}

Return ONLY valid JSON."""

        try:
            response = await asyncio.to_thread(model.generate_content, prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\n?", "", text)
                text = re.sub(r"\n?```$", "", text)
            return json.loads(text)
        except Exception as e:
            logger.error(f"Product extraction failed: {e}")
            return {"error": str(e)}


# Singleton
website_scraper = WebsiteScraper()
