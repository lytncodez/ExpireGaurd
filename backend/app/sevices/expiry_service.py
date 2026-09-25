"""Expiry status calculation service"""

from datetime import date
from sqlalchemy.orm import Session
from app.models.batch import Batch, ExpiryStatus
from app.models.alert import Alert, AlertType


def calculate_days_remaining(expiry_date: date) -> int:
    """Calculate days remaining until expiry"""
    today = date.today()
    delta = expiry_date - today
    return delta.days


def get_expiry_status(days_remaining: int) -> ExpiryStatus:
    """Determine expiry status based on days remaining"""
    if days_remaining <= 0:
        return ExpiryStatus.EXPIRED
    elif 1 <= days_remaining <= 30:
        return ExpiryStatus.CRITICAL
    elif 31 <= days_remaining <= 90:
        return ExpiryStatus.EXPIRING_SOON
    else:
        return ExpiryStatus.SAFE


def update_batch_expiry_status(db: Session, batch: Batch) -> Batch:
    """Calculate and update batch expiry status"""
    days_remaining = calculate_days_remaining(batch.expiry_date)
    status = get_expiry_status(days_remaining)
    
    batch.days_remaining = days_remaining
    batch.status = status
    
    db.commit()
    db.refresh(batch)
    return batch


def update_all_batch_statuses(db: Session):
    """Update expiry status for all batches"""
    batches = db.query(Batch).all()
    for batch in batches:
        update_batch_expiry_status(db, batch)
