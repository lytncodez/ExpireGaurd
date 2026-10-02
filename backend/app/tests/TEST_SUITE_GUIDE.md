# ExpireGuard Test Suite Guide

Complete unit test coverage for the ExpireGuard backend API.

---

## 📁 Test Files Overview

### **1. conftest.py** 
**Pytest configuration and shared fixtures**

Provides:
- ✅ In-memory SQLite database for testing
- ✅ FastAPI TestClient setup
- ✅ Auth fixtures (test_user, auth headers)
- ✅ Product fixtures (test_product, sample data)
- ✅ Batch fixtures (test_batch, expired_batch, critical_batch)
- ✅ Database cleanup after each test

**Used by:** All other test files

---

### **2. test_auth.py**
**Authentication endpoints**

Tests:
- ✅ User registration (success, duplicate email, invalid email, short password)
- ✅ User login (success, wrong password, non-existent user)
- ✅ Get current user (success, no auth, invalid token)
- ✅ User logout (success, no auth)

**Classes:**
- `TestRegister` — Registration logic
- `TestLogin` — Login logic
- `TestGetCurrentUser` — User profile retrieval
- `TestLogout` — Logout logic

**Run:** `pytest tests/test_auth.py -v`

---

### **3. test_products.py**
**Product CRUD endpoints**

Tests:
- ✅ Create product (success, no auth, duplicate SKU, invalid prices)
- ✅ Get products (all, by ID, empty list, not found)
- ✅ Update product (success, no auth, not found)
- ✅ Delete product (success, no auth, not found)

**Classes:**
- `TestCreateProduct` — Product creation
- `TestGetProducts` — Product retrieval
- `TestUpdateProduct` — Product updates
- `TestDeleteProduct` — Product deletion

**Run:** `pytest tests/test_products.py -v`

---

### **4. test_batches.py**
**Batch CRUD endpoints**

Tests:
- ✅ Create batch (success, no auth, invalid product, invalid dates)
- ✅ Get batches (all, by ID, empty list, not found)
- ✅ Update batch (quantity, status, no auth, not found)
- ✅ Delete batch (success, no auth, not found)

**Classes:**
- `TestCreateBatch` — Batch creation
- `TestGetBatches` — Batch retrieval
- `TestUpdateBatch` — Batch updates
- `TestDeleteBatch` — Batch deletion

**Run:** `pytest tests/test_batches.py -v`

---

### **5. test_expiry.py**
**Expiry logic and status classification**

Tests:
- ✅ Expiry classification (EXPIRED, CRITICAL, SAFE, EXPIRING_SOON)
- ✅ Expiry endpoints (/expiry, /expiry/expired, /expiry/critical)
- ✅ Days remaining calculation
- ✅ Status updates based on expiry dates

**Classes:**
- `TestExpiryClassification` — Status classification logic
- `TestExpiryEndpoints` — API endpoints
- `TestExpiryDaysRemaining` — Days calculation

**Run:** `pytest tests/test_expiry.py -v`

---

### **6. test_alerts.py**
**Alert management and SMS**

Tests:
- ✅ Get all alerts
- ✅ Get critical alerts
- ✅ Mark alerts as read
- ✅ Send test SMS
- ✅ Automatic alert generation for expired/critical batches
- ✅ SMS status tracking

**Classes:**
- `TestGetAlerts` — Alert retrieval
- `TestAlertMarkAsRead` — Alert status updates
- `TestSMSTest` — SMS testing
- `TestAlertGeneration` — Automatic alert creation
- `TestAlertSMSTracking` — SMS tracking fields

**Run:** `pytest tests/test_alerts.py -v`

---

## 🚀 How to Run Tests

### **Install pytest**
```bash
pip install pytest pytest-cov
```

### **Run All Tests**
```bash
cd backend
pytest tests/ -v
```

### **Run Specific Test File**
```bash
pytest tests/test_auth.py -v
pytest tests/test_products.py -v
pytest tests/test_batches.py -v
pytest tests/test_expiry.py -v
pytest tests/test_alerts.py -v
```

### **Run Specific Test Class**
```bash
pytest tests/test_auth.py::TestRegister -v
pytest tests/test_products.py::TestCreateProduct -v
pytest tests/test_batches.py::TestUpdateBatch -v
```

### **Run Specific Test Function**
```bash
pytest tests/test_auth.py::TestRegister::test_register_success -v
pytest tests/test_products.py::TestCreateProduct::test_create_product_success -v
```

### **Run with Coverage Report**
```bash
pytest tests/ --cov=app --cov-report=html
# Opens htmlcov/index.html in your browser for coverage details
```

### **Run with Output Capture Disabled** (to see print statements)
```bash
pytest tests/ -v -s
```

---

## 📊 Test Statistics

| File | Test Classes | Test Functions | Purpose |
|------|-------------|-----------------|---------|
| conftest.py | — | 11 fixtures | Configuration & fixtures |
| test_auth.py | 4 | 11 | Authentication (register, login, logout) |
| test_products.py | 4 | 14 | Product CRUD operations |
| test_batches.py | 4 | 13 | Batch CRUD operations |
| test_expiry.py | 3 | 9 | Expiry status & calculations |
| test_alerts.py | 5 | 13 | Alert management & SMS |
| **TOTAL** | **20 classes** | **60 tests** | **Complete API coverage** |

---

## 🧪 What Gets Tested

### **Authentication (11 tests)**
- ✅ User registration with validation
- ✅ Login with JWT tokens
- ✅ User profile retrieval
- ✅ Logout functionality

### **Products (14 tests)**
- ✅ CRUD operations
- ✅ Duplicate SKU prevention
- ✅ Price validation
- ✅ Authorization checks

### **Batches (13 tests)**
- ✅ CRUD operations
- ✅ Date validation
- ✅ Quantity tracking
- ✅ Status management

### **Expiry Logic (9 tests)**
- ✅ Status classification (EXPIRED, CRITICAL, SAFE)
- ✅ Days remaining calculation
- ✅ Batch filtering endpoints
- ✅ Negative days for expired batches

### **Alerts (13 tests)**
- ✅ Alert retrieval and filtering
- ✅ Alert status updates (read/unread)
- ✅ SMS test sending
- ✅ Automatic alert generation
- ✅ SMS tracking fields

---

## 🔧 Fixtures Explained

### **Database Fixture**
```python
def test_something(db):
    # db is an in-memory SQLite database
    # Fresh for each test, cleaned up after
```

### **Auth Fixture**
```python
def test_something(client, test_user):
    # test_user = {"email": "...", "token": "...", "headers": {...}}
    client.get("/some-endpoint", headers=test_user["headers"])
```

### **Product Fixture**
```python
def test_something(client, test_user, test_product):
    # test_product = {"id": 1, "name": "...", "sku": "..."}
    # Already created and authenticated
```

### **Batch Fixtures**
```python
def test_something(client, test_user, test_batch):
    # test_batch = SAFE (60+ days left)

def test_something_else(client, test_user, expired_batch):
    # expired_batch = EXPIRED (past expiry)

def test_critical(client, test_user, critical_batch):
    # critical_batch = CRITICAL (15 days left)
```

---

## ✅ Test Naming Convention

Tests follow this pattern:
```python
def test_[feature]_[condition]_[expected_result](fixtures):
    """Description of what's being tested."""
```

**Examples:**
- `test_create_product_success` — Create product succeeds
- `test_create_product_duplicate_sku` — Duplicate SKU is rejected
- `test_get_products_no_auth` — Unauthenticated request fails
- `test_mark_alert_as_read` — Alert can be marked read

---

## 🎯 Running Tests Before Deployment

**Recommended workflow:**

```bash
# 1. Install dependencies
pip install -r requirements.txt
pip install pytest pytest-cov

# 2. Run all tests
pytest tests/ -v

# 3. Check coverage
pytest tests/ --cov=app --cov-report=term-missing

# 4. Run specific high-risk areas
pytest tests/test_auth.py -v
pytest tests/test_expiry.py -v
pytest tests/test_alerts.py -v

# 5. Run with detailed output
pytest tests/ -vv -s
```

---

## 📝 Writing Your Own Tests

### **Template**

```python
import pytest
from fastapi import status

class TestNewFeature:
    """Tests for new feature."""
    
    def test_feature_success(self, client, test_user):
        """Feature works as expected."""
        response = client.post(
            "/endpoint",
            json={"key": "value"},
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["key"] == "value"
    
    def test_feature_no_auth(self, client):
        """Unauthenticated request fails."""
        response = client.post(
            "/endpoint",
            json={"key": "value"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### **Common Assertions**

```python
# Status codes
assert response.status_code == status.HTTP_200_OK
assert response.status_code == status.HTTP_201_CREATED
assert response.status_code == status.HTTP_401_UNAUTHORIZED
assert response.status_code == status.HTTP_404_NOT_FOUND

# Response data
data = response.json()
assert data["email"] == "test@example.com"
assert "id" in data
assert len(data) > 0

# Database state
from app.models import Product
product = db.query(Product).filter_by(sku="TEST").first()
assert product is not None
```

---

## 🐛 Debugging Failed Tests

### **Run with verbose output**
```bash
pytest tests/test_auth.py::TestRegister::test_register_success -vv -s
```

### **Print debug info**
```python
def test_something(client, test_user):
    print(f"Token: {test_user['token']}")  # Will print during test
    print(f"Headers: {test_user['headers']}")
    response = client.get("/endpoint", headers=test_user["headers"])
```

### **Use pytest debugger**
```bash
pytest tests/test_auth.py -v --pdb  # Stops at failures
```

### **Check database state**
```python
def test_something(db, client, test_user):
    response = client.post("/endpoint", ...)
    
    # Query database directly
    from app.models import YourModel
    obj = db.query(YourModel).first()
    print(f"Database object: {obj}")
```

---

## 📦 Copy All Test Files

```bash
cd backend

# Copy test files
cp conftest.py tests/
cp test_auth.py tests/
cp test_products.py tests/
cp test_batches.py tests/
cp test_expiry.py tests/
cp test_alerts.py tests/

# Rename __init__ file
cp tests___init__.py tests/__init__.py

# Install dependencies
pip install pytest pytest-cov

# Run tests
pytest tests/ -v
```

---

## ✨ Success Indicators

When all tests pass, you'll see:

```
================================ test session starts ================================
platform linux -- Python 3.9.0, pytest-7.0.0
collected 60 items

tests/test_auth.py ............ PASSED [ 20%]
tests/test_products.py .............. PASSED [ 45%]
tests/test_batches.py .............. PASSED [ 67%]
tests/test_expiry.py .............. PASSED [ 82%]
tests/test_alerts.py .............. PASSED [100%]

================================ 60 passed in 2.34s ================================
```

---

## 🎓 Learning Resources

- **Pytest docs:** https://docs.pytest.org/
- **FastAPI testing:** https://fastapi.tiangolo.com/advanced/testing-dependencies/
- **SQLAlchemy testing:** https://docs.sqlalchemy.org/en/14/orm/session_basics.html
- **Status codes:** https://httpwg.org/specs/rfc7231.html#status.codes

---

Great job! You now have a complete, professional test suite. 🚀
