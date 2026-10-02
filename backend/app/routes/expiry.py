"""Expiry-related endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.batch import Batch, ExpiryStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.batch import BatchResponse
from app.services.expiry_service import update_batch_expiry_status

router = APIRouter(tags=["expiry"])


def _get_user_batches_query(db: Session, current_user: User):
    return db.query(Batch).join(Batch.product).filter(Batch.product.has(user_id=current_user.id))


@router.get("/expiry", response_model=list[BatchResponse])
def get_all_expiry(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return all batches with expiry status information for the authenticated user."""
    batches = _get_user_batches_query(db, current_user).all()
    for batch in batches:
        update_batch_expiry_status(db, batch)
    return batches


@router.get("/expiry/expired", response_model=list[BatchResponse])
def get_expired_batches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return expired batches for the authenticated user."""
    batches = _get_user_batches_query(db, current_user).filter(Batch.status == ExpiryStatus.EXPIRED).all()
    for batch in batches:
        update_batch_expiry_status(db, batch)
    return batches


@router.get("/expiry/critical", response_model=list[BatchResponse])
def get_critical_batches(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return critical batches for the authenticated user."""
    batches = _get_user_batches_query(db, current_user).filter(Batch.status == ExpiryStatus.CRITICAL).all()
    for batch in batches:
        update_batch_expiry_status(db, batch)
    return batches