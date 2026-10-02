# ExpireGuard — Complete Backend Specification v1.0

**Document Purpose:** Definitive backend specification for ExpireGuard MVP. This document defines architecture, features, database schema, API endpoints, and implementation strategy.

**Target Audience:** Backend developers, team leads, DevOps engineers, frontend developers integrating with this backend.

**Last Updated:** 2026-09-28  
**Status:** Production MVP Specification

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Philosophy](#core-philosophy)
3. [Authentication & User Management](#authentication--user-management)
4. [Database Schema](#database-schema)
5. [Product & Batch Management](#product--batch-management)
6. [Expiry Engine (Deterministic)](#expiry-engine-deterministic)
7. [Alert System](#alert-system)
8. [SMS Notification System](#sms-notification-system)
9. [CSV/Excel Import Pipeline](#csvexcel-import-pipeline)
10. [Inventory Management](#inventory-management)
11. [Sales Management](#sales-management)
12. [Analytics Engine](#analytics-engine)
13. [AI Intelligence Layer](#ai-intelligence-layer)
14. [API Reference](#api-reference)
15. [Security](#security)
16. [Project Structure](#project-structure)
17. [Implementation Roadmap](#implementation-roadmap)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       EXPIREGUARD BACKEND                         │
└─────────────────────────────────────────────────────────────────┘

                          FASTAPI
                      REST API Layer
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
    AUTH ROUTES         BUSINESS ROUTES    DATA IMPORT ROUTES
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   AUTH SERVICE      INVENTORY SERVICE    CSV SERVICE
   (security)        (products/batches)   (validation/import)
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼────────────────────────────────┐
        │                   │                   │            │
        ▼                   ▼                   ▼            ▼
   EXPIRY SERVICE    ALERT SERVICE        SMS SERVICE   SALES SERVICE
   (deterministic)   (deduplication)      (abstracted)   (transactions)
        │                   │                   │            │
        └───────────────────┼───────────────────┼────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ANALYTICS ENGINE    PATTERN DETECTION    ANOMALY DETECTION
   (verified metrics)  (deterministic)      (statistical)
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │  AI INTELLIGENCE     │
                  │  CONTEXT BUILDER     │
                  │  PROMPT ENGINEERING  │
                  │  GUARDRAILS          │
                  └──────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    INSIGHTS          RECOMMENDATIONS      FOLLOW-UP Q&A
    (stored)          (evidence-based)    (context aware)
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   POSTGRESQL DB      │
                  │   (historical data)  │
                  └──────────────────────┘
                             │
                             ▼
                       DASHBOARD API
                             │
                             ▼
                         FRONTEND
```

### Core Principles

**1. Deterministic Backend Logic**
- Expiry calculations: Never depend on AI
- Alert generation: Always based on thresholds
- Inventory updates: Deterministic and verifiable
- Sales recording: Immutable transaction log

**2. Verified Data Pipeline**
```
Raw Data → Validation → Cleaning → Database → Analytics → Verified Metrics
```

**3. AI as Intelligence Layer**
- AI receives structured data from analytics
- AI interprets patterns, not generates data
- Every recommendation linked to evidence
- AI enhances, doesn't replace, analytics

**4. Data Isolation**
- One business account for MVP
- Future: Multi-tenant with data isolation
- Users only access their company's data

---

## Core Philosophy

### What ExpireGuard Does

```
INPUT: Business Data (CSV, API, manual entry)
    ↓
PROCESS: Validation → Storage → Calculation
    ↓
ANALYSIS: Expiry tracking, Sales tracking, Inventory tracking
    ↓
INTELLIGENCE: Pattern detection + AI insights
    ↓
OUTPUT: Alerts, Recommendations, Dashboard
    ↓
ACTION: Business decisions & operational changes
```

### The NonNegotiable Loop

```
BUSINESS DATA
    ↓
CSV/EXCEL/API
    ↓
VALIDATE + CLEAN
    ↓
POSTGRESQL
    ↓
INVENTORY + SALES
    ↓
EXPIRY ENGINE (deterministic)
    ↓
ALERTS + SMS
    ↓
ANALYTICS ENGINE (verified metrics)
    ↓
AI ENGINE (interpretation)
    ↓
INSIGHTS + RECOMMENDATIONS
    ↓
DASHBOARD
    ↓
BUSINESS DECISION
```

---

## Authentication & User Management

### Features

- [x] User registration with email validation
- [x] Secure login with JWT tokens
- [x] Password hashing with bcrypt
- [x] Token expiration and refresh
- [x] Password reset workflow
- [x] Account status management
- [x] Role-based access control (RBAC)
- [x] Session management

### User Model

```python
User
├── id (Primary Key)
├── email (Unique, indexed)
├── name
├── phone_number (Optional)
├── password_hash (bcrypt)
├── role (ADMIN | MANAGER | STAFF)
├── is_active (Boolean, default=True)
├── last_login (DateTime, nullable)
├── created_at
└── updated_at
```

### Roles

| Role | Permissions |
|------|------------|
| ADMIN | Full access, user management, system config |
| MANAGER | Create/edit products, batches, view all alerts |
| STAFF | View inventory, record sales, view own alerts |

### API Endpoints

```
POST   /auth/register          # Register new user
POST   /auth/login             # Login, return JWT token
POST   /auth/logout            # Invalidate token
GET    /auth/me                # Get current user
POST   /auth/forgot-password   # Request password reset
POST   /auth/reset-password    # Reset password
POST   /auth/change-password   # Change password (authenticated)
POST   /auth/refresh           # Refresh JWT token
```

### JWT Configuration

```python
# .env
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

---

## Database Schema

### Entity Relationship Diagram

```
USER
 │
 └──── PRODUCT
         │
         ├──── BATCH
         │       │
         │       ├──── ALERT
         │       │       ├── recipient_phone
         │       │       ├── sms_status
         │       │       └── sms_sent_at
         │       │
         │       └──── INVENTORY_MOVEMENT
         │
         └──── SALE

IMPORT
 │
 └──── IMPORT_ERROR

INSIGHT
 ├── product_id
 ├── batch_id
 └── supporting_data

NOTIFICATION
 ├── batch_id
 ├── alert_id
 └── user_id
```

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'STAFF',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Products Table
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    category VARCHAR(100),
    brand VARCHAR(100),
    unit VARCHAR(50),
    selling_price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Batches Table
```sql
CREATE TABLE batches (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'SAFE',  -- SAFE, EXPIRING_SOON, CRITICAL, EXPIRED
    days_remaining INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(product_id, batch_number),
    INDEX(expiry_date),
    INDEX(status)
);
```

#### Alerts Table
```sql
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id),
    alert_type VARCHAR(50) NOT NULL,  -- CRITICAL, EXPIRING_SOON, EXPIRED
    severity VARCHAR(50) NOT NULL,    -- HIGH, MEDIUM, LOW
    message TEXT NOT NULL,
    recipient_phone VARCHAR(20),
    sms_status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, SENT, FAILED, SKIPPED
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    sms_error TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    
    INDEX(batch_id),
    INDEX(alert_type),
    INDEX(sms_status),
    INDEX(is_read),
    INDEX(created_at)
);
```

#### Sales Table
```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    batch_id INTEGER REFERENCES batches(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX(product_id),
    INDEX(batch_id),
    INDEX(sold_at)
);
```

#### Imports Table
```sql
CREATE TABLE imports (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255),
    file_size INTEGER,
    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    status VARCHAR(50),  -- PENDING, IN_PROGRESS, SUCCESS, FAILED
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

#### Import Errors Table
```sql
CREATE TABLE import_errors (
    id SERIAL PRIMARY KEY,
    import_id INTEGER NOT NULL REFERENCES imports(id),
    row_number INTEGER,
    error_message TEXT,
    problematic_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Insights Table
```sql
CREATE TABLE insights (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    batch_id INTEGER REFERENCES batches(id),
    insight_type VARCHAR(100),  -- EXPIRY_RISK, STOCK_RISK, SALES_TREND, etc.
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(50),  -- CRITICAL, WARNING, INFO
    recommendation TEXT,
    supporting_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);
```

#### Inventory Movements Table (optional, for audit)
```sql
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id),
    movement_type VARCHAR(50),  -- RECEIPT, SALE, ADJUSTMENT, RETURN
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Product & Batch Management

### Product Features

**Create Product**
```python
POST /products
{
    "name": "Paracetamol 500mg",
    "sku": "PARA-500",
    "barcode": "5901234123457",
    "category": "Analgesics",
    "brand": "Generic",
    "unit": "tablet",
    "selling_price": 0.50,
    "cost_price": 0.25,
    "description": "Pain reliever and fever reducer"
}
```

**Update Product**
```python
PATCH /products/{id}
{
    "selling_price": 0.60,
    "category": "Pain Relief"
}
```

**Search Products**
```python
GET /products?search=paracetamol&category=analgesics&is_active=true
```

**Archive Product (soft delete)**
```python
DELETE /products/{id}
# Sets is_active = False
```

### Batch Features

A batch represents a specific lot/shipment of a product with a single expiry date.

**Create Batch**
```python
POST /batches
{
    "product_id": 1,
    "batch_number": "BATCH_A1234",
    "manufacturing_date": "2024-01-15",
    "expiry_date": "2026-01-15",
    "quantity_received": 500,
    "recipient_phone": "+233505123456"
}
```

**Update Batch Quantity**
```python
PATCH /batches/{id}
{
    "quantity_remaining": 450
}
# Automatically calculates days_remaining and updates status
```

**View Batch**
```python
GET /batches/{id}
# Returns: batch info, product info, expiry status, active alert
```

**List Batches by Status**
```python
GET /batches?status=CRITICAL
GET /batches?status=EXPIRED
GET /batches?status=EXPIRING_SOON
GET /batches?status=SAFE
```

### Key Invariant

**Never put expiry_date directly on Product.**

Expiry is a **batch property**, not a product property.

```
Paracetamol 500mg
├── Batch A1234 → expires 2026-01-15
├── Batch B5678 → expires 2026-02-20
└── Batch C9012 → expires 2026-03-10
```

---

## Expiry Engine (Deterministic)

### Core Algorithm

This is the **deterministic heart** of ExpireGuard. No machine learning. No guessing.

```python
def calculate_expiry_status(batch: Batch) -> ExpiryStatus:
    """
    Pure deterministic calculation.
    No external dependencies.
    No randomness.
    Same input = Same output always.
    """
    today = date.today()
    expiry_date = batch.expiry_date
    
    days_remaining = (expiry_date - today).days
    batch.days_remaining = days_remaining
    
    if days_remaining <= 0:
        return ExpiryStatus.EXPIRED
    elif days_remaining <= 30:
        return ExpiryStatus.CRITICAL
    elif days_remaining <= 90:
        return ExpiryStatus.EXPIRING_SOON
    else:
        return ExpiryStatus.SAFE
```

### Thresholds

These thresholds define when alerts are triggered.

| Status | Days Remaining | Severity | Action |
|--------|---|---|---|
| EXPIRED | ≤ 0 | HIGH | Remove from inventory |
| CRITICAL | 1–30 | MEDIUM | Urgent action required |
| EXPIRING_SOON | 31–90 | LOW | Plan ahead |
| SAFE | >90 | — | Monitor |

### Configurable Thresholds (Future)

```python
# In config.py (hardcoded for MVP)
EXPIRY_THRESHOLD_CRITICAL_MIN = 1
EXPIRY_THRESHOLD_CRITICAL_MAX = 30
EXPIRY_THRESHOLD_EXPIRING_SOON_MIN = 31
EXPIRY_THRESHOLD_EXPIRING_SOON_MAX = 90

# In environment variables (for future flexibility)
EXPIRY_THRESHOLD_CRITICAL_MIN=1
EXPIRY_THRESHOLD_CRITICAL_MAX=30
```

### Update Strategy

**Manual Trigger** (MVP)
```python
POST /expiry/check
# Manually trigger expiry status update for all batches
```

**Automatic** (Future)
```python
# Run every hour via Celery/APScheduler
@scheduled_task(interval=3600)
def update_all_batch_statuses():
    for batch in db.query(Batch).all():
        update_batch_expiry_status(db, batch)
```

### API Endpoints

```python
GET /expiry                    # All batches with expiry info
GET /expiry/expired            # Batches with status=EXPIRED
GET /expiry/critical           # Batches with status=CRITICAL
GET /expiry/soon               # Batches with status=EXPIRING_SOON
GET /expiry/safe               # Batches with status=SAFE
POST /expiry/check             # Manually trigger update
```

---

## Alert System

### Alert Lifecycle

```
Batch Status Changes
        ↓
Check if alert should exist
        ↓
Check for existing alert
        ↓
If exists: Update message
If not exists: Create new alert
        ↓
Trigger SMS send
        ↓
Alert visible in dashboard
        ↓
User marks as read
        ↓
User resolves/closes alert
```

### Alert Types

```python
class AlertType(Enum):
    CRITICAL = "CRITICAL"              # 1–30 days
    EXPIRING_SOON = "EXPIRING_SOON"    # 31–90 days
    EXPIRED = "EXPIRED"                # ≤0 days
```

### Alert Severity

```python
class AlertSeverity(Enum):
    HIGH = "HIGH"          # EXPIRED
    MEDIUM = "MEDIUM"      # CRITICAL
    LOW = "LOW"            # EXPIRING_SOON
```

### Duplicate Prevention

**Rule:** Only one active alert per batch/alert_type

```python
# Check for existing alert
existing = db.query(Alert).filter(
    Alert.batch_id == batch.id,
    Alert.alert_type == alert_type,
    Alert.resolved_at == None  # Still active
).first()

if existing:
    # Update existing alert
    existing.message = new_message
    existing.updated_at = now()
else:
    # Create new alert
    alert = Alert(batch_id=batch.id, ...)
```

### Alert Features

Users can:
- [x] View all alerts
- [x] Filter by type (CRITICAL, EXPIRED, EXPIRING_SOON)
- [x] Mark as read
- [x] Resolve/close alert
- [x] View affected product & batch
- [x] See SMS delivery status
- [x] View recommended action

### API Endpoints

```python
GET    /alerts                         # All alerts
GET    /alerts/critical                # Critical alerts
GET    /alerts/expired                 # Expired alerts
GET    /alerts?type=EXPIRING_SOON      # Expiring soon
GET    /alerts/{id}                    # Single alert
PATCH  /alerts/{id}/read               # Mark as read
PATCH  /alerts/{id}/resolve            # Close alert
GET    /alerts/sms-status/summary      # SMS delivery stats
```

---

## SMS Notification System

### Architecture

```
Alert Service
    ↓
SMS Service (Abstracted)
    ↓
SMS Provider Interface
    ├── MOCK (Development)
    ├── Twilio (Production)
    └── Africa's Talking (Regional)
    ↓
SMS Sent / Failed
    ↓
Database Updated
```

### SMS Configuration

```bash
# .env
SMS_PROVIDER=MOCK              # MOCK | TWILIO | AFRICASTALKING

# Twilio
TWILIO_ACCOUNT_SID=ac_xxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Africa's Talking
AFRICASTALKING_API_KEY=xxxxx
AFRICASTALKING_USERNAME=xxxxx
```

### SMS Modes

**Development (MOCK)**
- Logs SMS to console
- No actual SMS sent
- Always returns success
- Perfect for testing

**Production (TWILIO or AFRICA'S TALKING)**
- Sends real SMS
- Tracks delivery status
- Records failures
- Can retry

### SMS Status Tracking

```python
class SMSStatus(Enum):
    PENDING = "PENDING"      # Not sent yet
    SENT = "SENT"            # Successfully sent
    FAILED = "FAILED"        # Attempted, failed
    SKIPPED = "SKIPPED"      # No phone number
```

### SMS Message Format

```
🔴 CRITICAL: Medication X expires in 15 days. 
Urgent action required. - ExpireGuard
```

### API Endpoints

```python
POST   /alerts/test-sms?phone_number=+233505123456
       # Test SMS before production use

POST   /alerts/retry-failed-sms?limit=10
       # Retry sending failed SMS

GET    /alerts/sms-status/summary
       # SMS delivery health check
```

### Error Handling

If SMS fails:
- Alert still exists in database
- SMS marked as FAILED
- Error message logged
- Can be retried later
- Doesn't crash expiry system

---

## CSV/Excel Import Pipeline

### Import Workflow

```
CSV/Excel File
    ↓
Upload to API
    ↓
Validate file type, size, columns
    ↓
Parse rows
    ↓
Validate data (types, ranges, required fields)
    ↓
Clean data (trim, standardize dates, etc.)
    ↓
Detect duplicates
    ↓
Transform to database records
    ↓
Begin transaction
    ↓
Insert products/batches/sales
    ↓
Recalculate expiry status
    ↓
Generate alerts
    ↓
Send SMS
    ↓
Commit transaction
    ↓
Return summary
```

### Expected CSV Columns

**Inventory Import**
```
product_name
sku
barcode
category
brand
unit
selling_price
cost_price
batch_number
manufacturing_date
expiry_date
quantity_received
```

**Sales Import**
```
product_name
sku
batch_number
quantity_sold
unit_price
total_amount
sale_date
```

### Validation Rules

**Required Fields**
- product_name
- sku
- expiry_date
- quantity

**Type Validation**
- Dates must be valid ISO format (YYYY-MM-DD)
- Prices must be positive numbers
- Quantities must be positive integers
- SKU must be string

**Business Rules**
- expiry_date cannot be in past (except for import with historical data flag)
- quantity > 0
- price >= 0
- batch_number unique per product

### Error Reporting

```python
{
    "import_id": 1,
    "status": "PARTIAL_FAILURE",
    "total_records": 100,
    "successful": 95,
    "failed": 5,
    "errors": [
        {
            "row_number": 12,
            "error": "Invalid date format",
            "problematic_data": "2025-13-45"
        },
        {
            "row_number": 25,
            "error": "Duplicate SKU",
            "problematic_data": "SKU-001"
        }
    ]
}
```

### API Endpoints

```python
POST   /imports/csv                  # Upload CSV
POST   /imports/excel                # Upload Excel
GET    /imports                      # Import history
GET    /imports/{id}                 # Import details
GET    /imports/{id}/errors          # Error details
```

---

## Inventory Management

### Current Inventory

```python
GET /inventory
# Returns current stock levels, values, and status
{
    "total_products": 1248,
    "total_stock_units": 8500,
    "total_stock_value": 12400.50,
    "expired_products": 5,
    "critical_products": 12,
    "expiring_soon_products": 32,
    "safe_products": 1199
}
```

### Stock Adjustments

```python
POST /inventory/adjust
{
    "batch_id": 15,
    "quantity_change": -50,
    "reason": "Damage during transport"
}
```

### Stock Movements

```python
POST /inventory/movements
{
    "batch_id": 15,
    "movement_type": "SALE",  # RECEIPT, SALE, ADJUSTMENT, RETURN
    "quantity": 25,
    "reason": "Sale #1234"
}
```

### Audit Trail

All inventory movements are immutable and logged:
```python
GET /inventory/movements?batch_id=15
# Shows complete history of all movements for batch
```

### Low Stock Detection

```python
GET /inventory/low-stock
# Products with quantity < reorder_point
```

### Overstock Detection

```python
GET /inventory/overstock
# Products with quantity > max_stock
```

---

## Sales Management

### Record Sale

```python
POST /sales
{
    "product_id": 1,
    "batch_id": 15,
    "quantity": 25,
    "unit_price": 0.50,
    "total_amount": 12.50,
    "sold_at": "2025-09-28T14:30:00"
}

# Automatically:
# - Updates batch.quantity_remaining
# - Records inventory movement
# - Calculates revenue
# - Triggers alert recalculation
```

### Sales History

```python
GET /sales
GET /sales?product_id=1
GET /sales?batch_id=15
GET /sales?date_from=2025-09-01&date_to=2025-09-30
```

### Sales Analytics

```python
GET /sales/summary
{
    "total_sales": 12450,
    "total_revenue": 62250.00,
    "total_cost": 31125.00,
    "gross_profit": 31125.00,
    "gross_margin": 50.0,
    "units_sold": 12450,
    "avg_sale_value": 5.00
}
```

### Sales Trends

```python
GET /sales/trends?period=monthly
{
    "September": {
        "revenue": 12450.00,
        "units": 12450,
        "growth": 8.5  # % compared to August
    }
}
```

---

## Analytics Engine

### Philosophy

**Analytics = Verified Facts**

The analytics engine does **not guess**. It calculates.

```
Database
    ↓
Query (deterministic)
    ↓
Calculate (verified)
    ↓
Metric (fact)
```

### Metrics Calculated

**Inventory Metrics**
```python
total_products              # Count
total_stock_units          # Sum of remaining_quantity
total_stock_value          # Sum of remaining_quantity × cost_price
expired_products           # Count where status=EXPIRED
critical_products          # Count where status=CRITICAL
expiring_soon_products     # Count where status=EXPIRING_SOON
safe_products              # Count where status=SAFE
```

**Sales Metrics**
```python
total_sales                # Count of sales records
total_revenue              # Sum of total_amount
total_cost                 # Sum of (quantity × cost_price)
gross_profit               # total_revenue - total_cost
gross_margin               # (gross_profit / total_revenue) × 100
units_sold                 # Sum of quantity
avg_sale_value             # total_revenue / total_sales
```

**Product Performance**
```python
fastest_selling_products   # By units/week
slowest_selling_products   # By units/week
highest_revenue_products   # By total_revenue
declining_products         # Compare periods
rising_products            # Compare periods
```

**Expiry Risk**
```python
high_stock_low_sales       # Inventory > threshold + Sales < threshold
repeated_expiry_products   # Count of expired batches
wastage_risk_value         # Stock value at risk
```

### API Endpoints

```python
GET /analytics/overview            # All metrics
GET /analytics/inventory           # Inventory metrics
GET /analytics/sales               # Sales metrics
GET /analytics/products            # Product performance
GET /analytics/trends?period=monthly
GET /analytics/anomalies
```

---

## AI Intelligence Layer

### Philosophy

**AI does not replace analytics. AI interprets analytics.**

```
Database
    ↓
Analytics Engine (verified metrics)
    ↓
Pattern Detection (deterministic analysis)
    ↓
Data Packaging (structured context)
    ↓
AI Prompt (with guardrails)
    ↓
AI Response
    ↓
Insight (stored, verified)
    ↓
Recommendation (evidence-based)
```

### What AI Receives

The AI should receive **structured business context**, not raw data.

```python
insight_context = {
    "product": {
        "name": "Ibuprofen 400mg",
        "sku": "IBU-400",
        "category": "Pain Relief",
        "selling_price": 1.50,
        "cost_price": 0.75
    },
    "inventory": {
        "total_stock": 720,
        "batches": [
            {
                "batch_number": "BATCH_001",
                "expiry_date": "2025-10-14",
                "days_remaining": 18,
                "status": "CRITICAL",
                "quantity": 720
            }
        ]
    },
    "sales": {
        "weekly_average": 12,
        "last_4_weeks": [15, 14, 10, 12],
        "trend": "declining",
        "percent_change": -8.5
    },
    "risk_analysis": {
        "expiry_risk": "HIGH",
        "reason": "High stock + Low sales + Approaching expiry",
        "days_to_expiry": 18,
        "units_at_risk": 720,
        "value_at_risk": 540.00
    },
    "patterns": {
        "similar_products_expired_before": true,
        "historical_wastage_rate": 12.5,
        "similar_pattern_count": 3
    }
}
```

### AI Prompt Engineering

```python
# system_prompt.py

SYSTEM_PROMPT = """
You are ExpireGuard's business intelligence assistant.
Your role is to interpret inventory and sales data to provide actionable insights.

CRITICAL RULES:
1. Never invent numbers. Only cite numbers from the provided data.
2. Use cautious language: "may", "could", "potentially", not "will" or "definitely".
3. Every insight must be traceable to evidence.
4. Explain WHAT happened, WHY it matters, WHAT the business might consider.
5. Recommend, don't dictate. Provide options, not mandates.

INSIGHT STRUCTURE:
- TITLE: One-line summary
- SEVERITY: CRITICAL, WARNING, INFO
- EVIDENCE: Specific data points
- ANALYSIS: Why this matters
- RECOMMENDATION: Actionable suggestions with alternatives
"""
```

### Insight Categories

```python
class InsightType(Enum):
    EXPIRY_RISK = "High stock + Low sales + Approaching expiry"
    SALES_TREND = "Increasing/declining sales pattern"
    INVENTORY_PATTERN = "Unusual stock levels"
    WASTE_RISK = "Products at risk of expiry loss"
    REVENUE_TREND = "Profit margin or revenue changes"
    DEMAND_PATTERN = "Supply-demand imbalance"
    ANOMALY = "Unusual data pattern"
    RECOMMENDATION = "Actionable business suggestion"
```

### Example Insight Generation

**Input Data**
```python
{
    "product": "Paracetamol 500mg",
    "stock": 850,
    "expiry_days": 42,
    "weekly_sales": 20,
    "sales_trend": "declining for 4 weeks",
    "sale_rate": 20 units/week
}
```

**Calculation**
```python
current_rate_sellout = stock / (weekly_sales / 7)  # 850 / 20 = 42.5 days
days_to_expiry = 42

if current_rate_sellout > days_to_expiry:
    risk = "HIGH"  # Will expire before selling out
else:
    risk = "MEDIUM"
```

**AI Prompt**
```
Product: Paracetamol 500mg
Stock: 850 units
Expiry: 42 days
Weekly Sales: 20 units (declining 8% over 4 weeks)
Sell-out Rate: 42.5 days at current sales rate

Risk: HIGH (will expire before selling at current rate)

Provide a brief insight and recommendation.
```

**AI Response**
```
INSIGHT: Expiry Risk - Paracetamol Stockpile

Paracetamol sales have declined steadily over the past month while 
850 units remain in stock. At the current sales rate of 20 units/week, 
this batch will expire in 42 days with approximately 210 units unsold.

RECOMMENDATION:
Consider: (1) Promotional pricing, (2) Bulk sales to other retailers,
(3) Donation programs, or (4) Supply chain review to prevent future 
overstock.
```

### API Endpoints

```python
GET    /insights                         # All insights
GET    /insights/{id}                    # Single insight
POST   /insights/generate                # Generate insights for products
GET    /insights/recommendations         # All recommendations
POST   /insights/ask?question=...        # Natural language Q&A
GET    /insights/severity/critical       # Critical insights only
```

### Follow-Up Questions

Users should eventually be able to ask:

```python
POST /insights/ask
{
    "question": "Why do we have so many expired products?"
}

# Backend response:
# 1. Get analytics on expiry history
# 2. Get AI interpretation
# 3. Return answer with supporting data
```

---

## API Reference

### Authentication

All endpoints (except `/auth/register`, `/auth/login`) require JWT token in header:

```
Authorization: Bearer <token>
```

### Response Format

**Success**
```python
{
    "success": true,
    "data": {...},
    "message": "Operation successful"
}
```

**Error**
```python
{
    "success": false,
    "error": "Error message",
    "details": "Additional details if available"
}
```

### Complete Endpoint List

#### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me
POST   /auth/forgot-password
POST   /auth/reset-password
```

#### Products
```
GET    /products
POST   /products
GET    /products/{id}
PATCH  /products/{id}
DELETE /products/{id}
GET    /products/search?q=...
```

#### Batches
```
GET    /batches
POST   /batches
GET    /batches/{id}
PATCH  /batches/{id}
DELETE /batches/{id}
GET    /batches?status=CRITICAL
GET    /batches?status=EXPIRED
```

#### Inventory
```
GET    /inventory
GET    /inventory/summary
POST   /inventory/adjust
GET    /inventory/movements
GET    /inventory/low-stock
GET    /inventory/overstock
```

#### Sales
```
GET    /sales
POST   /sales
GET    /sales/{id}
GET    /sales/summary
GET    /sales/trends
```

#### Expiry
```
GET    /expiry
GET    /expiry/expired
GET    /expiry/critical
GET    /expiry/soon
POST   /expiry/check
```

#### Alerts
```
GET    /alerts
GET    /alerts/critical
GET    /alerts/expired
GET    /alerts/{id}
PATCH  /alerts/{id}/read
PATCH  /alerts/{id}/resolve
```

#### SMS & Notifications
```
POST   /alerts/test-sms?phone_number=...
POST   /alerts/retry-failed-sms
GET    /alerts/sms-status/summary
```

#### CSV/Excel Import
```
POST   /imports/csv
POST   /imports/excel
GET    /imports
GET    /imports/{id}
GET    /imports/{id}/errors
```

#### Analytics
```
GET    /analytics/overview
GET    /analytics/inventory
GET    /analytics/sales
GET    /analytics/products
GET    /analytics/trends
GET    /analytics/anomalies
```

#### Insights & AI
```
GET    /insights
GET    /insights/{id}
POST   /insights/generate
GET    /insights/recommendations
POST   /insights/ask
GET    /insights/severity/critical
```

#### Dashboard
```
GET    /dashboard/summary
GET    /dashboard/alerts
GET    /dashboard/sales
GET    /dashboard/inventory
GET    /dashboard/insights
```

---

## Security

### Authentication & Authorization

- [x] bcrypt password hashing (not md5 or sha1)
- [x] JWT tokens with expiration
- [x] Refresh token rotation
- [x] HTTPS/TLS in production
- [x] CORS properly configured
- [x] Rate limiting on login

### Data Security

- [x] Environment variables for secrets
- [x] No secrets in GitHub
- [x] SQL injection prevention (ORM/parameterized queries)
- [x] Input validation on all endpoints
- [x] File upload validation (type, size, virus scan)

### API Security

- [x] API rate limiting
- [x] CORS whitelist
- [x] Request size limits
- [x] Timeout configurations
- [x] Secure error messages (no stack traces)

### Database Security

- [x] Database user with minimum permissions
- [x] Encrypted connections
- [x] Regular backups
- [x] Audit logging on sensitive operations

### SMS Security

- [x] API credentials in environment variables
- [x] Mock mode for development (no real SMS)
- [x] Phone number validation
- [x] Rate limiting on SMS sends

### Audit Trail

- [x] Log all user actions
- [x] Log all data modifications
- [x] Log failed authentication attempts
- [x] Log SMS sends and failures
- [x] Retention policy for audit logs

---

## Project Structure

```
backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app initialization
│   │
│   ├── core/
│   │   ├── config.py                    # Settings, env variables
│   │   ├── database.py                  # SQLAlchemy setup
│   │   ├── security.py                  # JWT, bcrypt
│   │   └── logging.py                   # Logging config
│   │
│   ├── models/                          # SQLAlchemy ORM models
│   │   ├── base.py                      # Base model with common fields
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── batch.py
│   │   ├── alert.py
│   │   ├── sale.py
│   │   ├── import.py
│   │   ├── insight.py
│   │   ├── inventory_movement.py
│   │   └── __init__.py
│   │
│   ├── schemas/                         # Pydantic validation schemas
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── batch.py
│   │   ├── alert.py
│   │   ├── sale.py
│   │   ├── import.py
│   │   ├── insight.py
│   │   ├── dashboard.py
│   │   └── __init__.py
│   │
│   ├── routes/                          # API route handlers
│   │   ├── auth.py
│   │   ├── products.py
│   │   ├── batches.py
│   │   ├── inventory.py
│   │   ├── sales.py
│   │   ├── expiry.py
│   │   ├── alerts.py
│   │   ├── sms.py
│   │   ├── imports.py
│   │   ├── analytics.py
│   │   ├── insights.py
│   │   ├── dashboard.py
│   │   └── __init__.py
│   │
│   ├── services/                        # Business logic
│   │   ├── auth_service.py
│   │   ├── product_service.py
│   │   ├── batch_service.py
│   │   ├── expiry_service.py            # ⭐ Deterministic
│   │   ├── alert_service.py             # ⭐ Core feature
│   │   ├── sms_service.py               # ⭐ Core feature
│   │   ├── csv_service.py
│   │   ├── inventory_service.py
│   │   ├── sales_service.py
│   │   ├── analytics_service.py         # ⭐ Verified metrics
│   │   ├── insight_service.py           # ⭐ AI integration
│   │   └── recommendation_service.py
│   │
│   ├── ai/                              # AI integration
│   │   ├── client.py                    # Anthropic API client
│   │   ├── prompts.py                   # System prompts
│   │   ├── context_builder.py           # Build context for AI
│   │   └── guardrails.py                # AI safety checks
│   │
│   ├── utils/                           # Utilities
│   │   ├── validators.py                # Data validation
│   │   ├── helpers.py                   # Helper functions
│   │   └── exceptions.py                # Custom exceptions
│   │
│   └── tests/                           # Unit & integration tests
│       ├── test_auth.py
│       ├── test_products.py
│       ├── test_batches.py
│       ├── test_expiry.py
│       ├── test_alerts.py
│       ├── test_sms.py
│       ├── test_imports.py
│       ├── test_sales.py
│       ├── test_analytics.py
│       ├── test_insights.py
│       └── conftest.py                  # Pytest fixtures
│
├── alembic/                             # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   ├── alembic.ini
│   └── versions/
│       ├── 001_initial.py
│       └── ...
│
├── requirements.txt                     # Python dependencies
├── .env.example                         # Environment template
├── .gitignore                           # Git ignore rules
├── docker-compose.yml                   # Local development
├── Dockerfile                           # Production image
├── README.md                            # Documentation
└── BACKEND_SPECIFICATION.md             # This file
```

---

## Implementation Roadmap

### Phase 1: MVP Foundation (Week 1)
- [x] Database schema
- [x] Authentication (register, login, JWT)
- [x] Product CRUD
- [x] Batch CRUD
- [x] Expiry engine (deterministic)
- [x] Alert system (CRUD)
- [x] SMS integration (MOCK mode)

### Phase 2: Core Features (Week 2)
- [x] CSV import pipeline
- [x] Data validation & cleaning
- [x] Sales recording
- [x] Inventory tracking
- [x] Dashboard API endpoints
- [ ] Analytics engine

### Phase 3: Intelligence (Week 3)
- [ ] Insight generation
- [ ] AI integration
- [ ] Pattern detection
- [ ] Recommendations
- [ ] Follow-up Q&A

### Phase 4: Production (Week 4)
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Testing & QA
- [ ] Deployment
- [ ] Monitoring

### Future Enhancements
- [ ] Multi-tenant support
- [ ] Scheduled tasks (Celery)
- [ ] Redis caching
- [ ] Advanced analytics
- [ ] API webhooks
- [ ] Mobile app backend
- [ ] Advanced reporting

---

## Testing Strategy

### Unit Tests
- Expiry calculation logic
- Alert deduplication logic
- SMS provider abstraction
- Data validation rules
- Inventory calculations

### Integration Tests
- CSV import workflow
- Alert generation → SMS sending
- Sales recording → Inventory update
- Analytics calculations

### API Tests
- Endpoint responses
- Error handling
- Authentication/authorization
- Rate limiting

### Performance Tests
- CSV import (1000+ rows)
- Analytics calculations (large datasets)
- API response times

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database created and migrated
- [ ] SSL/TLS certificates
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Health check endpoints
- [ ] Documentation complete

---

## Summary

**ExpireGuard Backend is designed as:**

1. **Deterministic Core** - Expiry calculations never depend on AI
2. **Verified Analytics** - Metrics are calculated, not guessed
3. **AI Intelligence** - Interprets verified data, not replacing it
4. **Production Ready** - Security, testing, monitoring built-in
5. **Scalable Architecture** - Foundation for multi-tenant, microservices future

The backend supports the complete loop:

```
Business Data → Validation → Database → Expiry Engine → Alerts → SMS → Analytics → AI Insights → Recommendations → Dashboard
```

This specification provides the complete technical blueprint for building ExpireGuard's backend. Follow this specification, and you'll have a solid, production-ready inventory management system.

**Status: Ready for Implementation** ✅
