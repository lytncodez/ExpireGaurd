"""Analytics Service - Calculate verified metrics from database"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from app.models.product import Product
from app.models.batch import Batch, ExpiryStatus
from app.models.sale import Sale
from app.models.alert import Alert

logger = logging.getLogger(__name__)


class InventoryMetrics:
    """Inventory-related metrics"""
    
    total_products: int
    total_stock_units: int
    total_stock_value: Decimal
    expired_products: int
    critical_products: int
    expiring_soon_products: int
    safe_products: int
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class SalesMetrics:
    """Sales-related metrics"""
    
    total_sales: int
    total_revenue: Decimal
    total_cost: Decimal
    gross_profit: Decimal
    gross_margin: float
    units_sold: int
    avg_sale_value: Decimal
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class ProductPerformance:
    """Individual product performance"""
    
    product_id: int
    product_name: str
    sku: str
    total_stock: int
    weekly_sales: float
    monthly_sales: float
    sales_trend: str  # "increasing", "declining", "stable"
    revenue: Decimal
    cost: Decimal
    margin: float
    batches_count: int
    expired_batches: int
    critical_batches: int
    
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


def get_inventory_metrics(db: Session) -> InventoryMetrics:
    """Calculate current inventory metrics"""
    
    # Total products (active)
    total_products = db.query(Product).filter(Product.is_active == True).count()
    
    # Total stock and value
    batches = db.query(Batch).all()
    total_stock_units = sum(b.quantity_remaining or 0 for b in batches)
    total_stock_value = sum(
        (b.quantity_remaining or 0) * (b.product.cost_price or 0)
        for b in batches
        if b.product
    )
    
    # Count by status
    expired_count = sum(1 for b in batches if b.status == ExpiryStatus.EXPIRED)
    critical_count = sum(1 for b in batches if b.status == ExpiryStatus.CRITICAL)
    expiring_soon_count = sum(1 for b in batches if b.status == ExpiryStatus.EXPIRING_SOON)
    safe_count = sum(1 for b in batches if b.status == ExpiryStatus.SAFE)
    
    # Get unique products affected
    expired_products = len(set(b.product_id for b in batches if b.status == ExpiryStatus.EXPIRED))
    critical_products = len(set(b.product_id for b in batches if b.status == ExpiryStatus.CRITICAL))
    expiring_soon_products = len(set(b.product_id for b in batches if b.status == ExpiryStatus.EXPIRING_SOON))
    safe_products = len(set(b.product_id for b in batches if b.status == ExpiryStatus.SAFE))
    
    return InventoryMetrics(
        total_products=total_products,
        total_stock_units=total_stock_units,
        total_stock_value=Decimal(str(total_stock_value)),
        expired_products=expired_products,
        critical_products=critical_products,
        expiring_soon_products=expiring_soon_products,
        safe_products=safe_products
    )


def get_sales_metrics(db: Session, days_back: int = 30) -> SalesMetrics:
    """Calculate sales metrics"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    
    sales = db.query(Sale).filter(Sale.sold_at >= cutoff_date).all()
    
    total_sales = len(sales)
    total_revenue = sum(s.total_amount or 0 for s in sales)
    units_sold = sum(s.quantity or 0 for s in sales)
    
    # Calculate cost
    total_cost = sum(
        (s.quantity or 0) * (s.product.cost_price or 0)
        for s in sales
        if s.product
    )
    
    gross_profit = total_revenue - total_cost
    gross_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0
    avg_sale_value = (total_revenue / total_sales) if total_sales > 0 else Decimal(0)
    
    return SalesMetrics(
        total_sales=total_sales,
        total_revenue=Decimal(str(total_revenue)),
        total_cost=Decimal(str(total_cost)),
        gross_profit=Decimal(str(gross_profit)),
        gross_margin=float(gross_margin),
        units_sold=units_sold,
        avg_sale_value=Decimal(str(avg_sale_value))
    )


def get_product_performance(db: Session, product_id: int, days_back: int = 30) -> ProductPerformance:
    """Get performance metrics for a specific product"""
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None
    
    # Current stock
    batches = db.query(Batch).filter(Batch.product_id == product_id).all()
    total_stock = sum(b.quantity_remaining or 0 for b in batches)
    
    # Sales metrics
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    sales = db.query(Sale).filter(
        Sale.product_id == product_id,
        Sale.sold_at >= cutoff_date
    ).all()
    
    weekly_sales = len(sales) / (days_back / 7)
    monthly_sales = len(sales) / (days_back / 30)
    
    # Revenue and cost
    revenue = sum(s.total_amount or 0 for s in sales)
    cost = sum((s.quantity or 0) * (product.cost_price or 0) for s in sales)
    margin = (revenue - cost) / revenue * 100 if revenue > 0 else 0
    
    # Batch status
    expired_batches = sum(1 for b in batches if b.status == ExpiryStatus.EXPIRED)
    critical_batches = sum(1 for b in batches if b.status == ExpiryStatus.CRITICAL)
    
    # Determine trend
    if days_back >= 14:
        # Compare first half vs second half
        mid_date = cutoff_date + timedelta(days=days_back/2)
        first_half = db.query(Sale).filter(
            Sale.product_id == product_id,
            Sale.sold_at >= cutoff_date,
            Sale.sold_at < mid_date
        ).count()
        second_half = db.query(Sale).filter(
            Sale.product_id == product_id,
            Sale.sold_at >= mid_date,
            Sale.sold_at <= datetime.utcnow()
        ).count()
        
        if second_half > first_half * 1.1:
            trend = "increasing"
        elif second_half < first_half * 0.9:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "unknown"
    
    return ProductPerformance(
        product_id=product_id,
        product_name=product.name,
        sku=product.sku,
        total_stock=total_stock,
        weekly_sales=weekly_sales,
        monthly_sales=monthly_sales,
        sales_trend=trend,
        revenue=Decimal(str(revenue)),
        cost=Decimal(str(cost)),
        margin=float(margin),
        batches_count=len(batches),
        expired_batches=expired_batches,
        critical_batches=critical_batches
    )


def get_all_products_performance(db: Session, days_back: int = 30) -> list[ProductPerformance]:
    """Get performance metrics for all products"""
    
    products = db.query(Product).filter(Product.is_active == True).all()
    
    performances = []
    for product in products:
        perf = get_product_performance(db, product.id, days_back)
        if perf:
            performances.append(perf)
    
    return performances


def get_sales_trends(db: Session, period: str = "daily") -> dict:
    """
    Calculate sales trends
    
    period: "daily" | "weekly" | "monthly"
    """
    
    if period == "daily":
        days = 30
        group_by = "date"
    elif period == "weekly":
        days = 90
        group_by = "week"
    elif period == "monthly":
        days = 365
        group_by = "month"
    else:
        return {}
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    sales = db.query(Sale).filter(Sale.sold_at >= cutoff_date).all()
    
    # Group by period
    trends = {}
    for sale in sales:
        if group_by == "date":
            key = sale.sold_at.date()
        elif group_by == "week":
            key = sale.sold_at.isocalendar()[1]  # Week number
        elif group_by == "month":
            key = sale.sold_at.strftime("%Y-%m")
        
        if key not in trends:
            trends[key] = {
                "revenue": 0,
                "units": 0,
                "count": 0
            }
        
        trends[key]["revenue"] += sale.total_amount or 0
        trends[key]["units"] += sale.quantity or 0
        trends[key]["count"] += 1
    
    return trends


def detect_anomalies(db: Session) -> list[dict]:
    """Detect unusual patterns in inventory and sales"""
    
    anomalies = []
    
    # Check 1: High stock + Low sales
    products = get_all_products_performance(db, days_back=30)
    for product in products:
        if product.total_stock > 500 and product.weekly_sales < 10:
            anomalies.append({
                "type": "HIGH_STOCK_LOW_SALES",
                "product_id": product.product_id,
                "product_name": product.product_name,
                "stock": product.total_stock,
                "weekly_sales": product.weekly_sales,
                "severity": "MEDIUM"
            })
    
    # Check 2: Low stock + High sales
    for product in products:
        if product.total_stock < 50 and product.weekly_sales > 30:
            anomalies.append({
                "type": "LOW_STOCK_HIGH_SALES",
                "product_id": product.product_id,
                "product_name": product.product_name,
                "stock": product.total_stock,
                "weekly_sales": product.weekly_sales,
                "severity": "HIGH"
            })
    
    # Check 3: Repeated expiry
    batches = db.query(Batch).all()
    product_expiry_count = {}
    for batch in batches:
        if batch.status == ExpiryStatus.EXPIRED:
            if batch.product_id not in product_expiry_count:
                product_expiry_count[batch.product_id] = 0
            product_expiry_count[batch.product_id] += 1
    
    for product_id, count in product_expiry_count.items():
        if count >= 3:  # 3 or more expired batches
            product = db.query(Product).filter(Product.id == product_id).first()
            anomalies.append({
                "type": "REPEATED_EXPIRY",
                "product_id": product_id,
                "product_name": product.name if product else "Unknown",
                "expired_batches": count,
                "severity": "WARNING"
            })
    
    # Check 4: Price anomalies (selling below cost)
    sales = db.query(Sale).all()
    for sale in sales:
        if sale.product and sale.unit_price < sale.product.cost_price:
            anomalies.append({
                "type": "SELLING_BELOW_COST",
                "product_id": sale.product_id,
                "product_name": sale.product.name,
                "unit_price": sale.unit_price,
                "cost_price": sale.product.cost_price,
                "severity": "CRITICAL"
            })
    
    return anomalies


def calculate_wastage_risk(db: Session) -> dict:
    """Calculate potential wastage (expiry loss value)"""
    
    batches = db.query(Batch).filter(
        Batch.status.in_([ExpiryStatus.CRITICAL, ExpiryStatus.EXPIRED])
    ).all()
    
    total_units_at_risk = 0
    total_value_at_risk = Decimal(0)
    critical_value = Decimal(0)
    
    for batch in batches:
        if batch.product:
            units = batch.quantity_remaining or 0
            value = units * (batch.product.selling_price or 0)
            
            total_units_at_risk += units
            total_value_at_risk += Decimal(str(value))
            
            if batch.status == ExpiryStatus.CRITICAL:
                critical_value += Decimal(str(value))
    
    return {
        "total_units_at_risk": total_units_at_risk,
        "total_value_at_risk": total_value_at_risk,
        "critical_value": critical_value,
        "critical_units": sum(
            b.quantity_remaining or 0
            for b in batches
            if b.status == ExpiryStatus.CRITICAL
        )
    }


def get_dashboard_summary(db: Session) -> dict:
    """Get all metrics for dashboard"""
    
    inventory = get_inventory_metrics(db)
    sales = get_sales_metrics(db)
    anomalies = detect_anomalies(db)
    wastage = calculate_wastage_risk(db)
    
    return {
        "inventory": {
            "total_products": inventory.total_products,
            "total_stock_units": inventory.total_stock_units,
            "total_stock_value": float(inventory.total_stock_value),
            "expired": inventory.expired_products,
            "critical": inventory.critical_products,
            "expiring_soon": inventory.expiring_soon_products,
            "safe": inventory.safe_products
        },
        "sales": {
            "total_sales": sales.total_sales,
            "total_revenue": float(sales.total_revenue),
            "total_cost": float(sales.total_cost),
            "gross_profit": float(sales.gross_profit),
            "gross_margin": sales.gross_margin,
            "units_sold": sales.units_sold,
            "avg_sale_value": float(sales.avg_sale_value)
        },
        "risk": {
            "total_units_at_risk": wastage["total_units_at_risk"],
            "total_value_at_risk": float(wastage["total_value_at_risk"]),
            "critical_value": float(wastage["critical_value"])
        },
        "anomalies_count": len(anomalies),
        "anomalies": anomalies[:5]  # Top 5 anomalies
    }
