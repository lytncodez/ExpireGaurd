"""Alert schemas"""

from pydantic import BaseModel
from datetime import datetime
from app.models.alert import AlertType


class AlertResponse(BaseModel):
    """Response"""
    id: int
    batch_id: int
    alert_type: AlertType
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
