"""Alert routes"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse
from app.services.alert_service import (
    mark_alert_read,
    get_critical_alerts,
    get_expired_alerts,
    generate_alerts_for_all_batches,
)

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
def list_alerts(db: Session = Depends(get_db)):
    """List all alerts"""
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).all()
    return alerts


@router.get("/critical", response_model=list[AlertResponse])
def get_critical(db: Session = Depends(get_db)):
    """Get critical alerts"""
    return get_critical_alerts(db)


@router.get("/expired", response_model=list[AlertResponse])
def get_expired(db: Session = Depends(get_db)):
    """Get expired alerts"""
    return get_expired_alerts(db)


@router.patch("/{alert_id}/read", response_model=AlertResponse)
def mark_read(alert_id: int, db: Session = Depends(get_db)):
    """Mark alert as read"""
    alert = mark_alert_read(db, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/refresh")
def refresh_alerts(db: Session = Depends(get_db)):
    """Recalculate all alerts (can be called periodically)"""
    generate_alerts_for_all_batches(db)
    return {"status": "alerts refreshed"}
