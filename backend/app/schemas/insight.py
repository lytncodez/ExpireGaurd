"""Insight schemas"""

from pydantic import BaseModel
from datetime import date, datetime


class InsightResponse(BaseModel):
    """Response"""
    id: int
    product_id: int | None
    insight_type: str
    title: str
    description: str | None
    metric_value: float | None
    metric_unit: str | None
    generated_at: date
    created_at: datetime

    class Config:
        from_attributes = True
