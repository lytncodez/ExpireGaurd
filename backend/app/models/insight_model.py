"""Insight ORM Model - Store and track AI-generated insights"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    
    # Links
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True, index=True)
    
    # Content
    insight_type = Column(String(100), index=True)  # EXPIRY_RISK, SALES_TREND, ANOMALY, etc.
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), default="INFO", index=True)  # CRITICAL, WARNING, INFO
    recommendation = Column(Text, nullable=True)
    
    # Context and validation
    supporting_data = Column(JSON, nullable=True)  # Raw data that generated this insight
    ai_confidence = Column(String(50), default="MEDIUM")  # HIGH, MEDIUM, LOW
    validated = Column(String(50), default="PENDING")  # PENDING, VALID, INVALID
    
    # Lifecycle
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)  # When insight becomes outdated
    status = Column(String(50), default="ACTIVE", index=True)  # ACTIVE, ARCHIVED, SUPERSEDED
    
    # Relationships
    product = relationship("Product", foreign_keys=[product_id])
    batch = relationship("Batch", foreign_keys=[batch_id])
    
    def __repr__(self):
        return f"<Insight {self.id}: {self.title} ({self.severity})>"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "product_id": self.product_id,
            "batch_id": self.batch_id,
            "insight_type": self.insight_type,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "recommendation": self.recommendation,
            "ai_confidence": self.ai_confidence,
            "validated": self.validated,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
