"""Insight schemas"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class InsightResponse(BaseModel):
    """Response"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int | None
    insight_type: str
    title: str
    description: str | None
    metric_value: float | None
    metric_unit: str | None
    generated_at: date
    created_at: datetime
