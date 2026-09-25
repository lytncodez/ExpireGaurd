"""Alert generation service"""

from sqlalchemy.orm import Session
from app.models.batch import Batch, ExpiryStatus
from app.models.alert import Alert, AlertType


def create_alert_for_batch(db: Session, batch: Batch) -> Alert | None:
    """Create alert if batch status warrants it"""
    # Check if alert already exists for this batch
    existing = db.query(Alert).filter(
        Alert.batch_id == batch.id,
        Alert.is_read == False
    ).first()
    
    if existing:
        return existing  # Alert already exists
    
    # Determine alert type
    alert_type_map = {
        ExpiryStatus.CRITICAL: AlertType.CRITICAL,
        ExpiryStatus.EXPIRING_SOON: AlertType.EXPIRING_SOON,
        ExpiryStatus.EXPIRED: AlertType.EXPIRED,
    }
    
    if batch.status not in alert_type_map:
        return None  # No alert needed for SAFE status
    
    # Create alert
    message = f"{batch.product.name} (Batch {batch.batch_number}) - Status: {batch.status.value}"
    
    alert = Alert(
        batch_id=batch.id,
        alert_type=alert_type_map[batch.status],
        message=message,
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def generate_alerts_for_all_batches(db: Session):
    """Generate alerts for all batches that need them"""
    batches = db.query(Batch).all()
    for batch in batches:
        if batch.status in [ExpiryStatus.CRITICAL, ExpiryStatus.EXPIRING_SOON, ExpiryStatus.EXPIRED]:
            create_alert_for_batch(db, batch)


def mark_alert_read(db: Session, alert_id: int) -> Alert | None:
    """Mark alert as read"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_read = True
        db.commit()
        db.refresh(alert)
    return alert


def get_critical_alerts(db: Session):
    """Get all unread critical alerts"""
    return db.query(Alert).filter(
        Alert.alert_type == AlertType.CRITICAL,
        Alert.is_read == False
    ).order_by(Alert.created_at.desc()).all()


def get_expired_alerts(db: Session):
    """Get all unread expired alerts"""
    return db.query(Alert).filter(
        Alert.alert_type == AlertType.EXPIRED,
        Alert.is_read == False
    ).order_by(Alert.created_at.desc()).all()
