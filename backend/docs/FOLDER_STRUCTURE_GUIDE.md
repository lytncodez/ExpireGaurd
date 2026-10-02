# ExpireGuard Backend — EXACT Folder Structure & File Placement

**Where to put every file delivered**

---

## 📁 Complete Folder Structure

```
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                                  ← UPDATE THIS
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                           ← UPDATE THIS (add SMS & AI config)
│   │   ├── database.py
│   │   ├── security.py
│   │   └── logging.py
│   │
│   ├── models/                                 ← COPY FILES HERE
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── batch.py
│   │   ├── sale.py
│   │   ├── import.py
│   │   │
│   │   ├── alert.py                   ← COPY: alert_model.py HERE
│   │   └── insight.py                 ← COPY: insight_model.py HERE
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── batch.py
│   │   ├── sale.py
│   │   └── import.py
│   │
│   ├── routes/                                 ← COPY FILES HERE
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── batches.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   ├── imports.py
│   │   ├── expiry.py
│   │   │
│   │   ├── alerts.py                  ← COPY: alert_routes.py HERE
│   │   └── insights.py                ← COPY: insight_routes.py HERE
│   │
│   ├── services/                               ← COPY FILES HERE
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── batch_service.py
│   │   ├── expiry_service.py
│   │   ├── inventory_service.py
│   │   ├── sales_service.py
│   │   ├── csv_service.py
│   │   │
│   │   ├── sms_service.py             ← COPY: sms_service.py HERE
│   │   ├── alert_service.py           ← COPY: alert_service.py HERE
│   │   ├── analytics_service.py       ← COPY: analytics_service.py HERE
│   │   ├── context_builder.py         ← COPY: context_builder.py HERE
│   │   └── insight_service.py         ← COPY: insight_service.py HERE
│   │
│   ├── prompts.py                             ← COPY: prompts.py HERE (in app/ root)
│   │
│   └── tests/
│       ├── __init__.py
│       ├── test_auth.py
│       ├── test_products.py
│       ├── test_batches.py
│       ├── test_expiry.py
│       └── test_alerts.py
│
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   ├── alembic.ini
│   └── versions/
│       ├── 001_initial_schema.py       ← EXISTING
│       ├── 002_add_alerts_table.py     ← CREATE (for alerts)
│       └── 003_add_insights_table.py   ← CREATE (for insights)
│
├── tests/                                     ← COPY TEST FILE HERE
│   ├── __init__.py
│   ├── conftest.py
│   └── test_alerts_sms.py             ← COPY: test_alerts_sms.py HERE
│
├── .env                                       ← COPY: .env.template → .env
├── .env.template                      ← COPY: .env.template HERE
├── .gitignore
├── requirements.txt                           ← UPDATE (add anthropic, twilio)
├── docker-compose.yml
├── Dockerfile
├── README.md
│
└── docs/                                      ← COPY DOCS HERE
    ├── BACKEND_SPECIFICATION.md       ← COPY HERE
    ├── ALERT_SMS_FLOW.md              ← COPY HERE
    ├── IMPLEMENTATION_GUIDE.md        ← COPY HERE
    ├── AI_INTEGRATION_GUIDE.md        ← COPY HERE
    └── COMPLETE_DELIVERY_SUMMARY.md   ← COPY HERE
```

---

## 📋 File-by-File Placement Guide

### **PHASE 1: Alert & SMS System**

#### 1️⃣ **alert_model.py**
```
COPY TO: backend/app/models/alert.py
COMMAND: cp alert_model.py backend/app/models/alert.py
PURPOSE: Database model for alerts with SMS tracking
```

#### 2️⃣ **sms_service.py**
```
COPY TO: backend/app/services/sms_service.py
COMMAND: cp sms_service.py backend/app/services/sms_service.py
PURPOSE: SMS provider abstraction (MOCK/Twilio/Africa's Talking)
```

#### 3️⃣ **alert_service.py**
```
COPY TO: backend/app/services/alert_service.py
COMMAND: cp alert_service.py backend/app/services/alert_service.py
PURPOSE: Alert orchestration and deduplication logic
```

#### 4️⃣ **alert_routes.py**
```
COPY TO: backend/app/routes/alerts.py
COMMAND: cp alert_routes.py backend/app/routes/alerts.py
PURPOSE: FastAPI endpoints for alert management
```

#### 5️⃣ **test_alerts_sms.py**
```
COPY TO: backend/tests/test_alerts_sms.py
COMMAND: cp test_alerts_sms.py backend/tests/test_alerts_sms.py
PURPOSE: Unit tests for alert and SMS logic
RUN: cd backend && python -m pytest tests/test_alerts_sms.py
```

---

### **PHASE 2: Analytics Engine**

#### 6️⃣ **analytics_service.py**
```
COPY TO: backend/app/services/analytics_service.py
COMMAND: cp analytics_service.py backend/app/services/analytics_service.py
PURPOSE: Calculate verified business metrics
```

---

### **PHASE 3: AI Intelligence**

#### 7️⃣ **context_builder.py**
```
COPY TO: backend/app/services/context_builder.py
COMMAND: cp context_builder.py backend/app/services/context_builder.py
PURPOSE: Package analytics data for AI interpretation
```

#### 8️⃣ **prompts.py**
```
COPY TO: backend/app/prompts.py
COMMAND: cp prompts.py backend/app/prompts.py
PURPOSE: System prompts and guardrails for Claude
LOCATION: In app/ root, NOT in services/
```

#### 9️⃣ **insight_service.py**
```
COPY TO: backend/app/services/insight_service.py
COMMAND: cp insight_service.py backend/app/services/insight_service.py
PURPOSE: Claude AI integration and insight generation
REQUIRES: ANTHROPIC_API_KEY environment variable
```

#### 🔟 **insight_model.py**
```
COPY TO: backend/app/models/insight.py
COMMAND: cp insight_model.py backend/app/models/insight.py
PURPOSE: Database model for storing insights
```

#### 1️⃣1️⃣ **insight_routes.py**
```
COPY TO: backend/app/routes/insights.py
COMMAND: cp insight_routes.py backend/app/routes/insights.py
PURPOSE: FastAPI endpoints for insight management
```

---

### **PHASE 4: Configuration**

#### 1️⃣2️⃣ **.env.template**
```
COPY TO: backend/.env
COMMAND: cp .env.template backend/.env
EDIT: Set your actual values:
  - ANTHROPIC_API_KEY=sk-ant-xxxxx
  - SMS_PROVIDER=MOCK (or TWILIO)
  - DATABASE_URL=...
  - SECRET_KEY=...
```

---

### **PHASE 5: Documentation**

#### 1️⃣3️⃣ **BACKEND_SPECIFICATION.md**
```
COPY TO: backend/docs/BACKEND_SPECIFICATION.md
COMMAND: mkdir -p backend/docs && cp BACKEND_SPECIFICATION.md backend/docs/
PURPOSE: Complete technical reference
```

#### 1️⃣4️⃣ **ALERT_SMS_FLOW.md**
```
COPY TO: backend/docs/ALERT_SMS_FLOW.md
COMMAND: cp ALERT_SMS_FLOW.md backend/docs/
PURPOSE: Alert & SMS architecture details
```

#### 1️⃣5️⃣ **IMPLEMENTATION_GUIDE.md**
```
COPY TO: backend/docs/IMPLEMENTATION_GUIDE.md
COMMAND: cp IMPLEMENTATION_GUIDE.md backend/docs/
PURPOSE: Step-by-step integration guide
```

#### 1️⃣6️⃣ **AI_INTEGRATION_GUIDE.md**
```
COPY TO: backend/docs/AI_INTEGRATION_GUIDE.md
COMMAND: cp AI_INTEGRATION_GUIDE.md backend/docs/
PURPOSE: AI layer documentation
```

#### 1️⃣7️⃣ **COMPLETE_DELIVERY_SUMMARY.md**
```
COPY TO: backend/docs/COMPLETE_DELIVERY_SUMMARY.md
COMMAND: cp COMPLETE_DELIVERY_SUMMARY.md backend/docs/
PURPOSE: Overview of complete system
```

---

## ⚙️ Configuration Files (UPDATE THESE)

### **1. Update requirements.txt**

Add these lines:
```bash
# SMS
twilio==8.10.0

# AI
anthropic==0.25.0
```

Run:
```bash
pip install -r requirements.txt
```

### **2. Update app/core/config.py**

Add SMS and AI configuration:
```python
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # ... existing settings ...
    
    # SMS Configuration
    sms_provider: str = os.getenv("SMS_PROVIDER", "MOCK")
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_phone_number: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    africastalking_api_key: str = os.getenv("AFRICASTALKING_API_KEY", "")
    africastalking_username: str = os.getenv("AFRICASTALKING_USERNAME", "")
    
    # AI Configuration
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    ai_model: str = os.getenv("AI_MODEL", "claude-sonnet-4-6")
    ai_max_tokens: int = int(os.getenv("AI_MAX_TOKENS", "1000"))

settings = Settings()
```

### **3. Update app/main.py**

Register the new routes:
```python
from fastapi import FastAPI
from app.routes import alerts, insights

app = FastAPI()

# ... existing imports and setup ...

# Register new routes
app.include_router(alerts.router)
app.include_router(insights.router)

# ... rest of your app ...
```

### **4. Update app/models/__init__.py**

Import the new models:
```python
from app.models.base import Base
from app.models.user import User
from app.models.product import Product
from app.models.batch import Batch
from app.models.sale import Sale
from app.models.alert import Alert        # ADD THIS
from app.models.insight import Insight    # ADD THIS
```

---

## 🗄️ Database Migrations (CREATE THESE)

### **Create Migration for Alerts**

```bash
cd backend
alembic revision --autogenerate -m "Add alerts table"
```

This will create: `alembic/versions/001_add_alerts_table.py`

### **Create Migration for Insights**

```bash
alembic revision --autogenerate -m "Add insights table"
```

This will create: `alembic/versions/002_add_insights_table.py`

### **Apply Migrations**

```bash
alembic upgrade head
```

---

## ✅ Verification Checklist

After copying all files:

- [ ] Alert files copied to `app/models/` and `app/routes/`
- [ ] SMS service copied to `app/services/`
- [ ] Analytics service copied to `app/services/`
- [ ] Context builder copied to `app/services/`
- [ ] Prompts copied to `app/` root
- [ ] Insight files copied to `app/models/`, `app/services/`, `app/routes/`
- [ ] Test file copied to `tests/`
- [ ] Documentation files copied to `docs/`
- [ ] `.env` file created from `.env.template`
- [ ] `requirements.txt` updated with `anthropic` and `twilio`
- [ ] `app/core/config.py` updated with SMS and AI config
- [ ] `app/main.py` updated with route registration
- [ ] `app/models/__init__.py` updated with new imports
- [ ] Migrations created with alembic
- [ ] Migrations applied with `alembic upgrade head`

---

## 🚀 Quick Copy-Paste Commands

Copy all files at once:

```bash
# Navigate to your backend folder
cd backend

# Create docs folder
mkdir -p docs

# Copy all files
cp ~/Downloads/alert_model.py app/models/alert.py
cp ~/Downloads/sms_service.py app/services/sms_service.py
cp ~/Downloads/alert_service.py app/services/alert_service.py
cp ~/Downloads/alert_routes.py app/routes/alerts.py
cp ~/Downloads/analytics_service.py app/services/analytics_service.py
cp ~/Downloads/context_builder.py app/services/context_builder.py
cp ~/Downloads/prompts.py app/prompts.py
cp ~/Downloads/insight_service.py app/services/insight_service.py
cp ~/Downloads/insight_model.py app/models/insight.py
cp ~/Downloads/insight_routes.py app/routes/insights.py
cp ~/Downloads/test_alerts_sms.py tests/test_alerts_sms.py

# Copy docs
cp ~/Downloads/BACKEND_SPECIFICATION.md docs/
cp ~/Downloads/ALERT_SMS_FLOW.md docs/
cp ~/Downloads/IMPLEMENTATION_GUIDE.md docs/
cp ~/Downloads/AI_INTEGRATION_GUIDE.md docs/
cp ~/Downloads/COMPLETE_DELIVERY_SUMMARY.md docs/

# Copy config
cp ~/Downloads/.env.template .env

# Create migrations
alembic revision --autogenerate -m "Add alerts and insights tables"

# Apply migrations
alembic upgrade head
```

---

## 🧪 Test It

```bash
# Run tests
pytest tests/test_alerts_sms.py -v

# Start server
python -m uvicorn app.main:app --reload

# Test endpoints
curl http://localhost:8000/docs  # Swagger UI
```

---

## 📊 Summary

| File | Destination | Type |
|------|-------------|------|
| alert_model.py | `app/models/alert.py` | Model |
| sms_service.py | `app/services/sms_service.py` | Service |
| alert_service.py | `app/services/alert_service.py` | Service |
| alert_routes.py | `app/routes/alerts.py` | Route |
| analytics_service.py | `app/services/analytics_service.py` | Service |
| context_builder.py | `app/services/context_builder.py` | Service |
| prompts.py | `app/prompts.py` | Config |
| insight_service.py | `app/services/insight_service.py` | Service |
| insight_model.py | `app/models/insight.py` | Model |
| insight_routes.py | `app/routes/insights.py` | Route |
| test_alerts_sms.py | `tests/test_alerts_sms.py` | Test |
| .env.template | `.env` | Config |
| 5 docs | `docs/` | Docs |

---

## ❓ Still Confused?

**Remember the pattern:**

```
Models        → app/models/
Services      → app/services/
Routes        → app/routes/
Prompts       → app/ (root)
Tests         → tests/
Config        → .env
Docs          → docs/
```

Just follow this and you can't go wrong! 🎯
