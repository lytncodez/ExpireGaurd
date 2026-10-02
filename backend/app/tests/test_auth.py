"""
Tests for authentication endpoints.
Covers: register, login, logout, get current user.
"""

import pytest
from fastapi import status


class TestRegister:
    """Registration endpoint tests."""
    
    def test_register_success(self, client, test_user_data):
        """User can register with valid email and password."""
        response = client.post(
            "/auth/register",
            json={
                "email": test_user_data["email"],
                "password": test_user_data["password"],
                "name": test_user_data["name"],
                "phone": test_user_data["phone"],
            },
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == test_user_data["email"]
        assert data["name"] == test_user_data["name"]
        assert "id" in data
        assert "password" not in data  # Password should never be returned
    
    def test_register_duplicate_email(self, client, test_user, test_user_data):
        """Cannot register with email that already exists."""
        response = client.post(
            "/auth/register",
            json={
                "email": test_user_data["email"],
                "password": "DifferentPassword123!",
                "name": "Different Name",
                "phone": "+233501111111",
            },
        )
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_register_invalid_email(self, client):
        """Registration fails with invalid email format."""
        response = client.post(
            "/auth/register",
            json={
                "email": "not-an-email",
                "password": "Password123!",
                "name": "Test User",
                "phone": "+233501234567",
            },
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_register_short_password(self, client):
        """Registration fails with password too short."""
        response = client.post(
            "/auth/register",
            json={
                "email": "test@example.com",
                "password": "short",  # Too short
                "name": "Test User",
                "phone": "+233501234567",
            },
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLogin:
    """Login endpoint tests."""
    
    def test_login_success(self, client, test_user, test_user_data):
        """User can login with correct credentials."""
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"],
            },
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, client, test_user, test_user_data):
        """Login fails with wrong password."""
        response = client.post(
            "/auth/login",
            data={
                "username": test_user_data["email"],
                "password": "WrongPassword123!",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_nonexistent_user(self, client):
        """Login fails with non-existent email."""
        response = client.post(
            "/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "Password123!",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestGetCurrentUser:
    """Get current user endpoint tests."""
    
    def test_get_current_user_success(self, client, test_user):
        """Authenticated user can get their profile."""
        response = client.get(
            "/auth/me",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user["email"]
        assert data["name"] == test_user["name"]
        assert data["phone"] == test_user["phone"]
    
    def test_get_current_user_no_auth(self, client):
        """Unauthenticated request to /auth/me fails."""
        response = client.get("/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user_invalid_token(self, client):
        """Request with invalid token fails."""
        response = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid_token"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestLogout:
    """Logout endpoint tests."""
    
    def test_logout_success(self, client, test_user):
        """Authenticated user can logout."""
        response = client.post(
            "/auth/logout",
            headers=test_user["headers"],
        )
        assert response.status_code == status.HTTP_200_OK
    
    def test_logout_no_auth(self, client):
        """Logout without auth returns 401."""
        response = client.post("/auth/logout")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
