"""Sale schemas"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class SaleCreate(BaseModel):
    """Record a sale"""
    product_id: int
    quantity_sold: float
    revenue: float
    sale_date: date | None = None


class SaleResponse(BaseModel):
    """Response"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity_sold: float
    sale_date: date
    revenue: float
    created_at: datetime
