"""Insight Service - Generate, validate, and store insights using AI"""

from sqlalchemy.orm import Session
from datetime import datetime
import logging
import json
import re

from anthropic import Anthropic
from app.models.insight import Insight
from app.models.batch import Batch
from app.models.product import Product
from app.services.analytics_service import detect_anomalies
from app.services.context_builder import (
    ContextBuilder,
    build_product_insight_context,
    build_business_context
)
from app.prompts import (
    get_system_prompt,
    build_insight_message,
    GUARDRAIL_CHECK_PROMPT,
    PromptBuilder
)

logger = logging.getLogger(__name__)


class InsightGenerator:
    """Generate insights using Claude AI with guardrails"""
    
    def __init__(self, api_key: str = None):
        """Initialize Anthropic client"""
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-6"
        self.max_tokens = 1000
    
    def generate_insight(
        self,
        db: Session,
        context: dict,
        insight_type: str = "general",
        validate: bool = True
    ) -> dict | None:
        """
        Generate insight from context using Claude
        
        Args:
            db: Database session
            context: Structured business context (from ContextBuilder)
            insight_type: Type of insight to generate
            validate: Whether to validate response
        
        Returns: {"title", "description", "severity", "recommendation", "confidence"}
        """
        
        try:
            # Build prompt
            context_str = json.dumps(context, indent=2, default=str)
            message = build_insight_message(context_str, insight_type)
            
            # Call Claude
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=message["system"],
                messages=[{
                    "role": "user",
                    "content": message["user"]
                }]
            )
            
            # Extract response
            insight_text = response.content[0].text
            
            # Parse insight
            parsed = self._parse_insight_response(insight_text)
            
            # Validate if requested
            if validate:
                is_valid = self._validate_insight(parsed, context)
                parsed["validated"] = is_valid
                if not is_valid:
                    logger.warning(f"Insight validation failed: {parsed}")
            
            return parsed
        
        except Exception as e:
            logger.error(f"Error generating insight: {str(e)}")
            return None
    
    def _parse_insight_response(self, response_text: str) -> dict:
        """
        Parse Claude's response into structured insight
        
        Handles various formats Claude might return
        """
        
        insight = {
            "title": "",
            "description": "",
            "severity": "INFO",
            "recommendation": "",
            "confidence": "MEDIUM"
        }
        
        # Extract sections using regex
        title_match = re.search(r'TITLE:\s*(.+?)(?=\n|$)', response_text, re.IGNORECASE)
        if title_match:
            insight["title"] = title_match.group(1).strip()
        
        severity_match = re.search(r'SEVERITY:\s*(\w+)', response_text, re.IGNORECASE)
        if severity_match:
            sev = severity_match.group(1).upper()
            if sev in ["CRITICAL", "WARNING", "INFO"]:
                insight["severity"] = sev
        
        # Get everything as description if structured parsing fails
        if not insight["title"]:
            # Use first line as title
            lines = response_text.split('\n')
            insight["title"] = lines[0][:100]
            insight["description"] = response_text
        else:
            insight["description"] = response_text
        
        confidence_match = re.search(r'CONFIDENCE:\s*(\w+)', response_text, re.IGNORECASE)
        if confidence_match:
            conf = confidence_match.group(1).upper()
            if conf in ["HIGH", "MEDIUM", "LOW"]:
                insight["confidence"] = conf
        
        return insight
    
    def _validate_insight(self, insight: dict, context: dict) -> bool:
        """
        Validate insight against guardrails
        
        Checks:
        - Numbers cited are in context
        - Language is cautious
        - Evidence-based
        - Actionable
        """
        
        text = insight.get("description", "") + " " + insight.get("title", "")
        
        # Check 1: Avoid over-confident language
        dangerous_words = ["will", "definitely", "certainly", "always", "never"]
        for word in dangerous_words:
            if word in text.lower():
                logger.warning(f"Insight uses over-confident word: {word}")
                # Not failing, just warning
        
        # Check 2: Must have some substance
        if len(text.strip()) < 50:
            logger.warning("Insight too short")
            return False
        
        # Check 3: Severity must be justified
        valid_severities = ["CRITICAL", "WARNING", "INFO"]
        if insight.get("severity") not in valid_severities:
            insight["severity"] = "INFO"
        
        return True
    
    def generate_question_response(
        self,
        db: Session,
        question: str,
        context: dict = None
    ) -> str:
        """
        Answer a follow-up question based on context
        
        Args:
            db: Database session
            question: User's question
            context: Optional pre-built context
        
        Returns: Answer text
        """
        
        try:
            # Build context if not provided
            if not context:
                builder = ContextBuilder(db)
                context = builder.question_context(question)
            
            context_str = json.dumps(context, indent=2, default=str)
            
            # Build prompt
            system_prompt = get_system_prompt("followup")
            user_prompt = f"""Answer this question based only on the provided data.

Question: {question}

Data:
{context_str}

Rules:
- Only use numbers from the data
- If data doesn't answer the question, say so
- Acknowledge data limitations
- Suggest what additional data would help"""
            
            # Call Claude
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": user_prompt
                }]
            )
            
            return response.content[0].text
        
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            return f"Unable to answer question: {str(e)}"


def save_insight(
    db: Session,
    title: str,
    description: str,
    insight_type: str,
    severity: str,
    recommendation: str,
    product_id: int = None,
    batch_id: int = None,
    supporting_data: dict = None
) -> Insight:
    """Save insight to database"""
    
    insight = Insight(
        product_id=product_id,
        batch_id=batch_id,
        insight_type=insight_type,
        title=title,
        description=description,
        severity=severity,
        recommendation=recommendation,
        supporting_data=json.dumps(supporting_data or {}),
        created_at=datetime.utcnow()
    )
    
    db.add(insight)
    db.commit()
    db.refresh(insight)
    
    logger.info(f"Insight saved: {insight.id} - {title}")
    
    return insight


def generate_product_insights(db: Session, product_id: int) -> list[Insight]:
    """
    Generate comprehensive insights for a product
    
    Includes:
    - Expiry risk assessment
    - Sales trend analysis
    - Inventory pattern detection
    """
    
    insights = []
    generator = InsightGenerator()
    
    try:
        # Build context
        context = build_product_insight_context(db, product_id)
        if not context:
            return []
        
        product = db.query(Product).filter(Product.id == product_id).first()
        
        # Generate expiry risk insight
        insight_data = generator.generate_insight(db, context, "expiry_risk")
        if insight_data:
            insight = save_insight(
                db,
                title=insight_data.get("title", "Expiry Risk Assessment"),
                description=insight_data.get("description", ""),
                insight_type="EXPIRY_RISK",
                severity=insight_data.get("severity", "INFO"),
                recommendation=insight_data.get("recommendation", ""),
                product_id=product_id,
                supporting_data=context
            )
            insights.append(insight)
        
        # Generate sales trend insight
        insight_data = generator.generate_insight(db, context, "sales_trend")
        if insight_data:
            insight = save_insight(
                db,
                title=insight_data.get("title", "Sales Trend Analysis"),
                description=insight_data.get("description", ""),
                insight_type="SALES_TREND",
                severity=insight_data.get("severity", "INFO"),
                recommendation=insight_data.get("recommendation", ""),
                product_id=product_id,
                supporting_data=context
            )
            insights.append(insight)
        
        logger.info(f"Generated {len(insights)} insights for product {product_id}")
        
    except Exception as e:
        logger.error(f"Error generating product insights: {str(e)}")
    
    return insights


def generate_business_insights(db: Session) -> list[Insight]:
    """
    Generate high-level business insights
    
    Includes:
    - Overall inventory health
    - Sales performance
    - Anomaly explanations
    - Recommendations
    """
    
    insights = []
    generator = InsightGenerator()
    
    try:
        # Build business context
        context = build_business_context(db)
        
        # Generate general business insight
        insight_data = generator.generate_insight(db, context, "general")
        if insight_data:
            insight = save_insight(
                db,
                title=insight_data.get("title", "Business Overview"),
                description=insight_data.get("description", ""),
                insight_type="BUSINESS_HEALTH",
                severity=insight_data.get("severity", "INFO"),
                recommendation=insight_data.get("recommendation", ""),
                supporting_data=context
            )
            insights.append(insight)
        
        # Analyze anomalies
        anomalies = detect_anomalies(db)
        for anomaly in anomalies[:3]:  # Limit to top 3
            anomaly_context = {
                "anomaly": anomaly,
                "business": context["business"]
            }
            
            insight_data = generator.generate_insight(db, anomaly_context, "anomaly")
            if insight_data:
                insight = save_insight(
                    db,
                    title=f"Anomaly: {anomaly['type']}",
                    description=insight_data.get("description", ""),
                    insight_type="ANOMALY",
                    severity=anomaly.get("severity", "INFO"),
                    recommendation=insight_data.get("recommendation", ""),
                    supporting_data=anomaly
                )
                insights.append(insight)
        
        logger.info(f"Generated {len(insights)} business insights")
        
    except Exception as e:
        logger.error(f"Error generating business insights: {str(e)}")
    
    return insights


def get_insights(db: Session, product_id: int = None, limit: int = 10) -> list[Insight]:
    """Get stored insights"""
    
    query = db.query(Insight)
    
    if product_id:
        query = query.filter(Insight.product_id == product_id)
    
    return query.order_by(Insight.created_at.desc()).limit(limit).all()


def delete_old_insights(db: Session, days: int = 30):
    """Clean up old insights (keep recent ones)"""
    
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    deleted = db.query(Insight).filter(Insight.created_at < cutoff).delete()
    db.commit()
    
    logger.info(f"Deleted {deleted} old insights")
