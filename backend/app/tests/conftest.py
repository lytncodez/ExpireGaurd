"""
Pytest configuration and shared fixtures for ExpireGuard tests.
Provides database, auth, and common test utilities.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from datetime import datetime, timedelta
import os

# Must import models BEFORE creating tables
from app.core.database import Base
from app.core.config import settings
from app.main import app
from app.core.database import get_db


# ========== DATABASE SETUP ==========

@pytest.fixture(scope="function")
def db():
    """
    Create an in-memory SQLite database for testing.
    Each test gets a fresh database.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    yield db
    
    db.close()
    engine.dispose()


@pytest.fixture(scope="function")
def client(db: Session):
    """
    Create a test client with database dependency override.
    """
    def override_get_db():
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# ========== AUTH FIXTURES ==========

@pytest.fixture
def test_user_data():
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "name": "Test User",
        "phone": "+233501234567",
        "password": "TestPassword123!",
    }


@pytest.fixture
def test_user(client, test_user_data, db):
    """Create a test user and return user data with token."""
    # Register
    response = client.post(
        "/auth/register",
        json={
            "email": test_user_data["email"],
            "password": test_user_data["password"],
            "name": test_user_data["name"],
            "phone": test_user_data["phone"],
        },
    )
    assert response.status_code == 201
    
    # Login
    response = client.post(
        "/auth/login",
        data={
            "username": test_user_data["email"],
            "password": test_user_data["password"],
        },
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    
    return {
        **test_user_data,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
    }


# ========== PRODUCT FIXTURES ==========

@pytest.fixture
def test_product_data():
    """Sample product data."""
    return {
        "name": "Test Product",
        "sku": "TEST-001",
        "barcode": "1234567890123",
        "category": "Electronics",
        "brand": "TestBrand",
        "unit": "pieces",
        "selling_price": 150.00,
        "cost_price": 100.00,
    }


@pytest.fixture
def test_product(client, test_user, test_product_data, db):
    """Create a test product."""
    response = client.post(
        "/products",
        json=test_product_data,
        headers=test_user["headers"],
    )
    assert response.status_code == 201
    return response.json()


# ========== BATCH FIXTURES ==========

@pytest.fixture
def test_batch_data():
    """Sample batch data."""
    today = datetime.now().date()
    return {
        "batch_number": "BATCH-001",
        "manufacturing_date": today.isoformat(),
        "expiry_date": (today + timedelta(days=60)).isoformat(),
        "quantity_received": 100,
    }


@pytest.fixture
def test_batch(client, test_user, test_product, test_batch_data, db):
    """Create a test batch."""
    batch_payload = {
        **test_batch_data,
        "product_id": test_product["id"],
    }
    response = client.post(
        "/batches",
        json=batch_payload,
        headers=test_user["headers"],
    )
    assert response.status_code == 201
    return response.json()


# ========== BATCH WITH EXPIRY FIXTURES ==========

@pytest.fixture
def expired_batch_data():
    """Batch that has already expired."""
    today = datetime.now().date()
    return {
        "batch_number": "EXPIRED-001",
        "manufacturing_date": (today - timedelta(days=120)).isoformat(),
        "expiry_date": (today - timedelta(days=30)).isoformat(),  # Expired 30 days ago
        "quantity_received": 50,
    }


@pytest.fixture
def expired_batch(client, test_user, test_product, expired_batch_data, db):
    """Create an expired test batch."""
    batch_payload = {
        **expired_batch_data,
        "product_id": test_product["id"],
    }
    response = client.post(
        "/batches",
        json=batch_payload,
        headers=test_user["headers"],
    )
    assert response.status_code == 201
    return response.json()


@pytest.fixture
def critical_batch_data():
    """Batch expiring in 15 days (CRITICAL)."""
    today = datetime.now().date()
    return {
        "batch_number": "CRITICAL-001",
        "manufacturing_date": (today - timedelta(days=60)).isoformat(),
        "expiry_date": (today + timedelta(days=15)).isoformat(),  # 15 days left
        "quantity_received": 75,
    }


@pytest.fixture
def critical_batch(client, test_user, test_product, critical_batch_data, db):
    """Create a critical (expiring soon) test batch."""
    batch_payload = {
        **critical_batch_data,
        "product_id": test_product["id"],
    }
    response = client.post(
        "/batches",
        json=batch_payload,
        headers=test_user["headers"],
    )
    assert response.status_code == 201
    return response.json()


# ========== HEADERS HELPER ==========

@pytest.fixture
def auth_headers(test_user):
    """Quick access to auth headers."""
    return test_user["headers"]
