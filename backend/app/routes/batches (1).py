"""Batch CRUD routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.batch import Batch
from app.schemas.batch import BatchCreate, BatchUpdate, BatchResponse
from app.services.expiry_service import update_batch_expiry_status
from app.services.alert_service import create_alert_for_batch

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=list[BatchResponse])
def list_batches(db: Session = Depends(get_db)):
    """List all batches"""
    batches = db.query(Batch).all()
    return batches


@router.post("", response_model=BatchResponse)
def create_batch(batch_data: BatchCreate, db: Session = Depends(get_db)):
    """Create new batch"""
    db_batch = Batch(
        product_id=batch_data.product_id,
        batch_number=batch_data.batch_number,
        quantity_received=batch_data.quantity_received,
        quantity_remaining=batch_data.quantity_received,
        expiry_date=batch_data.expiry_date,
    )
    
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    
    # Calculate expiry status
    update_batch_expiry_status(db, db_batch)
    
    # Create alert if needed
    create_alert_for_batch(db, db_batch)
    
    return db_batch


@router.get("/{batch_id}", response_model=BatchResponse)
def get_batch(batch_id: int, db: Session = Depends(get_db)):
    """Get batch by ID"""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.patch("/{batch_id}", response_model=BatchResponse)
def update_batch(batch_id: int, batch_data: BatchUpdate, db: Session = Depends(get_db)):
    """Update batch (e.g., quantity remaining after sale)"""
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch_data.quantity_remaining is not None:
        batch.quantity_remaining = batch_data.quantity_remaining
    
    db.commit()
    db.refresh(batch)
    return batch
