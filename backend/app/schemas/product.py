"""Product schemas"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    """Create product"""
    name: str
    sku: str
    barcode: str | None = None
    category: str | None = None
    brand: str | None = None
    unit: str | None = None
    selling_price: float = Field(default=0.0, ge=0)
    cost_price: float = Field(default=0.0, ge=0)
    unit_price: float | None = None
    description: str | None = None


class ProductUpdate(BaseModel):
    """Update product"""
    name: str | None = None
    barcode: str | None = None
    category: str | None = None
    brand: str | None = None
    unit: str | None = None
    selling_price: float | None = Field(default=None, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    unit_price: float | None = None
    description: str | None = None


class ProductResponse(BaseModel):
    """Response"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str
    sku: str
    barcode: str | None = None
    category: str | None
    brand: str | None = None
    unit: str | None = None
    selling_price: float = 0.0
    cost_price: float = 0.0
    unit_price: float | None = None
    created_at: datetime
