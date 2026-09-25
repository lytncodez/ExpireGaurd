"""Dashboard and summary analytics"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.core.database import get_db
from app.models.batch import Batch, ExpiryStatus
from app.models.alert import Alert, AlertType
from app.models.sale import Sale
from app.models.product import Product

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db), user_id: int = 1):
    """Get dashboard summary stats"""
    
    # Get user's products
    products = db.query(Product).filter(Product.user_id == user_id).all()
    product_ids = [p.id for p in products]
    
    if not product_ids:
        return {
            "total_products": 0,
            "total_batches": 0,
            "safe_batches": 0,
            "expiring_soon": 0,
            "critical": 0,
            "expired": 0,
            "unread_alerts": 0,
            "total_sales_today": 0,
            "total_revenue_today": 0,
        }
    
    # Batch stats
    total_batches = db.query(Batch).filter(Batch.product_id.in_(product_ids)).count()
    safe = db.query(Batch).filter(
        Batch.product_id.in_(product_ids),
        Batch.status == ExpiryStatus.SAFE
    ).count()
    expiring = db.query(Batch).filter(
        Batch.product_id.in_(product_ids),
        Batch.status == ExpiryStatus.EXPIRING_SOON
    ).count()
    critical = db.query(Batch).filter(
        Batch.product_id.in_(product_ids),
        Batch.status == ExpiryStatus.CRITICAL
    ).count()
    expired = db.query(Batch).filter(
        Batch.product_id.in_(product_ids),
        Batch.status == ExpiryStatus.EXPIRED
    ).count()
    
    # Alert stats
    unread_alerts = db.query(Alert).join(Batch).filter(
        Batch.product_id.in_(product_ids),
        Alert.is_read == False
    ).count()
    
    # Sales stats (today)
    today = date.today()
    sales_today = db.query(Sale).filter(
        Sale.product_id.in_(product_ids),
        Sale.sale_date == today
    ).all()
    
    total_sales = sum(s.quantity_sold for s in sales_today)
    total_revenue = sum(s.revenue for s in sales_today)
    
    return {
        "total_products": len(products),
        "total_batches": total_batches,
        "safe_batches": safe,
        "expiring_soon": expiring,
        "critical": critical,
        "expired": expired,
        "unread_alerts": unread_alerts,
        "total_sales_today": total_sales,
        "total_revenue_today": total_revenue,
    }


@router.get("/insights")
def get_insights(db: Session = Depends(get_db), user_id: int = 1):
    """Get business insights"""
    products = db.query(Product).filter(Product.user_id == user_id).all()
    product_ids = [p.id for p in products]
    
    insights = []
    
    if product_ids:
        # Insight: High waste risk
        expired_count = db.query(Batch).filter(
            Batch.product_id.in_(product_ids),
            Batch.status == ExpiryStatus.EXPIRED
        ).count()
        if expired_count > 0:
            insights.append({
                "type": "waste_risk",
                "title": "High Waste Risk",
                "description": f"{expired_count} batches have expired",
                "severity": "high",
            })
        
        # Insight: Upcoming expiries
        critical_count = db.query(Batch).filter(
            Batch.product_id.in_(product_ids),
            Batch.status == ExpiryStatus.CRITICAL
        ).count()
        if critical_count > 0:
            insights.append({
                "type": "critical_expiry",
                "title": "Critical Expiry Alert",
                "description": f"{critical_count} batches expire within 30 days",
                "severity": "medium",
            })
    
    return {"insights": insights}
