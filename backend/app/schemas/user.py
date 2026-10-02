"""User schemas for API validation"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserCreate(BaseModel):
    """For registration"""
    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None
    full_name: str | None = None
    phone: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value

    @model_validator(mode="before")
    @classmethod
    def populate_full_name(cls, values):
        if isinstance(values, dict):
            if values.get("full_name") is None and values.get("name") is not None:
                values["full_name"] = values["name"]
        return values


class UserLogin(BaseModel):
    """For login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Response when returning user data"""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    email: str
    full_name: str | None
    name: str | None = None
    phone: str | None = None
    is_active: bool
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def populate_name(cls, values):
        if isinstance(values, dict):
            values.setdefault("name", values.get("full_name"))
        return values
