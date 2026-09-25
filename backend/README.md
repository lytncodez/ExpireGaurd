# ExpireGuard Backend MVP

A product expiry tracking and alert system built with FastAPI, PostgreSQL, and SQLAlchemy.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/expireguard
SECRET_KEY=your-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
APP_NAME=ExpireGuard
DEBUG=True
```

### 3. Create Database and Run Migrations

```bash
# Create the database (if it doesn't exist)
createdb expireguard

# Run Alembic migrations to create tables (coming soon)
alembic upgrade head
```

### 4. Run the Server

```bash
python -m uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs` (Swagger UI)

---

## Architecture

### Directory Structure

```
app/
├── main.py                 # FastAPI app entry point
├── core/
│   ├── config.py          # Settings from environment variables
│   ├── database.py        # SQLAlchemy engine, session, Base class
│   └── security.py        # JWT, password hashing functions
├── models/                # SQLAlchemy ORM models (database tables)
│   ├── user.py
│   ├── product.py
│   ├── batch.py
│   ├── sale.py
│   ├── alert.py
│   └── insight.py
├── schemas/               # Pydantic schemas (API request/response validation)
│   ├── user.py
│   ├── product.py
│   ├── batch.py
│   ├── sale.py
│   ├── alert.py
│   └── insight.py
├── routes/                # FastAPI route handlers (endpoints)
│   ├── auth.py            # POST /auth/register, POST /auth/login
│   ├── products.py        # CRUD for products
│   ├── batches.py         # CRUD for batches
│   ├── sales.py           # CRUD for sales
│   ├── alerts.py          # Alert management
│   ├── imports.py         # CSV upload & processing
│   ├── insights.py        # Analytics insights
│   └── dashboard.py       # Dashboard summary
├── services/              # Business logic (expiry, alerts, analytics)
│   ├── expiry_service.py  # Calculate expiry status
│   ├── alert_service.py   # Generate and manage alerts
│   ├── analytics_service.py # Analytics calculations
│   ├── insight_service.py # Generate insights
│   └── csv_service.py     # CSV parsing and validation
└── utils/                 # Helpers and validators
    ├── helpers.py
    └── validators.py
```

### Data Flow

#### 1. CSV Upload Flow

```
POST /imports/csv
  ↓
routes/imports.py (validate file)
  ↓
services/csv_service.py (parse, clean, validate)
  ↓
models (insert products, batches, sales)
  ↓
services/expiry_service.py (calculate expiry status)
  ↓
services/alert_service.py (generate alerts)
  ↓
services/analytics_service.py (calculate metrics)
  ↓
Return success response
```

---

## API Endpoints (Summary)

### Authentication
- `POST /auth/register` - Create new user
- `POST /auth/login` - Get access token

### Products
- `GET /products` - List all products
- `POST /products` - Create product
- `GET /products/{id}` - Get product details
- `PUT /products/{id}` - Update product
- `DELETE /products/{id}` - Delete product

### Batches
- `GET /batches` - List all batches
- `POST /batches` - Create batch
- `GET /batches/{id}` - Get batch details

### Sales
- `GET /sales` - List all sales
- `POST /sales` - Record a sale

### Alerts
- `GET /alerts` - List all alerts
- `GET /alerts/critical` - List critical alerts
- `GET /alerts/expired` - List expired items
- `PATCH /alerts/{id}/read` - Mark alert as read

### Insights
- `GET /insights` - Get all insights
- `GET /insights/{id}` - Get insight details

### Imports
- `POST /imports/csv` - Upload and process CSV

### Dashboard
- `GET /dashboard/summary` - Get dashboard summary stats

---

## Next Steps

1. Create database models (User, Product, Batch, Sale, Alert, Insight)
2. Create Alembic migrations
3. Build authentication routes
4. Build CRUD routes
5. Implement expiry calculation logic
6. Implement alert generation
7. Implement CSV import pipeline
8. Add analytics and insights
9. Build dashboard summary
10. Write comprehensive tests
