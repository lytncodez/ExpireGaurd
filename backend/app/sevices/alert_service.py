"""Alert Service - Generate alerts and send SMS notifications"""

from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.models.batch import Batch, ExpiryStatus
from app.models.alert import Alert, AlertType, AlertSeverity, SMSStatus
from app.services.expiry_service import update_batch_expiry_status
from app.services.sms_service import get_sms_service

logger = logging.getLogger(__name__)


def map_status_to_alert_type(status: ExpiryStatus) -> AlertType | None:
    """Map expiry status to alert type"""
    mapping = {
        ExpiryStatus.CRITICAL: AlertType.CRITICAL,
        ExpiryStatus.EXPIRING_SOON: AlertType.EXPIRING_SOON,
        ExpiryStatus.EXPIRED: AlertType.EXPIRED,
    }
    return mapping.get(status)


def map_alert_type_to_severity(alert_type: AlertType) -> AlertSeverity:
    """Map alert type to severity level"""
    mapping = {
        AlertType.EXPIRED: AlertSeverity.HIGH,
        AlertType.CRITICAL: AlertSeverity.MEDIUM,
        AlertType.EXPIRING_SOON: AlertSeverity.LOW,
    }
    return mapping.get(alert_type, AlertSeverity.LOW)


def should_create_alert(batch: Batch) -> bool:
    """
    Check if alert should be created for this batch
    
    Do NOT create alerts for:
    - SAFE status (no risk)
    - Already existing unresolved alert of same type
    """
    if batch.status == ExpiryStatus.SAFE:
        return False
    
    return True


def get_or_create_alert(db: Session, batch: Batch, recipient_phone: str = None) -> Alert | None:
    """
    Get existing alert or create new one for batch
    
    Rules:
    - Only one active alert per batch/alert_type
    - Update existing alert if status changed
    - Create new alert if needed
    """
    
    # Check if alert should exist
    if not should_create_alert(batch):
        # Mark any existing alerts as resolved
        existing = db.query(Alert).filter(
            Alert.batch_id == batch.id,
            Alert.resolved_at == None
        ).all()
        for alert in existing:
            alert.resolved_at = datetime.utcnow()
        db.commit()
        return None
    
    # Map status to alert type
    alert_type = map_status_to_alert_type(batch.status)
    if not alert_type:
        return None
    
    # Check if alert already exists
    existing_alert = db.query(Alert).filter(
        Alert.batch_id == batch.id,
        Alert.alert_type == alert_type,
        Alert.resolved_at == None
    ).first()
    
    if existing_alert:
        # Update existing alert
        existing_alert.message = generate_alert_message(batch)
        existing_alert.recipient_phone = recipient_phone
        db.commit()
        db.refresh(existing_alert)
        return existing_alert
    
    # Create new alert
    severity = map_alert_type_to_severity(alert_type)
    message = generate_alert_message(batch)
    
    alert = Alert(
        batch_id=batch.id,
        alert_type=alert_type,
        severity=severity,
        message=message,
        recipient_phone=recipient_phone,
        sms_status=SMSStatus.PENDING,
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    logger.info(f"Alert created: {alert.id} for batch {batch.id} - {alert_type.value}")
    
    return alert


def generate_alert_message(batch: Batch) -> str:
    """Generate human-readable alert message"""
    product_name = batch.product.name if batch.product else "Unknown Product"
    days = batch.days_remaining or 0
    
    if batch.status == ExpiryStatus.EXPIRED:
        return f"{product_name} (Batch {batch.batch_number}) - EXPIRED. Remove from inventory."
    elif batch.status == ExpiryStatus.CRITICAL:
        return f"{product_name} (Batch {batch.batch_number}) - CRITICAL: {days} days remaining. Urgent action required."
    elif batch.status == ExpiryStatus.EXPIRING_SOON:
        return f"{product_name} (Batch {batch.batch_number}) - Expiring soon: {days} days remaining."
    else:
        return f"{product_name} (Batch {batch.batch_number}) - Status: {batch.status.value}"


def send_alert_sms(db: Session, alert: Alert) -> bool:
    """
    Send SMS for alert
    
    Returns: True if sent successfully or skipped, False if failed
    """
    
    # Skip if no phone number
    if not alert.recipient_phone:
        alert.sms_status = SMSStatus.SKIPPED
        db.commit()
        logger.info(f"Alert {alert.id}: No phone number, SMS skipped")
        return True
    
    # Skip if already sent
    if alert.sms_sent:
        logger.info(f"Alert {alert.id}: SMS already sent, skipping")
        return True
    
    # Send SMS
    try:
        sms_service = get_sms_service()
        
        result = sms_service.send_alert_sms(
            phone_number=alert.recipient_phone,
            product_name=alert.batch.product.name if alert.batch.product else "Product",
            status=alert.alert_type.value,
            days_remaining=alert.batch.days_remaining or 0
        )
        
        if result["success"]:
            alert.sms_status = SMSStatus.SENT
            alert.sms_sent = True
            alert.sms_sent_at = datetime.utcnow()
            db.commit()
            logger.info(f"Alert {alert.id}: SMS sent successfully")
            return True
        else:
            alert.sms_status = SMSStatus.FAILED
            alert.sms_error = result.get("error", "Unknown error")
            db.commit()
            logger.error(f"Alert {alert.id}: SMS failed - {alert.sms_error}")
            return False
    
    except Exception as e:
        logger.error(f"Alert {alert.id}: SMS error - {str(e)}")
        alert.sms_status = SMSStatus.FAILED
        alert.sms_error = str(e)
        db.commit()
        return False


def process_batch_alerts(db: Session, batch: Batch, recipient_phone: str = None):
    """
    Process alerts for a batch:
    1. Update batch expiry status
    2. Create/update alert if needed
    3. Send SMS if needed
    """
    
    # Step 1: Update expiry status
    update_batch_expiry_status(db, batch)
    
    # Step 2: Create/update alert
    alert = get_or_create_alert(db, batch, recipient_phone)
    
    if not alert:
        logger.info(f"Batch {batch.id}: No alert needed (status: {batch.status.value})")
        return None
    
    # Step 3: Send SMS
    send_alert_sms(db, alert)
    
    return alert


def mark_alert_read(db: Session, alert_id: int) -> Alert | None:
    """Mark alert as read"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.is_read = True
        db.commit()
        db.refresh(alert)
        logger.info(f"Alert {alert_id} marked as read")
    return alert


def resolve_alert(db: Session, alert_id: int) -> Alert | None:
    """Resolve/close an alert"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if alert:
        alert.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)
        logger.info(f"Alert {alert_id} resolved")
    return alert


def get_all_alerts(db: Session, include_resolved: bool = False):
    """Get all alerts"""
    query = db.query(Alert)
    
    if not include_resolved:
        query = query.filter(Alert.resolved_at == None)
    
    return query.order_by(Alert.created_at.desc()).all()


def get_unread_alerts(db: Session):
    """Get all unread alerts"""
    return db.query(Alert).filter(
        Alert.is_read == False,
        Alert.resolved_at == None
    ).order_by(Alert.created_at.desc()).all()


def get_critical_alerts(db: Session):
    """Get all critical alerts (unresolved, unread)"""
    return db.query(Alert).filter(
        Alert.alert_type == AlertType.CRITICAL,
        Alert.is_read == False,
        Alert.resolved_at == None
    ).order_by(Alert.created_at.desc()).all()


def get_expired_alerts(db: Session):
    """Get all expired alerts (unresolved, unread)"""
    return db.query(Alert).filter(
        Alert.alert_type == AlertType.EXPIRED,
        Alert.is_read == False,
        Alert.resolved_at == None
    ).order_by(Alert.created_at.desc()).all()


def get_alerts_by_severity(db: Session, severity: AlertSeverity):
    """Get alerts by severity level"""
    return db.query(Alert).filter(
        Alert.severity == severity,
        Alert.resolved_at == None
    ).order_by(Alert.created_at.desc()).all()


def get_alerts_by_sms_status(db: Session, sms_status: SMSStatus):
    """Get alerts by SMS status (for debugging)"""
    return db.query(Alert).filter(
        Alert.sms_status == sms_status
    ).order_by(Alert.created_at.desc()).all()


def retry_failed_sms_alerts(db: Session, limit: int = 10) -> int:
    """
    Retry sending SMS for failed alerts
    Useful for background job to retry periodically
    
    Returns: Number of alerts retried
    """
    failed_alerts = db.query(Alert).filter(
        Alert.sms_status == SMSStatus.FAILED,
        Alert.resolved_at == None
    ).limit(limit).all()
    
    count = 0
    for alert in failed_alerts:
        if send_alert_sms(db, alert):
            count += 1
    
    logger.info(f"Retried SMS for {count} failed alerts")
    return count
