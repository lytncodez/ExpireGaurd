# ExpireGuard Backend - Deployment Guide

## Quick Setup (3 steps)

### 1. Install & Configure

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your PostgreSQL URL
```

### 2. Create Database Tables

```bash
# Option A: Using Alembic (recommended)
alembic upgrade head

# Option B: Using SQLAlchemy directly (if alembic fails)
python -c "from app.core.database import engine, Base; from app.models import *; Base.metadata.create_all(bind=engine)"
```

### 3. Run Server

```bash
python -m uvicorn app.main:app --reload
```

Visit: http://localhost:8000/docs

---

## API Endpoints Ready to Use

### Authentication
```
POST /auth/register
POST /auth/login
```

### Products
```
GET /products
POST /products
GET /products/{id}
PUT /products/{id}
DELETE /products/{id}
```

### Batches
```
GET /batches
POST /batches
GET /batches/{id}
PATCH /batches/{id}
```

### Alerts
```
GET /alerts
GET /alerts/critical
GET /alerts/expired
PATCH /alerts/{id}/read
POST /alerts/refresh
```

### CSV Import
```
POST /imports/csv  (upload file)
```

### Dashboard
```
GET /dashboard/summary
GET /insights
```

---

## Testing

```bash
# Run all tests
pytest tests.py -v

# Run specific test
pytest tests.py::TestAuth::test_register -v
```

---

## Database Schema

**Users** - stores user accounts

**Products** - stores product definitions (SKU, name, category)
  - Many-to-one relationship with Users

**Batches** - stores stock batches with expiry dates
  - Tracks quantity_received, quantity_remaining, expiry_date, status
  - Many-to-one relationship with Products

**Sales** - records sales/consumption
  - Many-to-one relationship with Products

**Alerts** - tracks expiry alerts
  - Many-to-one relationship with Batches
  - Types: CRITICAL (1-30 days), EXPIRING_SOON (31-90 days), EXPIRED (0+ days)

**Insights** - stores analytics insights (generated manually or by background tasks)

---

## Expiry Logic

**Days Remaining** = expiry_date - today

**Status Mapping:**
- SAFE: > 90 days
- EXPIRING_SOON: 31-90 days
- CRITICAL: 1-30 days
- EXPIRED: <= 0 days

Alerts are automatically created when batches change status.

---

## CSV Import Format

Required columns:
```
product_name, sku, batch_number, quantity, expiry_date
```

Optional columns:
```
category, unit_price, description
```

Example:
```csv
product_name,sku,batch_number,quantity,expiry_date,category,unit_price
Coca Cola,CC001,BATCH001,100,2025-12-31,Beverages,5.0
```

---

## Troubleshooting

### "Database URL not found"
Make sure `.env` file exists and has `DATABASE_URL=postgresql://...`

### "Port 8000 already in use"
```bash
python -m uvicorn app.main:app --reload --port 8001
```

### "ModuleNotFoundError: No module named 'app'"
Make sure you're running from the `backend/` directory

### "psycopg2: connection refused"
PostgreSQL isn't running or connection string is wrong

```bash
# On Windows
# Start PostgreSQL service via Services app or:
# pg_ctl -D "C:\Program Files\PostgreSQL\data" start
```

---

## Next Steps (Optional Enhancements)

1. Add JWT authentication to protected endpoints
2. Implement background task for automatic alert refresh
3. Add email notifications for alerts
4. Build analytics reports
5. Add user management endpoints
6. Implement role-based access control (admin/user)

---

## Architecture Summary

```
Request
  ↓
Routes (request validation, auth check)
  ↓
Services (business logic: expiry calc, alert generation)
  ↓
Models (database operations via SQLAlchemy)
  ↓
PostgreSQL Database
  ↓
Response (JSON via Pydantic schemas)
```

Key separation:
- **Routes** = HTTP endpoints (thin, just validation)
- **Services** = Business logic (reusable, testable)
- **Models** = Database ORM (structure and relationships)
- **Schemas** = API validation (Pydantic)
- **Core** = Configuration, database, security

---

## Performance Notes

For production:
1. Use PostgreSQL connection pooling
2. Add caching for dashboard summary
3. Run alert generation as background task (Celery/APScheduler)
4. Add request rate limiting
5. Enable CORS only for your frontend domain

---

Done! The backend MVP is complete and ready to connect to your frontend. 🚀
