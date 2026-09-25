"""Sale schemas"""

from pydantic import BaseModel
from datetime import date, datetime


class SaleCreate(BaseModel):
    """Record a sale"""
    product_id: int
    quantity_sold: float
    revenue: float
    sale_date: date | None = None


class SaleResponse(BaseModel):
    """Response"""
    id: int
    product_id: int
    quantity_sold: float
    sale_date: date
    revenue: float
    created_at: datetime

    class Config:
        from_attributes = True
