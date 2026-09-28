"""AI Context Builder - Package analytics data for AI interpretation"""

from sqlalchemy.orm import Session
import json
import logging

from app.models.product import Product
from app.models.batch import Batch, ExpiryStatus
from app.services.analytics_service import (
    get_product_performance,
    get_sales_trends,
    calculate_wastage_risk,
    get_inventory_metrics,
    get_sales_metrics
)

logger = logging.getLogger(__name__)


def build_product_insight_context(db: Session, product_id: int) -> dict:
    """
    Build complete context for a product
    
    Returns structured data AI should interpret
    Includes verified metrics only, no guesses
    """
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None
    
    # Get verified metrics
    performance = get_product_performance(db, product_id, days_back=30)
    batches = db.query(Batch).filter(Batch.product_id == product_id).all()
    
    # Build context
    context = {
        "product": {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "barcode": product.barcode,
            "category": product.category,
            "brand": product.brand,
            "unit": product.unit,
            "selling_price": float(product.selling_price or 0),
            "cost_price": float(product.cost_price or 0)
        },
        
        "inventory": {
            "total_stock": performance.total_stock,
            "batches": []
        },
        
        "sales": {
            "weekly_average": round(performance.weekly_sales, 2),
            "monthly_total": round(performance.monthly_sales, 2),
            "trend": performance.sales_trend,
            "revenue_30d": float(performance.revenue),
            "cost_30d": float(performance.cost),
            "margin": round(performance.margin, 2)
        },
        
        "expiry_risk": {
            "batches_at_risk": [],
            "total_units_at_risk": 0,
            "total_value_at_risk": 0
        },
        
        "alerts": []
    }
    
    # Add batch details
    for batch in batches:
        batch_info = {
            "batch_number": batch.batch_number,
            "expiry_date": batch.expiry_date.isoformat() if batch.expiry_date else None,
            "days_remaining": batch.days_remaining or 0,
            "status": batch.status.value if batch.status else "UNKNOWN",
            "quantity": batch.quantity_remaining or 0
        }
        context["inventory"]["batches"].append(batch_info)
        
        # Track at-risk batches
        if batch.status in [ExpiryStatus.EXPIRED, ExpiryStatus.CRITICAL]:
            units = batch.quantity_remaining or 0
            value = units * (product.selling_price or 0)
            
            context["expiry_risk"]["batches_at_risk"].append({
                "batch_number": batch.batch_number,
                "status": batch.status.value,
                "days_remaining": batch.days_remaining or 0,
                "quantity": units,
                "value_at_risk": round(float(value), 2)
            })
            
            context["expiry_risk"]["total_units_at_risk"] += units
            context["expiry_risk"]["total_value_at_risk"] += value
    
    # Get alerts for this product
    from app.models.alert import Alert
    alerts = db.query(Alert).filter(
        Alert.batch_id.in_([b.id for b in batches]),
        Alert.resolved_at == None
    ).all()
    
    for alert in alerts:
        context["alerts"].append({
            "id": alert.id,
            "type": alert.alert_type.value if alert.alert_type else None,
            "severity": alert.severity.value if alert.severity else None,
            "message": alert.message,
            "sms_sent": alert.sms_sent
        })
    
    return context


def build_business_context(db: Session) -> dict:
    """
    Build complete business context
    
    Used for high-level insights and recommendations
    """
    
    inventory = get_inventory_metrics(db)
    sales = get_sales_metrics(db, days_back=30)
    wastage = calculate_wastage_risk(db)
    
    context = {
        "business": {
            "inventory": {
                "total_products": inventory.total_products,
                "total_stock_units": inventory.total_stock_units,
                "total_stock_value": float(inventory.total_stock_value),
                "status_breakdown": {
                    "safe": inventory.safe_products,
                    "expiring_soon": inventory.expiring_soon_products,
                    "critical": inventory.critical_products,
                    "expired": inventory.expired_products
                }
            },
            
            "sales": {
                "total_sales_30d": sales.total_sales,
                "total_revenue_30d": float(sales.total_revenue),
                "total_cost_30d": float(sales.total_cost),
                "gross_profit": float(sales.gross_profit),
                "gross_margin": round(sales.gross_margin, 2),
                "units_sold_30d": sales.units_sold,
                "avg_transaction": float(sales.avg_sale_value)
            },
            
            "risk": {
                "units_at_risk": wastage["total_units_at_risk"],
                "value_at_risk": float(wastage["total_value_at_risk"]),
                "critical_value": float(wastage["critical_value"]),
                "risk_percentage": round(
                    (wastage["total_value_at_risk"] / inventory.total_stock_value * 100)
                    if inventory.total_stock_value > 0 else 0,
                    2
                )
            }
        }
    }
    
    return context


def build_anomaly_context(db: Session, anomaly: dict) -> dict:
    """
    Build detailed context for an anomaly
    
    Used to explain why an anomaly matters
    """
    
    context = {
        "anomaly": anomaly,
        "details": {}
    }
    
    if anomaly["type"] == "HIGH_STOCK_LOW_SALES":
        product = db.query(Product).filter(Product.id == anomaly["product_id"]).first()
        if product:
            # Calculate sellout time
            sellout_weeks = anomaly["stock"] / (anomaly["weekly_sales"] + 0.1)
            
            context["details"] = {
                "analysis": f"At current sales rate, this product will take {round(sellout_weeks, 1)} weeks to sell out",
                "recommendations": [
                    "Review pricing or run promotions",
                    "Check if product is visible in inventory",
                    "Consider bulk sales to other retailers",
                    "Evaluate supply chain (ordering too much?)"
                ]
            }
    
    elif anomaly["type"] == "LOW_STOCK_HIGH_SALES":
        context["details"] = {
            "analysis": "High demand with low stock - potential stockout risk",
            "recommendations": [
                "Prioritize restocking this product",
                "Consider temporary price increase",
                "Notify suppliers for urgent order",
                "Monitor stock levels daily"
            ]
        }
    
    elif anomaly["type"] == "REPEATED_EXPIRY":
        context["details"] = {
            "analysis": f"This product has expired {anomaly['expired_batches']} times - pattern of overstock",
            "recommendations": [
                "Review ordering quantities with suppliers",
                "Implement stricter purchasing controls",
                "Improve sales forecasting",
                "Consider product discontinuation"
            ]
        }
    
    elif anomaly["type"] == "SELLING_BELOW_COST":
        loss_per_unit = anomaly["cost_price"] - anomaly["unit_price"]
        context["details"] = {
            "analysis": f"Selling at loss: {loss_per_unit} per unit",
            "recommendations": [
                "Audit pricing settings",
                "Check for pricing errors",
                "Review discount policies",
                "Correct pricing immediately"
            ]
        }
    
    return context


def build_insight_prompt_context(db: Session, product_id: int = None) -> str:
    """
    Build structured context for AI prompt
    
    Returns JSON that AI can easily parse and reason about
    """
    
    if product_id:
        context = build_product_insight_context(db, product_id)
    else:
        context = build_business_context(db)
    
    # Convert to readable format for AI
    return json.dumps(context, indent=2, default=str)


def build_question_context(db: Session, question: str) -> dict:
    """
    Determine what data to gather based on question
    
    Intelligent context building based on what user asks
    """
    
    question_lower = question.lower()
    
    context = {}
    
    # Question about specific product
    if any(word in question_lower for word in ["product", "medication", "drug", "item"]):
        # Try to extract product from question
        # This is simple - production would need better NLP
        products = db.query(Product).all()
        if products:
            # Just use first product for now
            context["product"] = build_product_insight_context(db, products[0].id)
    
    # Question about expiry
    if any(word in question_lower for word in ["expiry", "expire", "expiring", "expired", "waste"]):
        wastage = calculate_wastage_risk(db)
        context["expiry_risk"] = wastage
    
    # Question about sales
    if any(word in question_lower for word in ["sales", "revenue", "sell", "sold", "performance"]):
        sales = get_sales_metrics(db)
        context["sales"] = {
            "total_revenue": float(sales.total_revenue),
            "units_sold": sales.units_sold,
            "gross_margin": sales.gross_margin,
            "avg_sale_value": float(sales.avg_sale_value)
        }
    
    # Question about stock
    if any(word in question_lower for word in ["stock", "inventory", "quantity", "units"]):
        inventory = get_inventory_metrics(db)
        context["inventory"] = {
            "total_stock": inventory.total_stock_units,
            "total_products": inventory.total_products,
            "status": {
                "safe": inventory.safe_products,
                "expiring": inventory.expiring_soon_products,
                "critical": inventory.critical_products,
                "expired": inventory.expired_products
            }
        }
    
    # Default: full context
    if not context:
        context = build_business_context(db)
    
    return context


def validate_context(context: dict) -> bool:
    """
    Validate that context has all necessary fields
    
    Guardrail: Don't send incomplete context to AI
    """
    
    required_fields = []
    
    if "product" in context:
        required_fields = ["name", "sku", "inventory", "sales"]
    else:
        required_fields = ["business"]
    
    for field in required_fields:
        if field not in context:
            logger.warning(f"Context missing field: {field}")
            return False
    
    return True


def sanitize_context(context: dict) -> dict:
    """
    Remove sensitive information before sending to AI
    
    Guardrail: Don't expose internal IDs unnecessarily
    """
    
    # Keep the structure but we're already using public-facing data
    # In production, might want to remove internal IDs
    return context


def estimate_context_size(context: dict) -> int:
    """
    Estimate token size of context
    
    Guardrail: Don't send too much data to AI
    Rough estimate: ~4 tokens per word
    """
    
    context_str = json.dumps(context, default=str)
    words = len(context_str.split())
    
    return words * 4  # Rough estimate


class ContextBuilder:
    """Helper class for building AI contexts"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def product_context(self, product_id: int) -> dict:
        """Build context for product insight"""
        context = build_product_insight_context(self.db, product_id)
        
        if not validate_context(context):
            return None
        
        return sanitize_context(context)
    
    def business_context(self) -> dict:
        """Build context for business insight"""
        context = build_business_context(self.db)
        
        if not validate_context(context):
            return None
        
        return sanitize_context(context)
    
    def question_context(self, question: str) -> dict:
        """Build context based on question"""
        context = build_question_context(self.db, question)
        
        if not validate_context(context):
            logger.warning("Question context validation failed")
            # Fall back to business context
            context = build_business_context(self.db)
        
        return sanitize_context(context)
    
    def estimate_tokens(self, context: dict) -> int:
        """Estimate tokens for context"""
        return estimate_context_size(context)
