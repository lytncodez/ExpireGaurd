"""Batch schemas"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, model_validator

from app.models.batch import ExpiryStatus


class BatchCreate(BaseModel):
    """Create batch"""
    model_config = ConfigDict(extra="forbid")

    product_id: int
    batch_number: str
    manufacturing_date: date | None = None
    quantity_received: float
    expiry_date: date

    @model_validator(mode="after")
    def validate_dates(self):
        if self.manufacturing_date and self.expiry_date < self.manufacturing_date:
            raise ValueError("expiry_date cannot be earlier than manufacturing_date")
        return self


class BatchUpdate(BaseModel):
    """Update batch"""
    quantity_remaining: float | None = None
    status: str | None = None


class BatchResponse(BaseModel):
    """Response"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    batch_number: str
    quantity_received: float
    quantity_remaining: float
    expiry_date: date
    status: str
    days_remaining: int | None
    created_at: datetime
