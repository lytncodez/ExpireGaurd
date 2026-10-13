from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole
from app.schemas import ORMModel
from app.schemas.types import OptionalPhone, Password


class UserRead(ORMModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    email: EmailStr
    phone_number: str | None
    role: UserRole = Field(description="admin | dispenser")
    is_active: bool
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: Password | None = Field(
        default=None, description="Omit to generate a temporary password (returned once in the response)"
    )
    phone_number: OptionalPhone = None
    role: UserRole = UserRole.DISPENSER


class UserCreated(UserRead):
    temporary_password: str | None = Field(
        default=None, description="Only present when the admin did not set a password; share it with the user"
    )


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    phone_number: OptionalPhone = None
    role: UserRole | None = None
    is_active: bool | None = None
