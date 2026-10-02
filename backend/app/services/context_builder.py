"""Compatibility re-export for the AI context builder."""

from app.context_builder import (
    ContextBuilder,
    build_anomaly_context,
    build_business_context,
    build_insight_prompt_context,
    build_product_insight_context,
    build_question_context,
)

__all__ = [
    "ContextBuilder",
    "build_anomaly_context",
    "build_business_context",
    "build_insight_prompt_context",
    "build_product_insight_context",
    "build_question_context",
]
