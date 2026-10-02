"""Alert routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertResponse
from app.services.alert_service import (
    mark_alert_read,
    get_critical_alerts,
    get_expired_alerts,
    generate_alerts_for_all_batches,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


class TestSMSRequest(BaseModel):
    phone_number: str
    message: str = "Test alert message"

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("phone_number is required")
        if len(cleaned) < 8 or len(cleaned) > 16:
            raise ValueError("phone_number must be 8-16 characters")
        if not any(ch.isdigit() for ch in cleaned):
            raise ValueError("phone_number must contain digits")
        return cleaned


@router.get("", response_model=list[AlertResponse])
def list_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all alerts"""
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return alerts


@router.get("/critical", response_model=list[AlertResponse])
def get_critical(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get critical alerts"""
    return get_critical_alerts(db)


@router.get("/expired", response_model=list[AlertResponse])
def get_expired(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get expired alerts"""
    return get_expired_alerts(db)


@router.post("/test-sms", status_code=status.HTTP_200_OK)
def test_sms(
    payload: TestSMSRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a test SMS message with the current user's phone number when available."""
    phone_number = payload.phone_number
    message = payload.message
    try:
        from app.services.sms_service import SMSService

        sms_service = SMSService()
        result = sms_service.send_test_sms(phone_number, message)
        return {
            "success": result.get("success", True),
            "message_id": result.get("message_id"),
            "error": result.get("error"),
            "provider": sms_service.provider_name,
            "phone_number": phone_number,
        }
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise HTTPException(status_code=503, detail=f"SMS test failed: {exc}") from exc


@router.patch("/{alert_id}/read", response_model=AlertResponse)
def mark_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark alert as read"""
    alert = mark_alert_read(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/refresh")
def refresh_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recalculate all alerts (can be called periodically)"""
    generate_alerts_for_all_batches(db)
    return {"status": "alerts refreshed"}
