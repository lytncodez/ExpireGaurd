"""Import all models for Alembic auto-detection"""

from .user import User
from .product import Product
from .batch import Batch, ExpiryStatus
from .sale import Sale
from .alert import Alert, AlertType
from .insight import Insight

__all__ = [
    "User",
    "Product",
    "Batch",
    "ExpiryStatus",
    "Sale",
    "Alert",
    "AlertType",
    "Insight",
]
