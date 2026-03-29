"""
SmartRep AI - AI Engine (Gemini + RAG + Multilingual)
The brain of SmartRep AI - handles all AI-powered responses
"""
import google.generativeai as genai
from typing import Optional, Dict, List, Tuple
from loguru import logger
from app.core.config import settings
from app.services.vector_store import vector_store


class AIEngine:
    """
    Core AI engine that:
    1. Detects language (Bangla, Banglish, English, Hindi)
    2. Detects intent (product query, order status, complaint, etc.)
    3. Searches knowledge base via RAG
    4. Generates contextual, multilingual responses
    5. Handles upselling
    6. Analyzes sentiment
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
                    "top_k": 40,
                    "max_output_tokens": 1024,
                },
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
                ],
            )
        return self._model

    async def detect_language(self, text: str) -> str:
        """Detect the language of the text"""
        model = self._get_model()
        prompt = f"""Detect the language of this text. Reply with ONLY one of these:
- "banglish" (Bengali written in English letters, e.g., "bhai ghori ache?")
- "bangla" (Bengali in Bengali script, e.g., "ভাই ঘড়ি আছে?")
- "english" (English)
- "hindi" (Hindi)
- "hinglish" (Hindi in English letters)

Text: "{text}"

Language:"""
        try:
            response = await model.generate_content_async(prompt)
            lang = response.text.strip().lower().replace('"', '').replace("'", "")
            valid_langs = ["banglish", "bangla", "english", "hindi", "hinglish"]
            return lang if lang in valid_langs else "banglish"
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return "auto"

    async def detect_intent(self, text: str) -> str:
        """Detect the customer's intent"""
        model = self._get_model()
        prompt = f"""Analyze this customer message and classify the intent. Reply with ONLY one of these:
- "product_query" (asking about products, features, details)
- "price_query" (asking about price)
- "order_status" (asking about order status/tracking)
- "complaint" (unhappy, issue, problem)
- "general_greeting" (hello, hi, etc.)
- "purchase_intent" (wants to buy/order)
- "negotiation" (bargaining, asking for discount)
- "return_refund" (wants return or refund)
- "other" (anything else)

Customer message: "{text}"

Intent:"""
        try:
            response = await model.generate_content_async(prompt)
            intent = response.text.strip().lower().replace('"', '').replace("'", "")
            return intent
        except Exception as e:
            logger.error(f"Intent detection failed: {e}")
            return "other"

    async def detect_sentiment(self, text: str) -> str:
        """Detect sentiment of the message"""
        model = self._get_model()
        prompt = f"""Analyze the sentiment of this customer message. Reply with ONLY one of:
- "positive" (happy, satisfied, thankful)
- "neutral" (normal question, no strong emotion)
- "negative" (slightly unhappy, concerned)
- "angry" (very angry, frustrated, threatening)

Message: "{text}"

Sentiment:"""
        try:
            response = await model.generate_content_async(prompt)
            sentiment = response.text.strip().lower().replace('"', '').replace("'", "")
            valid = ["positive", "neutral", "negative", "angry"]
            return sentiment if sentiment in valid else "neutral"
        except Exception as e:
            logger.error(f"Sentiment detection failed: {e}")
            return "neutral"

    async def generate_response(
        self,
        customer_message: str,
        business_context: Dict,
        knowledge_results: List[Dict],
        conversation_history: List[Dict],
        detected_language: str,
        detected_intent: str,
    ) -> str:
        """Generate an AI response using RAG context"""
        model = self._get_model()

        # Build knowledge context
        knowledge_context = ""
        if knowledge_results:
            knowledge_context = "\n\n📦 RELEVANT KNOWLEDGE BASE:\n"
            for i, doc in enumerate(knowledge_results, 1):
                knowledge_context += f"\n{i}. {doc['content']}\n"

        # Build conversation history
        history_text = ""
        if conversation_history:
            history_text = "\n\n💬 RECENT CONVERSATION:\n"
            for msg in conversation_history[-10:]:  # Last 10 messages
                role = "Customer" if msg["role"] == "customer" else "AI"
                history_text += f"{role}: {msg['content']}\n"

        # Language instruction
        language_instruction = self._get_language_instruction(detected_language)

        # Upsell instruction
        upsell_level = business_context.get("upsell_aggressiveness", 5)
        upsell_instruction = self._get_upsell_instruction(upsell_level)

        # Build the mega-prompt
        system_prompt = f"""You are SmartRep AI, an intelligent sales representative for "{business_context.get('business_name', 'this business')}".

🎯 YOUR ROLE:
- You are the business's representative on Facebook Messenger
- Act as a friendly, helpful, knowledgeable sales person
- Help customers find what they need and make purchases
- Handle complaints with empathy and professionalism
- Never reveal you are an AI - act as a human representative

📋 BUSINESS INFO:
- Business: {business_context.get('business_name', 'Unknown')}
- Description: {business_context.get('business_description', '')}
- Currency: {business_context.get('currency', 'BDT')}
- Personality: {business_context.get('ai_personality', 'friendly')}

{knowledge_context}

{history_text}

🌐 LANGUAGE RULES:
{language_instruction}

💰 SALES RULES:
{upsell_instruction}

📌 RESPONSE RULES:
1. Keep responses concise (2-4 sentences max unless detailed info needed)
2. Use emojis naturally but don't overdo it
3. If you don't know something, say you'll check and get back
4. For orders, collect: product, quantity, delivery address, phone number
5. Suggest related products when appropriate
6. Be warm, personal, and helpful
7. If customer seems angry, be extra empathetic and offer solutions
8. Use the same currency as the business ({business_context.get('currency', 'BDT')})

🔍 DETECTED CONTEXT:
- Customer Language: {detected_language}
- Customer Intent: {detected_intent}

Now respond to the customer's latest message naturally:

Customer: {customer_message}

Your Response:"""

        try:
            response = await model.generate_content_async(system_prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            return self._get_fallback_response(detected_language)

    def _get_language_instruction(self, language: str) -> str:
        """Get language-specific instructions"""
        instructions = {
            "banglish": """The customer is writing in Banglish (Bengali in English letters).
RESPOND IN BANGLISH. Example: "Vai, amader kache onek sundor ghori ache! Ki type er ghori lagbe?"
Match their writing style exactly.""",
            "bangla": """The customer is writing in Bengali (বাংলা).
RESPOND IN BENGALI SCRIPT. Example: "ভাই, আমাদের কাছে অনেক সুন্দর ঘড়ি আছে! কি ধরনের ঘড়ি লাগবে?"
Use proper Bengali.""",
            "english": """The customer is writing in English.
RESPOND IN ENGLISH. Keep it friendly and conversational.""",
            "hindi": """The customer is writing in Hindi.
RESPOND IN HINDI. Example: "भाई, हमारे पास बहुत अच्छी watches हैं! कौन सी चाहिए?"
Use natural Hindi.""",
            "hinglish": """The customer is writing in Hinglish (Hindi in English letters).
RESPOND IN HINGLISH. Example: "Bhai, hamare paas bahut acchi watches hain! Kaunsi chahiye?"
Match their style.""",
        }
        return instructions.get(language, instructions["banglish"])

    def _get_upsell_instruction(self, level: int) -> str:
        """Get upsell instructions based on aggressiveness level"""
        if level <= 3:
            return "Minimal upselling. Only mention related products if directly relevant."
        elif level <= 6:
            return """Moderate upselling:
- Mention 1 related product when relevant
- Suggest upgrades if they ask about a basic product
- Mention current offers/discounts naturally"""
        else:
            return """Active upselling:
- Always suggest 1-2 related/better products
- Mention bundles and combos
- Create urgency (limited stock, special offer)
- Highlight value proposition
- Suggest premium options first"""

    def _get_fallback_response(self, language: str) -> str:
        """Fallback responses when AI fails"""
        fallbacks = {
            "banglish": "Vai, aktu wait koren. Amader team er keu apnake shigr help korbe! 😊",
            "bangla": "ভাই, একটু ওয়েট করেন। আমাদের টিমের কেউ আপনাকে শীঘ্রই হেল্প করবে! 😊",
            "english": "Please wait a moment. Our team will help you shortly! 😊",
            "hindi": "भाई, एक मिनट रुकिए। हमारी टीम आपकी जल्दी मदद करेगी! 😊",
            "hinglish": "Bhai, ek minute ruko. Hamari team apki jaldi help karegi! 😊",
        }
        return fallbacks.get(language, fallbacks["banglish"])

    async def generate_product_description(self, product) -> str:
        """Generate an attractive product description"""
        model = self._get_model()
        prompt = f"""Generate a compelling, attractive product description for an e-commerce listing.

Product Name: {product.name}
Current Description: {product.description or 'None'}
Price: {product.price} {product.currency}
Category: {product.category or 'General'}

Generate:
1. A catchy one-line headline
2. Key features (3-5 bullet points)
3. A short persuasive description (2-3 sentences)

Format as clean text, not markdown. Keep it professional and appealing."""

        try:
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Product description generation failed: {e}")
            return product.description or ""

    async def analyze_and_segment_customer(
        self,
        conversation_history: List[Dict],
        current_segment: str,
        total_orders: int,
        total_spent: float,
    ) -> str:
        """Analyze conversation to determine customer segment"""
        model = self._get_model()

        history_text = "\n".join(
            [f"{'Customer' if m['role'] == 'customer' else 'AI'}: {m['content']}"
             for m in conversation_history[-20:]]
        )

        prompt = f"""Based on this conversation and customer data, classify the customer segment.

Conversation:
{history_text}

Customer Data:
- Current Segment: {current_segment}
- Total Orders: {total_orders}
- Total Spent: {total_spent}

Reply with ONLY one of these segments:
- "hot_lead" (actively interested, asking specific questions about buying)
- "warm_lead" (browsing, somewhat interested)
- "cold_lead" (not very interested, just passing)
- "repeat_buyer" (has ordered before)
- "vip" (high value customer, ordered multiple times or spent a lot)
- "unhappy" (complained, negative experience)
- "new" (first time visitor)

Segment:"""

        try:
            response = await model.generate_content_async(prompt)
            segment = response.text.strip().lower().replace('"', '').replace("'", "")
            valid = ["hot_lead", "warm_lead", "cold_lead", "repeat_buyer", "vip", "unhappy", "new"]
            return segment if segment in valid else current_segment
        except Exception as e:
            logger.error(f"Customer segmentation failed: {e}")
            return current_segment

    async def generate_abandoned_chat_message(
        self,
        customer_name: str,
        last_products_discussed: List[str],
        language: str,
    ) -> str:
        """Generate a follow-up message for abandoned chats"""
        model = self._get_model()
        products_text = ", ".join(last_products_discussed) if last_products_discussed else "our products"

        lang_instruction = self._get_language_instruction(language)

        prompt = f"""Generate a friendly follow-up message for a customer who was interested but didn't complete a purchase.

Customer Name: {customer_name or "there"}
Products They Were Interested In: {products_text}

{lang_instruction}

The message should:
1. Be warm and personal
2. Remind them about the products they were looking at
3. Create mild urgency (limited stock or special offer)
4. Be short (2-3 sentences max)
5. Include 1-2 emojis

Generate the follow-up message:"""

        try:
            response = await model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Abandoned chat message generation failed: {e}")
            return ""

    async def extract_order_from_conversation(
        self,
        conversation_history: List[Dict],
    ) -> Optional[Dict]:
        """Extract order details from conversation using AI"""
        model = self._get_model()

        history_text = "\n".join(
            [f"{'Customer' if m['role'] == 'customer' else 'AI'}: {m['content']}"
             for m in conversation_history]
        )

        prompt = f"""Analyze this conversation and extract order details if the customer wants to buy something.

Conversation:
{history_text}

If there's a clear purchase intent, extract and respond with this JSON format:
{{
    "has_order": true,
    "items": [
        {{"product_name": "...", "quantity": 1, "unit_price": 0}},
    ],
    "customer_name": "...",
    "delivery_address": "...",
    "delivery_phone": "...",
    "payment_method": "..."
}}

If no clear purchase intent, respond with:
{{"has_order": false}}

JSON Response:"""

        try:
            response = await model.generate_content_async(prompt)
            import json
            text = response.text.strip()
            # Clean up potential markdown code blocks
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Order extraction failed: {e}")
            return None

    async def process_message(
        self,
        customer_message: str,
        business_id: str,
        business_context: Dict,
        conversation_history: List[Dict],
    ) -> Dict:
        """
        Main entry point: Process a customer message end-to-end.
        OPTIMIZED: Single Gemini call does everything (language + intent + sentiment + response)
        instead of 4 separate calls.
        """
        import asyncio
        import json as json_module

        logger.info(f"AI process_message called: msg='{customer_message[:50]}', business_id={business_id}")

        # Step 1: Search knowledge base (non-blocking, with timeout)
        knowledge_results = []
        try:
            knowledge_results = await asyncio.wait_for(
                vector_store.search(
                    business_id=business_id,
                    query=customer_message,
                    n_results=5,
                ),
                timeout=5.0,
            )
            logger.info(f"RAG search returned {len(knowledge_results)} results")
        except asyncio.TimeoutError:
            logger.warning("RAG search timed out (5s), continuing without knowledge")
        except Exception as e:
            logger.warning(f"RAG search failed: {e}")

        # Build knowledge context
        knowledge_context = ""
        if knowledge_results:
            knowledge_context = "\n\nPRODUCT/KNOWLEDGE BASE:\n"
            for i, doc in enumerate(knowledge_results, 1):
                knowledge_context += f"{i}. {doc['content']}\n"

        # Build conversation history
        history_text = ""
        if conversation_history:
            history_text = "\n\nRECENT CONVERSATION:\n"
            for msg in conversation_history[-10:]:
                role = "Customer" if msg["role"] == "customer" else "AI"
                history_text += f"{role}: {msg['content']}\n"

        # Step 2: SINGLE Gemini call - detect language, intent, sentiment + generate response
        model = self._get_model()
        
        combined_prompt = f"""You are SmartRep AI, a smart sales representative for "{business_context.get('business_name', 'a business')}".

BUSINESS: {business_context.get('business_name', 'Unknown')} - {business_context.get('business_description', '')}
Currency: {business_context.get('currency', 'BDT')}
{knowledge_context}
{history_text}

CUSTOMER MESSAGE: "{customer_message}"

INSTRUCTIONS:
1. "language" MUST be one of: "banglish", "bangla", "english", "hindi", "hinglish"
2. "intent" MUST be one of: "product_query", "price_query", "order_status", "complaint", "general_greeting", "purchase_intent", "negotiation", "return_refund", "other"
3. "sentiment" MUST be one of: "positive", "neutral", "negative", "angry"
4. "response" = your helpful reply in the SAME language the customer used
5. Keep reply short (2-3 sentences max), friendly, use 1-2 emojis
6. If customer writes in Banglish (Bengali in English letters), reply in Banglish
7. If customer writes in Bangla script, reply in Bangla script
8. Never reveal you are AI - you are a human representative
9. If you have product info from KNOWLEDGE BASE above, use it in your reply

Reply as JSON:
{{"language": "...", "intent": "...", "sentiment": "...", "response": "..."}}"""

        try:
            import httpx
            # Direct REST API call — faster and more reliable than google-generativeai library
            chat_model_name = "gemini-2.5-flash-lite"
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{chat_model_name}:generateContent"
            
            logger.info(f"Calling Gemini REST API (model={chat_model_name})...")
            
            request_body = {
                "contents": [{"parts": [{"text": combined_prompt}]}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json",
                },
            }
            
            async with httpx.AsyncClient(timeout=25.0) as client:
                api_response = await client.post(
                    api_url,
                    params={"key": settings.GEMINI_API_KEY},
                    json=request_body,
                )
            
            logger.info(f"Gemini API status: {api_response.status_code}")
            
            if api_response.status_code != 200:
                logger.error(f"Gemini API error: {api_response.status_code} - {api_response.text[:300]}")
                raise Exception(f"Gemini API returned {api_response.status_code}")
            
            response_data = api_response.json()
            raw_text = response_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            logger.info(f"Gemini raw response: {raw_text[:300]}")

            # Clean up markdown code blocks if present
            if raw_text.startswith("```"):
                lines = raw_text.split("\n")
                raw_text = "\n".join(lines[1:])
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
            if raw_text.startswith("`"):
                raw_text = raw_text.strip("`").strip()

            parsed = json_module.loads(raw_text)
            
            result = {
                "response": parsed.get("response", "Thank you for your message!"),
                "language": parsed.get("language", "auto"),
                "intent": parsed.get("intent", "other"),
                "sentiment": parsed.get("sentiment", "neutral"),
                "knowledge_used": len(knowledge_results),
            }
            logger.info(f"AI result: lang={result['language']}, intent={result['intent']}, response={result['response'][:80]}")
            return result

        except asyncio.TimeoutError:
            logger.error("Gemini API timed out (30s)!")
            return {
                "response": self._get_fallback_response("banglish"),
                "language": "auto",
                "intent": "other",
                "sentiment": "neutral",
                "knowledge_used": 0,
            }
        except json_module.JSONDecodeError as e:
            logger.warning(f"Gemini response not valid JSON: {e}, raw: {raw_text[:200]}")
            # If JSON parsing fails, use the raw text as the response
            return {
                "response": raw_text[:500] if raw_text else "Thank you for your message!",
                "language": "auto",
                "intent": "other",
                "sentiment": "neutral",
                "knowledge_used": len(knowledge_results),
            }
        except Exception as e:
            logger.error(f"AI engine error: {e}")
            return {
                "response": self._get_fallback_response("banglish"),
                "language": "auto",
                "intent": "other",
                "sentiment": "neutral",
                "knowledge_used": 0,
            }


# Singleton
ai_engine = AIEngine()
