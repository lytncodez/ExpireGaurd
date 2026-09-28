"""Alert routes - Alert management and SMS testing"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert, AlertType, SMSStatus
from app.schemas.alert import AlertResponse
from app.services.alert_service import (
    mark_alert_read,
    resolve_alert,
    get_all_alerts,
    get_unread_alerts,
    get_critical_alerts,
    get_expired_alerts,
    retry_failed_sms_alerts,
)
from app.services.sms_service import get_sms_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def list_alerts(
    db: Session = Depends(get_db),
    include_resolved: bool = Query(False, description="Include resolved alerts")
):
    """
    List all alerts
    
    Query Parameters:
    - include_resolved: Whether to include resolved alerts (default: False)
    """
    if include_resolved:
        alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    else:
        alerts = get_all_alerts(db, include_resolved=False)
    
    return alerts


@router.get("/unread", response_model=list[AlertResponse])
def list_unread_alerts(db: Session = Depends(get_db)):
    """Get all unread, unresolved alerts"""
    alerts = get_unread_alerts(db)
    return alerts


@router.get("/critical", response_model=list[AlertResponse])
def get_critical(db: Session = Depends(get_db)):
    """Get all critical alerts (expiring in 1-30 days)"""
    alerts = get_critical_alerts(db)
    return alerts


@router.get("/expired", response_model=list[AlertResponse])
def get_expired(db: Session = Depends(get_db)):
    """Get all expired alerts (already expired)"""
    alerts = get_expired_alerts(db)
    return alerts


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    """Get specific alert by ID"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/read", response_model=AlertResponse)
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    """Mark alert as read"""
    alert = mark_alert_read(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
def resolve(alert_id: int, db: Session = Depends(get_db)):
    """Resolve/close an alert"""
    alert = resolve_alert(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/test-sms")
def test_sms(phone_number: str = Query(..., description="Phone number to send test SMS")):
    """
    Test SMS functionality
    
    Sends a test SMS to verify SMS service is working.
    Useful before the actual expiry workflow triggers alerts.
    
    Query Parameters:
    - phone_number: Phone number to test (required, e.g., "+1234567890")
    
    Returns:
    {
        "success": bool,
        "message_id": string (if successful),
        "error": string (if failed),
        "provider": string (SMS provider used),
        "phone_number": string (phone that was tested)
    }
    """
    try:
        sms_service = get_sms_service()
        result = sms_service.send_test_sms(phone_number)
        
        return {
            "success": result["success"],
            "message_id": result["message_id"],
            "error": result["error"],
            "provider": sms_service.provider_name,
            "phone_number": phone_number,
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"SMS test failed: {str(e)}"
        )


@router.post("/retry-failed-sms")
def retry_failed_sms(
    limit: int = Query(10, ge=1, le=100, description="Max alerts to retry"),
    db: Session = Depends(get_db)
):
    """
    Retry sending SMS for failed alerts
    
    Useful for recovering from temporary SMS provider outages.
    
    Query Parameters:
    - limit: Maximum number of alerts to retry (default: 10, max: 100)
    
    Returns:
    {
        "retried": int (number of alerts retried),
        "message": string
    }
    """
    count = retry_failed_sms_alerts(db, limit=limit)
    
    return {
        "retried": count,
        "message": f"Retried SMS for {count} failed alerts"
    }


@router.get("/sms-status/summary")
def sms_status_summary(db: Session = Depends(get_db)):
    """
    Get SMS status summary
    
    Useful for monitoring SMS delivery health.
    
    Returns:
    {
        "total_alerts": int,
        "sms_sent": int,
        "sms_failed": int,
        "sms_pending": int,
        "sms_skipped": int
    }
    """
    total = db.query(Alert).count()
    sent = db.query(Alert).filter(Alert.sms_status == SMSStatus.SENT).count()
    failed = db.query(Alert).filter(Alert.sms_status == SMSStatus.FAILED).count()
    pending = db.query(Alert).filter(Alert.sms_status == SMSStatus.PENDING).count()
    skipped = db.query(Alert).filter(Alert.sms_status == SMSStatus.SKIPPED).count()
    
    return {
        "total_alerts": total,
        "sms_sent": sent,
        "sms_failed": failed,
        "sms_pending": pending,
        "sms_skipped": skipped,
    }
