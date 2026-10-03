"""
Import every model here.

WHY: SQLAlchemy and Alembic only know about tables whose classes have been
imported. Importing them all in one place guarantees nothing is missed.
"""
from app.models.ai_conversation import AiConversation, AiMessage
from app.models.alert import Alert, AlertSeverity, AlertType
from app.models.audit_log import AuditLog
from app.models.batch import Batch, BatchStatus
from app.models.category import Category
from app.models.company import Company
from app.models.import_job import ImportFileType, ImportJob, ImportStatus
from app.models.insight import Insight, InsightCategory
from app.models.inventory_movement import InventoryMovement, MovementType
from app.models.notification import Notification, NotificationChannel, NotificationStatus
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User, UserRole

__all__ = [
    "AiConversation", "AiMessage", "Alert", "AlertSeverity", "AlertType", "AuditLog",
    "Batch", "BatchStatus", "Category", "Company", "ImportFileType", "ImportJob",
    "ImportStatus", "Insight", "InsightCategory", "InventoryMovement", "MovementType",
    "Notification", "NotificationChannel", "NotificationStatus", "Product", "Sale",
    "User", "UserRole",
]
