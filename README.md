# 🤖 SmartRep AI

**AI-Powered F-Commerce Sales Assistant** — Automate your Facebook Messenger customer conversations with intelligent AI that speaks your customer's language.

<div align="center">

![SmartRep AI](https://img.shields.io/badge/SmartRep-AI-6366F1?style=for-the-badge&logo=robot&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

</div>

---

## ✨ What is SmartRep AI?

SmartRep AI is a SaaS platform that acts as your **24/7 AI sales representative** on Facebook Messenger. It automatically handles customer inquiries, takes orders, upsells products, and provides support — all in your customer's preferred language (Bangla, Banglish, English, Hindi).

### 🎯 Key Features

- **🧠 RAG-Powered AI** — Retrieval-Augmented Generation using your product catalog and knowledge base
- **🌐 Multi-Language** — Auto-detects and responds in Bangla, Banglish, English, Hindi, Hinglish
- **🛒 Smart Order Taking** — Extracts order details from natural conversation
- **📈 Upsell Intelligence** — Suggests related products based on conversation context
- **😊 Sentiment Analysis** — Real-time mood detection with angry customer alerts
- **🔄 Human Handoff** — Seamlessly transfer to human agents when needed
- **📊 Deep Analytics** — Conversion funnels, sentiment trends, language breakdown
- **⚡ Sub-3s Responses** — Lightning-fast AI responses via Gemini 2.0 Flash

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI/LLM** | Google Gemini 2.0 Flash + LangChain |
| **Vector Store** | ChromaDB (RAG pipeline) |
| **Backend** | Python FastAPI (async) |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **UI** | shadcn/ui, Phosphor Icons, Framer Motion |
| **Charts** | Recharts |
| **Auth** | JWT + bcrypt |
| **Infrastructure** | Docker Compose |

---

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (for PostgreSQL, Redis, ChromaDB)
- **Python 3.11+**
- **Node.js 18+** (recommended: 20 LTS)
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey)
- **Facebook Developer Account** — [Create app here](https://developers.facebook.com/)

### 1. Clone & Setup

```bash
cd "/Volumes/Habib Mac/App/AI Chat Bot with RAG"
```

### 2. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- ChromaDB on `localhost:8000`

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your actual keys:
#   GEMINI_API_KEY=your_key
#   FACEBOOK_APP_ID=your_app_id
#   FACEBOOK_APP_SECRET=your_secret
#   FACEBOOK_VERIFY_TOKEN=your_verify_token

# Run database migrations
alembic revision --autogenerate -m "initial"
alembic upgrade head

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Backend runs at: `http://localhost:8080`
API docs at: `http://localhost:8080/docs`

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 5. Default Admin Login

```
Email: admin@smartrep.ai
Password: admin123456
```

---

## 📁 Project Structure

```
├── docker-compose.yml          # PostgreSQL + Redis + ChromaDB
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI application entry
│   │   ├── core/
│   │   │   ├── config.py       # Environment configuration
│   │   │   ├── database.py     # Async SQLAlchemy setup
│   │   │   └── security.py     # JWT + password hashing
│   │   ├── models/
│   │   │   └── models.py       # 13 SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── schemas.py      # Pydantic request/response schemas
│   │   ├── api/
│   │   │   ├── deps.py         # Auth dependencies
│   │   │   └── routes/
│   │   │       ├── auth.py     # Register, Login, Profile
│   │   │       ├── business.py # Business & subscription management
│   │   │       ├── products.py # Product CRUD + AI descriptions
│   │   │       ├── knowledge_base.py  # KB CRUD + vector embeddings
│   │   │       ├── conversations.py   # Chat management + customer CRUD
│   │   │       ├── analytics.py       # Dashboard stats
│   │   │       ├── integrations.py    # Facebook page connections
│   │   │       ├── admin.py           # Admin panel endpoints
│   │   │       └── webhook.py         # Facebook webhook handler
│   │   └── services/
│   │       ├── ai_engine.py    # Core AI (Gemini + RAG + NLP)
│   │       ├── vector_store.py # ChromaDB vector operations
│   │       └── facebook.py     # FB Messenger API client
│   ├── alembic/                # Database migrations
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── login/page.tsx        # Login
│   │   │   ├── register/page.tsx     # Registration
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.tsx        # Dashboard shell + sidebar
│   │   │   │   ├── page.tsx          # Main dashboard + charts
│   │   │   │   ├── conversations/    # Chat interface
│   │   │   │   ├── knowledge-base/   # KB management
│   │   │   │   ├── products/         # Product catalog
│   │   │   │   ├── orders/           # Order management
│   │   │   │   ├── analytics/        # Detailed analytics
│   │   │   │   ├── integrations/     # FB page connections
│   │   │   │   └── settings/         # AI & business settings
│   │   │   └── admin/
│   │   │       ├── layout.tsx        # Admin shell
│   │   │       ├── page.tsx          # Admin dashboard
│   │   │       ├── users/            # User management
│   │   │       └── system/           # System health
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios API client
│   │   │   └── utils.ts             # Utilities
│   │   └── stores/
│   │       └── auth-store.ts        # Zustand auth state
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## 🔧 Facebook Webhook Setup

1. Go to [Facebook Developer Console](https://developers.facebook.com/)
2. Create a new app → Select "Business" type
3. Add **Messenger** product
4. Set Webhook URL: `https://your-domain.com/api/v1/webhook/facebook`
5. Verify Token: Use the value from your `.env` file (`FACEBOOK_VERIFY_TOKEN`)
6. Subscribe to: `messages`, `messaging_postbacks`
7. Generate Page Access Token and connect via the Integrations page

> **For local development**, use [ngrok](https://ngrok.com/) to expose your local server:
> ```bash
> ngrok http 8080
> ```

---

## 💰 Pricing Plans

| Plan | Price | Messages/mo | Pages | Features |
|------|-------|-------------|-------|----------|
| **Starter** | Free | 200 | 1 | Basic AI, 14-day trial |
| **Growth** | $14.99/mo | 2,000 | 3 | + Analytics, Upselling |
| **Professional** | $34.99/mo | 10,000 | 10 | + Sentiment, Campaigns |
| **Enterprise** | $119/mo | 50,000 | Unlimited | + Custom AI, Priority |

---

## 🛣️ Roadmap

- [x] Phase 1: Facebook Messenger Integration
- [ ] Phase 2: WhatsApp Business API
- [ ] Phase 3: Instagram DM
- [ ] Phase 4: Multi-store management
- [ ] Phase 5: Mobile app (React Native)

---

## 📄 License

MIT License — Built with ❤️ for F-Commerce entrepreneurs in Bangladesh.
