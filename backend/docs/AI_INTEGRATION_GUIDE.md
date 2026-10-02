# ExpireGuard AI Intelligence Layer — Complete Implementation Guide

**Document Purpose:** Complete guide to implementing ExpireGuard's AI-powered insights, recommendations, and intelligent analysis.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AI Philosophy](#ai-philosophy)
3. [Core Components](#core-components)
4. [Data Pipeline](#data-pipeline)
5. [Insight Generation](#insight-generation)
6. [Guardrails & Safety](#guardrails--safety)
7. [API Endpoints](#api-endpoints)
8. [Configuration](#configuration)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Complete AI Pipeline

```
BUSINESS DATA
    ↓
ANALYTICS ENGINE (verified metrics)
    ├─ Inventory calculations
    ├─ Sales metrics
    ├─ Product performance
    ├─ Anomaly detection
    └─ Wastage risk
    ↓
CONTEXT BUILDER (structured packaging)
    ├─ Product context
    ├─ Business context
    ├─ Anomaly context
    └─ Question context
    ↓
PROMPT ENGINEERING (guardrails)
    ├─ System prompts
    ├─ Specific instructions
    ├─ Validation rules
    └─ Safety checks
    ↓
CLAUDE AI (interpretation)
    ├─ Parse data
    ├─ Detect patterns
    ├─ Generate insights
    └─ Provide recommendations
    ↓
RESPONSE VALIDATION (guardrails)
    ├─ Check accuracy
    ├─ Verify evidence
    ├─ Ensure cautious language
    └─ Validate actionability
    ↓
INSIGHT STORAGE (persistent)
    ├─ Save to database
    ├─ Link to products
    ├─ Track confidence
    └─ Enable historical analysis
    ↓
API ENDPOINTS
    ├─ GET /insights
    ├─ POST /insights/generate/product/{id}
    ├─ POST /insights/ask
    └─ GET /insights/recommendations
    ↓
DASHBOARD
    ├─ Display insights
    ├─ Show recommendations
    ├─ Enable questions
    └─ Track impact
```

---

## AI Philosophy

### Core Principles

**1. AI Never Replaces Deterministic Systems**
- Expiry calculations = deterministic (no AI)
- Alert generation = deterministic (no AI)
- Inventory tracking = deterministic (no AI)

AI **interprets** these, doesn't replace them.

**2. Verified Data Only**
```
Raw Data → Analytics Engine → Verified Metrics → AI Interpretation
```

AI receives numbers from verified calculations, not raw unprocessed data.

**3. Evidence-Based Reasoning**
```
DATA: "850 units, 15 days to expiry, 20 units/week sales"
↓
AI: "At current sales rate, may expire with ~600 units unsold"
NOT: "This will definitely fail"
```

**4. Recommendation, Not Direction**
```
GOOD: "The business might consider..."
BAD: "You must..."
```

AI offers options, not ultimatums.

**5. Explainable Always**
```
INSIGHT: "High expiry risk"
EVIDENCE: "850 units, 15 days, 20/week sales"
ANALYSIS: "Current rate insufficient to sell before expiry"
OPTIONS: "Discount, bulk sale, donation"
```

Every insight traces back to data.

---

## Core Components

### 1. Analytics Service

**Purpose:** Calculate verified metrics

**File:** `analytics_service.py`

**Metrics Calculated:**
```python
InventoryMetrics
├─ total_products
├─ total_stock_units
├─ total_stock_value
├─ expired_products
├─ critical_products
├─ expiring_soon_products
└─ safe_products

SalesMetrics
├─ total_sales
├─ total_revenue
├─ total_cost
├─ gross_profit
├─ gross_margin
├─ units_sold
└─ avg_sale_value

ProductPerformance
├─ product_id
├─ total_stock
├─ weekly_sales
├─ monthly_sales
├─ sales_trend (increasing/declining/stable)
├─ revenue, cost, margin
└─ batches_count
```

**Functions:**
```python
get_inventory_metrics(db)          # → InventoryMetrics
get_sales_metrics(db, days_back)   # → SalesMetrics
get_product_performance(db, id)    # → ProductPerformance
get_sales_trends(db, period)       # → dict of trends
detect_anomalies(db)               # → list of anomalies
calculate_wastage_risk(db)         # → dict of risk metrics
get_dashboard_summary(db)          # → complete summary
```

### 2. Context Builder

**Purpose:** Package analytics into structured context for AI

**File:** `context_builder.py`

**Context Types:**
```python
# Product-specific context
build_product_insight_context(db, product_id)
# Returns: {product, inventory, sales, expiry_risk, alerts}

# Business-wide context
build_business_context(db)
# Returns: {business}

# Anomaly-specific context
build_anomaly_context(db, anomaly)
# Returns: {anomaly, details}

# Question-based context
build_question_context(db, question)
# Returns: intelligently selected context
```

**Smart Packaging:**
```python
# Don't send:
- Sensitive internal IDs
- Raw database dumps
- Unverified data

# Do send:
- Calculated metrics with numbers
- Structured relationships
- Evidence for each claim
- Clear context for AI
```

### 3. Prompts & Guardrails

**Purpose:** Guide AI to generate good insights

**File:** `prompts.py`

**System Prompts:**
```python
INSIGHT_SYSTEM_PROMPT              # General insight generation
EXPIRY_RISK_PROMPT                 # Expiry-specific analysis
SALES_TREND_PROMPT                 # Sales pattern analysis
ANOMALY_PROMPT                     # Anomaly interpretation
RECOMMENDATION_PROMPT              # Actionable suggestions
FOLLOWUP_PROMPT                    # Answer user questions
PATTERN_DETECTION_PROMPT           # Find patterns
```

**Guardrail Checks:**
```python
GUARDRAIL_CHECKS = {
    "number_accuracy":      "Does every number appear in source data?",
    "language_caution":     "Uses 'may', 'could' not 'will'?",
    "recommendation_style": "Options not orders?",
    "severity_appropriate": "Severity justified by evidence?",
    "evidence_present":     "Cites specific data?",
    "speculation_free":     "Avoids speculation?",
    "business_relevant":    "Matters for decisions?",
    "actionable":           "Business can act on it?",
}
```

### 4. Insight Service

**Purpose:** Orchestrate insight generation with Claude

**File:** `insight_service.py`

**Main Class:** `InsightGenerator`

**Methods:**
```python
generate_insight(db, context, insight_type, validate=True)
    # → {"title", "description", "severity", "recommendation", "confidence"}

_parse_insight_response(response_text)
    # Extract structured insight from Claude's response

_validate_insight(insight, context)
    # Check guardrails

generate_question_response(db, question, context=None)
    # → Answer text

save_insight(db, title, description, type, severity, recommendation, ...)
    # → Insight (stored)

generate_product_insights(db, product_id)
    # → list[Insight]

generate_business_insights(db)
    # → list[Insight]
```

### 5. Insight Model & Routes

**Purpose:** Store and expose insights via API

**Files:** `insight_model.py`, `insight_routes.py`

**Stored Fields:**
```python
Insight
├─ id, product_id, batch_id
├─ insight_type (EXPIRY_RISK, SALES_TREND, etc.)
├─ title, description
├─ severity (CRITICAL, WARNING, INFO)
├─ recommendation
├─ supporting_data (JSON context)
├─ ai_confidence (HIGH, MEDIUM, LOW)
├─ validated (PENDING, VALID, INVALID)
├─ created_at, expires_at
└─ status (ACTIVE, ARCHIVED, SUPERSEDED)
```

**Endpoints:**
```
GET    /insights
GET    /insights/{id}
GET    /insights/product/{product_id}
POST   /insights/generate/product/{product_id}
POST   /insights/generate/business
POST   /insights/ask?question=...
GET    /insights/recommendations
GET    /insights/by-type/{type}
GET    /insights/by-severity/{severity}
POST   /insights/cleanup
GET    /insights/stats
```

---

## Data Pipeline

### Step 1: Calculate Analytics

```python
# app/services/analytics_service.py

inventory = get_inventory_metrics(db)
sales = get_sales_metrics(db, days_back=30)
performance = get_product_performance(db, product_id)
anomalies = detect_anomalies(db)
wastage = calculate_wastage_risk(db)

# Result: VERIFIED NUMBERS
# "850 units, 15 days, 20 sales/week"
# NOT: "Maybe this product will fail"
```

### Step 2: Build Context

```python
# app/services/context_builder.py

context = ContextBuilder(db).product_context(product_id)
# Result:
# {
#   "product": {"name": "Ibuprofen", "sku": "IBU-400", ...},
#   "inventory": {"total_stock": 850, "batches": [...]},
#   "sales": {"weekly_average": 20, "trend": "declining", ...},
#   "expiry_risk": {"batches_at_risk": [...], "total_value_at_risk": 425}
# }
```

### Step 3: Build Prompt

```python
# app/prompts.py

system_prompt = get_system_prompt("expiry_risk")
message = build_insight_message(context_str, "expiry_risk")

# Result: Clear instructions for Claude
# - "Analyze expiry risk"
# - "Use TITLE, SEVERITY, EVIDENCE, ANALYSIS, RECOMMENDATIONS structure"
# - "Never invent numbers"
# - "Use cautious language"
```

### Step 4: Call Claude

```python
# app/services/insight_service.py

generator = InsightGenerator()
insight = generator.generate_insight(db, context, "expiry_risk", validate=True)

# Result: {"title": "...", "description": "...", "severity": "MEDIUM", ...}
```

### Step 5: Validate Response

```python
# Inside generate_insight()

validated = generator._validate_insight(insight, context)

# Checks:
# ✓ Numbers are in context
# ✓ Language is cautious
# ✓ Evidence-based
# ✓ Actionable
```

### Step 6: Store Insight

```python
# app/services/insight_service.py

insight_model = save_insight(
    db,
    title=insight["title"],
    description=insight["description"],
    insight_type="EXPIRY_RISK",
    severity=insight["severity"],
    recommendation=insight.get("recommendation"),
    product_id=product_id,
    supporting_data=context
)

# Result: Persistent in database, queryable via API
```

---

## Insight Generation

### Product Insights

**Endpoint:**
```
POST /insights/generate/product/{product_id}
```

**What it generates:**
1. **Expiry Risk Assessment** — Will this expire unsold?
2. **Sales Trend Analysis** — Is demand increasing or declining?
3. **Inventory Pattern** — Is stock accumulating?
4. **Waste Risk** — How much value is at risk?

**Example Output:**
```json
{
  "product_id": 1,
  "product_name": "Ibuprofen 400mg",
  "insights": [
    {
      "id": 1,
      "title": "High Expiry Risk - Ibuprofen Stockpile",
      "severity": "CRITICAL",
      "description": "850 units remain in stock with 15 days until expiry. At the current sales rate of 20 units/week (approximately 43 units over the remaining period), this batch will expire with approximately 807 units unsold.",
      "recommendation": "Consider: (1) Promotional pricing, (2) Bulk sales to other retailers, (3) Donation programs, or (4) Supply chain review to prevent future overstock.",
      "ai_confidence": "HIGH"
    }
  ]
}
```

### Business Insights

**Endpoint:**
```
POST /insights/generate/business
```

**What it generates:**
1. **Overall Business Health** — How's the business doing?
2. **Anomaly Explanations** — What's unusual?
3. **Risk Summary** — What needs attention?

**Example Output:**
```json
{
  "generated": 5,
  "insights": [
    {
      "title": "Business Overview - Current Status",
      "severity": "WARNING",
      "insight_type": "BUSINESS_HEALTH",
      "description": "Total inventory value is $12,400 across 1,248 products. Currently, 32 products are expiring soon (31-90 days), 12 products are at critical expiry (1-30 days), and 5 products have already expired. Sales revenue over the past month is $62,250 with a 50% gross margin."
    }
  ]
}
```

### Question-Based Insights

**Endpoint:**
```
POST /insights/ask?question=Why%20do%20we%20have%20so%20many%20expired%20products?
```

**What Claude does:**
1. Interprets the question
2. Gathers relevant context
3. Analyzes data
4. Provides evidence-based answer

**Example:**
```
Question: "Why do we have so many expired products?"

Answer: "Based on the data, you have 12 expired batches with 450 units valued at $225. Looking at the patterns:

7 batches (58%) had initial stock >200 units but weekly sales <10 units.
Average time to sell out: 40 weeks
Average expiry period: 45 days
This suggests a significant gap between ordering quantities and actual demand.

Primary drivers:
- Overordering relative to actual sales (supply/demand mismatch)
- Potential forecasting issues
- Possible one-time bulk orders that didn't move

To provide more targeted recommendations, we'd need:
- Historical ordering patterns
- Demand forecasts vs actual sales
- Supplier lead times
- Any external factors affecting sales"
```

---

## Guardrails & Safety

### System Guardrails

**1. Data Accuracy**
```python
# NEVER: "Sales will increase 40%"
# ONLY: "Sales increased 18.4% over the measured period"

# Verify: Every number Claude cites appears in context
```

**2. Cautious Language**
```python
# GOOD: "may", "could", "potentially", "might"
# BAD: "will", "definitely", "certainly", "must"
```

**3. Evidence Requirement**
```python
# Every claim must link to data
# GOOD: "850 units, 15 days, 20 units/week sales → may expire unsold"
# BAD: "This product will fail"
```

**4. Actionability**
```python
# Recommendations must be something business can actually do
# GOOD: "Consider promotional pricing"
# BAD: "Increase market share"
```

### Response Validation

**Automatic checks after Claude responds:**

```python
def _validate_insight(self, insight: dict, context: dict) -> bool:
    # Check 1: Avoid over-confident language
    dangerous_words = ["will", "definitely", "certainly", "always", "never"]
    for word in dangerous_words:
        if word in text.lower():
            logger.warning(f"Insight uses dangerous word: {word}")
    
    # Check 2: Minimum substance
    if len(text.strip()) < 50:
        return False
    
    # Check 3: Valid severity
    if insight.get("severity") not in ["CRITICAL", "WARNING", "INFO"]:
        return False
    
    return True
```

### Prompt Engineering Guardrails

**In System Prompt:**

```
CRITICAL RULES (FOLLOW EXACTLY):
1. NEVER invent numbers. Only cite numbers directly from the provided data.
2. Use cautious language: "may", "could", "potentially", not "will" or "definitely".
3. Every insight MUST be traceable to specific evidence.
4. Always explain WHAT happened, WHY it matters, and WHAT the business should consider.
5. Make recommendations, don't dictate.
```

### Context Validation

**Before sending to Claude:**

```python
def validate_context(context: dict) -> bool:
    # Required fields present?
    if "product" in context:
        required = ["name", "sku", "inventory", "sales"]
    else:
        required = ["business"]
    
    for field in required:
        if field not in context:
            return False
    
    return True

def sanitize_context(context: dict) -> dict:
    # Remove sensitive internal IDs
    # Remove unverified data
    # Keep business-relevant metrics
    return context
```

---

## API Endpoints

### 1. Get All Insights

```
GET /insights
Query parameters:
  - product_id: Filter by product
  - insight_type: Filter by type (EXPIRY_RISK, SALES_TREND, etc.)
  - severity: Filter by severity (CRITICAL, WARNING, INFO)
  - limit: Max results (default 10, max 100)

Response:
[
  {
    "id": 1,
    "title": "High Expiry Risk",
    "severity": "CRITICAL",
    "description": "...",
    "insight_type": "EXPIRY_RISK",
    "created_at": "2025-09-28T14:30:00"
  }
]
```

### 2. Generate Product Insights

```
POST /insights/generate/product/{product_id}

Response:
{
  "product_id": 1,
  "product_name": "Ibuprofen 400mg",
  "generated": 3,
  "insights": [...]
}
```

### 3. Generate Business Insights

```
POST /insights/generate/business

Response:
{
  "generated": 5,
  "insights": [...]
}
```

### 4. Ask Question

```
POST /insights/ask?question=Why%20do%20we%20have%20so%20many%20expired%20products?

Response:
{
  "question": "Why do we have so many expired products?",
  "answer": "Based on the data, you have 12 expired batches..."
}
```

### 5. Get Recommendations

```
GET /insights/recommendations?limit=5

Response:
{
  "count": 5,
  "recommendations": [
    {
      "id": 1,
      "title": "High Expiry Risk",
      "recommendation": "Consider promotional pricing...",
      "severity": "CRITICAL"
    }
  ]
}
```

### 6. Filter by Type

```
GET /insights/by-type/EXPIRY_RISK?limit=10

Response:
{
  "type": "EXPIRY_RISK",
  "count": 10,
  "insights": [...]
}
```

### 7. Filter by Severity

```
GET /insights/by-severity/CRITICAL?limit=5

Response:
{
  "severity": "CRITICAL",
  "count": 5,
  "insights": [...]
}
```

### 8. Get Statistics

```
GET /insights/stats

Response:
{
  "total_insights": 42,
  "by_severity": {
    "critical": 5,
    "warning": 12,
    "info": 25
  },
  "by_type": {
    "EXPIRY_RISK": 18,
    "SALES_TREND": 12,
    "ANOMALY": 8,
    "BUSINESS_HEALTH": 4
  }
}
```

---

## Configuration

### Environment Variables

```bash
# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# AI Model selection (optional)
AI_MODEL=claude-sonnet-4-6
AI_MAX_TOKENS=1000

# Insight retention (optional)
INSIGHT_RETENTION_DAYS=90
```

### Python Dependencies

```bash
pip install anthropic
```

### Database Setup

```bash
# Add Insight model to alembic migration
alembic revision --autogenerate -m "Add insights table"

# Apply migration
alembic upgrade head
```

---

## Examples

### Example 1: Complete Product Insight Workflow

```python
from sqlalchemy.orm import Session
from app.services.insight_service import generate_product_insights

# Generate insights for product ID 1
insights = generate_product_insights(db, product_id=1)

# Returns 3 insights:
# 1. Expiry Risk: "High stock + Low sales + Approaching expiry"
# 2. Sales Trend: "Sales declining 8% per week"
# 3. Inventory Pattern: "Stock accumulating without sales"

for insight in insights:
    print(f"Title: {insight.title}")
    print(f"Severity: {insight.severity}")
    print(f"Recommendation: {insight.recommendation}")
```

### Example 2: Answer a Question

```python
from app.services.insight_service import InsightGenerator
from app.services.context_builder import ContextBuilder

generator = InsightGenerator()
builder = ContextBuilder(db)

# User asks: "Which products should we focus on?"
question = "Which products should we focus on?"

# Get context
context = builder.question_context(question)

# Get answer
answer = generator.generate_question_response(db, question, context)

print(answer)
# Output: "Based on your data, you should focus on:
#  1. Ibuprofen (declining sales, high stock)
#  2. Paracetamol (expiring soon)
#  3. ..."
```

### Example 3: Detect Anomalies

```python
from app.services.analytics_service import detect_anomalies

anomalies = detect_anomalies(db)

# Returns:
# [
#   {"type": "HIGH_STOCK_LOW_SALES", "product": "Ibuprofen", ...},
#   {"type": "SELLING_BELOW_COST", "product": "Aspirin", ...},
#   ...
# ]

for anomaly in anomalies:
    print(f"{anomaly['type']}: {anomaly['product_name']}")
```

---

## Troubleshooting

### Issue: "Insight validation failed"

```
Error: Insight uses dangerous word: "will"
```

**Solution:**
Claude used over-confident language. Check the prompt is correct.

```bash
# Verify prompt
from app.prompts import get_system_prompt
print(get_system_prompt("general"))

# Should include: "Use cautious language: 'may', 'could', 'potentially', not 'will'"
```

### Issue: "No insights generated"

```
Message: "Unable to generate insights at this time"
```

**Solution:**

1. Check API key: `ANTHROPIC_API_KEY` set correctly?
2. Check context: Does product have any data?
3. Check Claude: Is API working?

```python
# Test Claude directly
from anthropic import Anthropic
client = Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=100,
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.content[0].text)  # Should print response
```

### Issue: "Invalid insight type"

```
Error: insight_type must be one of: ...
```

**Solution:** Use valid types:
- `EXPIRY_RISK`
- `SALES_TREND`
- `ANOMALY`
- `BUSINESS_HEALTH`
- `RECOMMENDATION`
- `DEMAND_PATTERN`

### Issue: Context too large

```
Error: estimated tokens exceed 4000
```

**Solution:** Limit context size

```python
# In context_builder.py
context = builder.product_context(product_id)
tokens = builder.estimate_tokens(context)

if tokens > 4000:
    # Reduce context
    context.pop("supporting_data")
```

---

## Performance Considerations

### Generation Speed

- **Small product insight:** ~2-3 seconds
- **Business-wide insight:** ~3-5 seconds
- **Question answer:** ~2-4 seconds

### Scaling

**For 1000+ products:**
- Generate insights in batch overnight
- Store in database
- Serve via API (instant)

```python
# Batch generation script
for product in db.query(Product).all():
    generate_product_insights(db, product.id)
    time.sleep(0.5)  # Rate limiting
```

### Cost Estimation

- **Per insight:** ~$0.001-0.005
- **1000 insights/month:** ~$5-10

---

## Next Steps

1. **Set up API key:** `export ANTHROPIC_API_KEY=sk-ant-xxxxx`
2. **Copy files to backend:** `analytics_service.py`, `context_builder.py`, `prompts.py`, `insight_service.py`, `insight_model.py`, `insight_routes.py`
3. **Register routes:** Add to `main.py`
4. **Test endpoint:** `POST /insights/generate/product/1`
5. **Monitor responses:** Check guardrail validations
6. **Iterate:** Adjust prompts based on results

---

## Summary

The AI Intelligence Layer transforms ExpireGuard from a simple expiry tracker into an intelligent business advisor:

✅ **Verified Analytics** — Real numbers, not guesses
✅ **Structured Context** — Business data properly packaged
✅ **Guided AI** — Clear rules and guardrails
✅ **Validated Output** — Responses checked for accuracy
✅ **Evidence-Based** — Every insight traces to data
✅ **Actionable** — Recommendations business can use
✅ **Persistent** — Insights stored for history
✅ **Queryable** — Full API for frontend

**Ready for implementation.** 🚀
