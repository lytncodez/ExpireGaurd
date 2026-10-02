"""Alert schemas"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertSeverity, AlertType, SMSStatus


class AlertResponse(BaseModel):
    """Alert response payload."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    batch_id: int
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    is_read: bool
    recipient_phone: str | None = None
    sms_status: SMSStatus | None = None
    sms_sent: bool = False
    resolved_at: datetime | None = None
    created_at: datetime
