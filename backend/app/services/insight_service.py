"""Insight Service - Generate, validate, and store insights using AI."""

import json
import logging
import re
from datetime import datetime

from sqlalchemy.orm import Session

from anthropic import Anthropic
from app.models.batch import Batch
from app.models.insight import Insight
from app.models.product import Product
from app.prompts import (
    GUARDRAIL_CHECK_PROMPT,
    PromptBuilder,
    build_insight_message,
    get_system_prompt,
)
from app.services.analytics_service import detect_anomalies
from app.services.context_builder import ContextBuilder, build_business_context, build_product_insight_context

logger = logging.getLogger(__name__)


class InsightGenerator:
    """Generate insights using Claude AI with guardrails."""

    def __init__(self, api_key: str = None):
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-6"
        self.max_tokens = 1000

    def generate_insight(self, db: Session, context: dict, insight_type: str = "general", validate: bool = True) -> dict | None:
        try:
            context_str = json.dumps(context, indent=2, default=str)
            message = build_insight_message(context_str, insight_type)
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=message["system"],
                messages=[{"role": "user", "content": message["user"]}],
            )
            insight_text = response.content[0].text
            parsed = self._parse_insight_response(insight_text)
            if validate:
                is_valid = self._validate_insight(parsed, context)
                parsed["validated"] = is_valid
                if not is_valid:
                    logger.warning(f"Insight validation failed: {parsed}")
            return parsed
        except Exception as exc:
            logger.error(f"Error generating insight: {exc}")
            return None

    def _parse_insight_response(self, response_text: str) -> dict:
        insight = {"title": "", "description": "", "severity": "INFO", "recommendation": "", "confidence": "MEDIUM"}
        title_match = re.search(r"TITLE:\s*(.+?)(?=\n|$)", response_text, re.IGNORECASE)
        if title_match:
            insight["title"] = title_match.group(1).strip()
        severity_match = re.search(r"SEVERITY:\s*(\w+)", response_text, re.IGNORECASE)
        if severity_match:
            sev = severity_match.group(1).upper()
            if sev in ["CRITICAL", "WARNING", "INFO"]:
                insight["severity"] = sev
        if not insight["title"]:
            lines = response_text.split("\n")
            insight["title"] = lines[0][:100]
            insight["description"] = response_text
        else:
            insight["description"] = response_text
        confidence_match = re.search(r"CONFIDENCE:\s*(\w+)", response_text, re.IGNORECASE)
        if confidence_match:
            conf = confidence_match.group(1).upper()
            if conf in ["HIGH", "MEDIUM", "LOW"]:
                insight["confidence"] = conf
        return insight

    def _validate_insight(self, insight: dict, context: dict) -> bool:
        text = (insight.get("description", "") + " " + insight.get("title", "")).lower()
        for word in ["will", "definitely", "certainly", "always", "never"]:
            if word in text:
                logger.warning(f"Insight uses over-confident word: {word}")
        if len(text.strip()) < 50:
            logger.warning("Insight too short")
            return False
        valid_severities = ["CRITICAL", "WARNING", "INFO"]
        if insight.get("severity") not in valid_severities:
            insight["severity"] = "INFO"
        return True

    def generate_question_response(self, db: Session, question: str, context: dict = None) -> str:
        try:
            if not context:
                builder = ContextBuilder(db)
                context = builder.question_context(question)
            context_str = json.dumps(context, indent=2, default=str)
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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return response.content[0].text
        except Exception as exc:
            logger.error(f"Error answering question: {exc}")
            return f"Unable to answer question: {exc}"


def save_insight(db: Session, title: str, description: str, insight_type: str, severity: str, recommendation: str, product_id: int = None, batch_id: int = None, supporting_data: dict = None) -> Insight:
    insight = Insight(
        product_id=product_id,
        batch_id=batch_id,
        insight_type=insight_type,
        title=title,
        description=description,
        severity=severity,
        recommendation=recommendation,
        supporting_data=json.dumps(supporting_data or {}),
        created_at=datetime.utcnow(),
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    logger.info(f"Insight saved: {insight.id} - {title}")
    return insight


def generate_product_insights(db: Session, product_id: int) -> list[Insight]:
    return []


def generate_business_insights(db: Session) -> list[Insight]:
    return []


def get_insights(db: Session, product_id: int = None, limit: int = 10):
    query = db.query(Insight)
    if product_id is not None:
        query = query.filter(Insight.product_id == product_id)
    return query.order_by(Insight.created_at.desc()).limit(limit).all()


def delete_old_insights(db: Session, days_old: int = 90):
    return 0


def detect_product_anomalies(db: Session, product_id: int):
    return detect_anomalies(db, product_id)


def generate_insights_for_product(db: Session, product_id: int):
    return generate_product_insights(db, product_id)


def generate_insights_for_business(db: Session):
    return generate_business_insights(db)
