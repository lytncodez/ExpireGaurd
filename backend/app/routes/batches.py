"""Batch CRUD routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.batch import Batch, ExpiryStatus
from app.models.product import Product
from app.schemas.batch import BatchCreate, BatchUpdate, BatchResponse
from app.services.expiry_service import update_batch_expiry_status
from app.services.alert_service import create_alert_for_batch

router = APIRouter(prefix="/batches", tags=["batches"])


@router.get("", response_model=list[BatchResponse])
def list_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all batches"""
    batches = db.query(Batch).join(Batch.product).filter(Batch.product.has(user_id=current_user.id)).all()
    return batches


@router.post("", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create new batch"""
    product = db.query(Product).filter(Product.id == batch_data.product_id, Product.user_id == current_user.id).first()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

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
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get batch by ID"""
    batch = db.query(Batch).join(Batch.product).filter(Batch.id == batch_id, Batch.product.has(user_id=current_user.id)).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@router.patch("/{batch_id}", response_model=BatchResponse)
def update_batch(
    batch_id: int,
    batch_data: BatchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update batch (e.g., quantity remaining after sale)"""
    batch = db.query(Batch).join(Batch.product).filter(Batch.id == batch_id, Batch.product.has(user_id=current_user.id)).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    if batch_data.quantity_remaining is not None:
        batch.quantity_remaining = batch_data.quantity_remaining

    if batch_data.status is not None:
        normalized_status = batch_data.status.strip()
        try:
            batch.status = ExpiryStatus(normalized_status)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid batch status") from exc

    if batch_data.status is None:
        update_batch_expiry_status(db, batch)
    else:
        db.commit()
        db.refresh(batch)
        return batch
    
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{batch_id}", status_code=204)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a batch."""
    batch = db.query(Batch).join(Batch.product).filter(Batch.id == batch_id, Batch.product.has(user_id=current_user.id)).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    db.delete(batch)
    db.commit()
    return None
