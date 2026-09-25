"""Insight ORM model - stores analytics insights"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date

from app.core.database import Base


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    insight_type = Column(String, nullable=False)  # e.g., "waste_projection", "sales_trend"
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    metric_value = Column(Float, nullable=True)
    metric_unit = Column(String, nullable=True)  # e.g., "units", "percentage", "currency"
    generated_at = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product")
