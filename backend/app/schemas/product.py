"""Product schemas"""

from pydantic import BaseModel
from datetime import datetime


class ProductCreate(BaseModel):
    """Create product"""
    name: str
    sku: str
    category: str | None = None
    unit_price: float = 0.0
    description: str | None = None


class ProductUpdate(BaseModel):
    """Update product"""
    name: str | None = None
    category: str | None = None
    unit_price: float | None = None
    description: str | None = None


class ProductResponse(BaseModel):
    """Response"""
    id: int
    user_id: int
    name: str
    sku: str
    category: str | None
    unit_price: float
    created_at: datetime

    class Config:
        from_attributes = True
