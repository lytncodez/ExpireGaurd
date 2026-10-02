"""User schemas for API validation"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


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

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str | None
    is_active: bool
    created_at: datetime
