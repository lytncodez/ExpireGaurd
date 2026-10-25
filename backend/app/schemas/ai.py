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
    answer_mode: str = Field(default="data", description="'data' = only verified data; 'advice' = data plus general "
                             "business knowledge")


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


# --------------------------------------------------------------------------- files shared with the assistant


class DatasetRead(ORMModel):
    id: uuid.UUID
    filename: str
    file_type: str
    kind: str = Field(description="INVENTORY | SALES_HISTORY | OTHER")
    status: str = Field(description="PENDING | KEPT | IMPORTED")
    row_count: int
    columns: list[str]
    summary: dict[str, Any]
    import_job_id: uuid.UUID | None = None
    created_at: datetime
    can_import: bool = False
    preview_rows: list[dict[str, Any]] = Field(default_factory=list)

    @classmethod
    def from_model(cls, ds: Any, *, preview: int = 5) -> "DatasetRead":
        summary = {k: v for k, v in (ds.summary or {}).items() if k != "product_daily_avg"}
        return cls(
            id=ds.id, filename=ds.filename, file_type=ds.file_type, kind=getattr(ds.kind, "value", ds.kind),
            status=getattr(ds.status, "value", ds.status), row_count=ds.row_count, columns=ds.columns,
            summary=summary, import_job_id=ds.import_job_id, created_at=ds.created_at,
            can_import=getattr(ds.kind, "value", ds.kind) == "INVENTORY" and ds.content is not None,
            preview_rows=(ds.rows or [])[:preview],
        )


class DatasetImportResponse(BaseModel):
    dataset: DatasetRead
    job_id: uuid.UUID
    status: str
    total_rows: int
    batches_created: int
    products_created: int
    failed_rows: int
    duplicate_rows: int
    alerts_generated: int
    message: str


class ForecastProduct(BaseModel):
    product_id: str | None
    product: str
    source: str
    daily_rate: float
    forecast_units: int
    trend_pct: float | None
    stock: int
    days_of_cover: float | None
    reorder_units: int
    expected_revenue: float | None
    confidence: str
    history_weeks: int


class ForecastResponse(BaseModel):
    as_of: str
    horizon_days: int
    method: str
    products_count: int
    total_forecast_units: int
    total_expected_revenue: float
    reorder_count: int
    weekly_history: list[dict[str, Any]]
    projected_weekly_units: int
    products: list[ForecastProduct]
    notes: list[str]
    charts: list[dict[str, Any]] = Field(default_factory=list)
