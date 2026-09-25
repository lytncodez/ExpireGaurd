"""Basic smoke tests"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models import User, Product

# Use in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class TestAuth:
    def test_register(self):
        response = client.post(
            "/auth/register",
            json={"email": "test@test.com", "password": "testpass", "full_name": "Test User"}
        )
        assert response.status_code == 200
        assert response.json()["email"] == "test@test.com"

    def test_login(self):
        # First register
        client.post(
            "/auth/register",
            json={"email": "login@test.com", "password": "testpass", "full_name": "Test"}
        )
        
        # Then login
        response = client.post(
            "/auth/login",
            json={"email": "login@test.com", "password": "testpass"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()


class TestProducts:
    def test_create_product(self):
        response = client.post(
            "/products",
            json={"name": "Test Product", "sku": "SKU123", "unit_price": 10.0}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Test Product"

    def test_list_products(self):
        response = client.get("/products")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestHealth:
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestSecurity:
    def test_password_hashing(self):
        password = "mypassword"
        hashed = hash_password(password)
        assert verify_password(password, hashed) == True
        assert verify_password("wrongpassword", hashed) == False

    def test_jwt_token(self):
        token = create_access_token({"sub": "123"})
        assert token is not None
        assert isinstance(token, str)
