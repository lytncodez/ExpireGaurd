"""Batch schemas"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.batch import ExpiryStatus


class BatchCreate(BaseModel):
    """Create batch"""
    product_id: int
    batch_number: str
    quantity_received: float
    expiry_date: date


class BatchUpdate(BaseModel):
    """Update batch"""
    quantity_remaining: float | None = None


class BatchResponse(BaseModel):
    """Response"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    batch_number: str
    quantity_received: float
    quantity_remaining: float
    expiry_date: date
    status: ExpiryStatus
    days_remaining: int | None
    created_at: datetime
