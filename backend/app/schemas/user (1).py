"""User schemas for API validation"""

from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserCreate(BaseModel):
    """For registration"""
    email: EmailStr
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    """For login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Response when returning user data"""
    id: int
    email: str
    full_name: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
