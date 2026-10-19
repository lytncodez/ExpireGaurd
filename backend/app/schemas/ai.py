"""AI chat contracts."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.ai_conversation import MessageRole
from app.schemas import ORMModel
from app.schemas.insights import EvidenceItem


class SeasonalProductRecommendation(BaseModel):
    product_id: str
    product: str
    current_stock: int
    recommended_order_qty: int
    sold_last_season: int
    sell_through_speed: str
    confidence: str  # High | Medium | Low
    why: str
    cost_ghs: float
    cold_start: bool = False


class SeasonalRecommendationCard(BaseModel):
    season_name: str
    date_range: str
    products: list[SeasonalProductRecommendation]
    estimated_total_cost_ghs: float
    disclaimer: str = "The AI only recommends. It never places orders automatically."
    cold_start_note: str | None = None


class ModelChatOutput(BaseModel):
    """What the LLM must return for a chat turn."""

    model_config = ConfigDict(extra="forbid")

    answer: str = Field(min_length=1, max_length=6000)
    evidence: list[EvidenceItem] = Field(default_factory=list, max_length=30)
    insufficient_evidence: bool = False
    follow_up_suggestions: list[str] = Field(default_factory=list, max_length=5)
    seasonal_card: SeasonalRecommendationCard | None = None
    charts: list[dict[str, Any]] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: uuid.UUID | None = Field(default=None, description="Omit to start a new conversation")


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    intent: str
    answer: str
    evidence: list[EvidenceItem]
    insufficient_evidence: bool
    follow_up_suggestions: list[str]
    grounded: bool = Field(description="Every number in the answer was verified against the supplied context")
    fallback_used: bool = Field(description="AI output failed validation; a deterministic grounded answer was returned")
    provider: str
    model: str
    seasonal_card: SeasonalRecommendationCard | None = None
    data_sources_used: list[str] = Field(default_factory=list)
    tools_invoked: list[str] = Field(default_factory=list)
    charts: list[dict[str, Any]] = Field(default_factory=list)


class MessageRead(ORMModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="meta")
    created_at: datetime


class ConversationRead(ORMModel):
    id: uuid.UUID
    title: str | None
    is_pinned: bool = False
    created_at: datetime
    updated_at: datetime


class ConversationUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    is_pinned: bool | None = None


class ConversationDetail(ConversationRead):
    messages: list[MessageRead]


class AIStatus(BaseModel):
    provider: str
    model: str
    is_mock: bool
    configured_provider: str
    fallback_reason: str | None = Field(description="Why the mock provider is used instead of the configured one")
