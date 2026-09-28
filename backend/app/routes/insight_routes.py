"""Insight Routes - AI Insights API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import logging

from app.core.database import get_db
from app.models.insight import Insight
from app.services.insight_service import (
    InsightGenerator,
    generate_product_insights,
    generate_business_insights,
    get_insights,
    delete_old_insights
)
from app.services.context_builder import (
    ContextBuilder,
    build_product_insight_context
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def list_insights(
    db: Session = Depends(get_db),
    product_id: int = Query(None, description="Filter by product"),
    insight_type: str = Query(None, description="Filter by type"),
    severity: str = Query(None, description="Filter by severity"),
    limit: int = Query(10, ge=1, le=100, description="Number of insights")
):
    """
    Get insights
    
    Query Parameters:
    - product_id: Filter to specific product
    - insight_type: Filter by type (EXPIRY_RISK, SALES_TREND, ANOMALY, etc.)
    - severity: Filter by severity (CRITICAL, WARNING, INFO)
    - limit: Max results (default 10, max 100)
    """
    
    query = db.query(Insight).filter(Insight.status == "ACTIVE")
    
    if product_id:
        query = query.filter(Insight.product_id == product_id)
    
    if insight_type:
        query = query.filter(Insight.insight_type == insight_type)
    
    if severity:
        query = query.filter(Insight.severity == severity)
    
    insights = query.order_by(Insight.created_at.desc()).limit(limit).all()
    
    return [insight.to_dict() for insight in insights]


@router.get("/{insight_id}")
def get_insight(insight_id: int, db: Session = Depends(get_db)):
    """Get specific insight by ID"""
    
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    return insight.to_dict()


@router.get("/product/{product_id}")
def get_product_insights(
    product_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    """Get all insights for a product"""
    
    # Check product exists
    from app.models.product import Product
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    insights = get_insights(db, product_id=product_id, limit=limit)
    
    return {
        "product_id": product_id,
        "product_name": product.name,
        "insights": [insight.to_dict() for insight in insights]
    }


@router.post("/generate/product/{product_id}")
def generate_product_insights_endpoint(
    product_id: int,
    db: Session = Depends(get_db)
):
    """
    Generate insights for a specific product
    
    This endpoint:
    1. Pulls product data
    2. Builds analytics context
    3. Calls Claude AI
    4. Stores insights in database
    5. Returns generated insights
    """
    
    try:
        # Verify product exists
        from app.models.product import Product
        product = db.query(Product).filter(Product.id == product_id).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Generate insights (this calls Claude)
        insights = generate_product_insights(db, product_id)
        
        if not insights:
            return {
                "product_id": product_id,
                "message": "Unable to generate insights at this time",
                "insights": []
            }
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "generated": len(insights),
            "insights": [insight.to_dict() for insight in insights]
        }
    
    except Exception as e:
        logger.error(f"Error generating product insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating insights: {str(e)}"
        )


@router.post("/generate/business")
def generate_business_insights_endpoint(db: Session = Depends(get_db)):
    """
    Generate high-level business insights
    
    This endpoint:
    1. Calculates business-wide analytics
    2. Detects anomalies
    3. Calls Claude for interpretation
    4. Stores insights in database
    5. Returns generated insights
    """
    
    try:
        # Generate insights (this calls Claude)
        insights = generate_business_insights(db)
        
        if not insights:
            return {
                "message": "Unable to generate insights at this time",
                "insights": []
            }
        
        return {
            "generated": len(insights),
            "insights": [insight.to_dict() for insight in insights]
        }
    
    except Exception as e:
        logger.error(f"Error generating business insights: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating insights: {str(e)}"
        )


@router.post("/ask")
def ask_question(
    question: str = Query(..., description="Your question about business data"),
    db: Session = Depends(get_db)
):
    """
    Ask Claude a question about your data
    
    Example questions:
    - "Why do we have so many expired products?"
    - "Which products are not selling well?"
    - "What is our profit margin?"
    - "Which products should we promote?"
    
    Claude will:
    1. Analyze your business data
    2. Answer based only on real numbers
    3. Cite evidence
    4. Acknowledge data limitations
    """
    
    try:
        # Build context based on question
        builder = ContextBuilder(db)
        context = builder.question_context(question)
        
        # Generate answer
        generator = InsightGenerator()
        answer = generator.generate_question_response(db, question, context)
        
        return {
            "question": question,
            "answer": answer
        }
    
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing question: {str(e)}"
        )


@router.get("/recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    limit: int = Query(5, ge=1, le=20)
):
    """
    Get AI-generated recommendations
    
    Returns insights with recommendations that the business should consider
    """
    
    recommendations = db.query(Insight).filter(
        Insight.status == "ACTIVE",
        Insight.recommendation != None,
        Insight.recommendation != ""
    ).order_by(
        Insight.created_at.desc()
    ).limit(limit).all()
    
    return {
        "count": len(recommendations),
        "recommendations": [
            {
                "id": r.id,
                "title": r.title,
                "type": r.insight_type,
                "severity": r.severity,
                "recommendation": r.recommendation,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in recommendations
        ]
    }


@router.get("/by-type/{insight_type}")
def get_insights_by_type(
    insight_type: str,
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    """Get insights filtered by type"""
    
    insights = db.query(Insight).filter(
        Insight.insight_type == insight_type,
        Insight.status == "ACTIVE"
    ).order_by(
        Insight.created_at.desc()
    ).limit(limit).all()
    
    return {
        "type": insight_type,
        "count": len(insights),
        "insights": [insight.to_dict() for insight in insights]
    }


@router.get("/by-severity/{severity}")
def get_insights_by_severity(
    severity: str,
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    """Get insights filtered by severity"""
    
    if severity.upper() not in ["CRITICAL", "WARNING", "INFO"]:
        raise HTTPException(status_code=400, detail="Invalid severity level")
    
    insights = db.query(Insight).filter(
        Insight.severity == severity.upper(),
        Insight.status == "ACTIVE"
    ).order_by(
        Insight.created_at.desc()
    ).limit(limit).all()
    
    return {
        "severity": severity.upper(),
        "count": len(insights),
        "insights": [insight.to_dict() for insight in insights]
    }


@router.post("/cleanup")
def cleanup_insights(
    days: int = Query(30, ge=1, description="Delete insights older than N days"),
    db: Session = Depends(get_db)
):
    """Clean up old insights (admin only)"""
    
    try:
        delete_old_insights(db, days=days)
        
        return {
            "message": f"Cleaned up insights older than {days} days"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error cleaning up insights: {str(e)}"
        )


@router.get("/stats")
def get_insight_statistics(db: Session = Depends(get_db)):
    """Get statistics about insights in the system"""
    
    total = db.query(Insight).count()
    critical = db.query(Insight).filter(Insight.severity == "CRITICAL").count()
    warning = db.query(Insight).filter(Insight.severity == "WARNING").count()
    info = db.query(Insight).filter(Insight.severity == "INFO").count()
    
    by_type = db.query(
        Insight.insight_type,
        Insight.insight_type  # Count
    ).group_by(Insight.insight_type).all()
    
    type_counts = {}
    for insight_type, _ in by_type:
        count = db.query(Insight).filter(
            Insight.insight_type == insight_type
        ).count()
        type_counts[insight_type] = count
    
    return {
        "total_insights": total,
        "by_severity": {
            "critical": critical,
            "warning": warning,
            "info": info
        },
        "by_type": type_counts
    }
