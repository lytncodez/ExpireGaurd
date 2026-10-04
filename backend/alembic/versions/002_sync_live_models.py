"""Sync database columns with the live ORM models."""

from alembic import op
import sqlalchemy as sa


revision = "002_sync_live_models"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(), nullable=True))

    op.add_column("products", sa.Column("barcode", sa.String(), nullable=True))
    op.add_column("products", sa.Column("brand", sa.String(), nullable=True))
    op.add_column("products", sa.Column("unit", sa.String(), nullable=True))
    op.add_column("products", sa.Column("selling_price", sa.Float(), nullable=True))
    op.add_column("products", sa.Column("cost_price", sa.Float(), nullable=True))

    op.add_column("alerts", sa.Column("severity", sa.String(), nullable=False, server_default="LOW"))
    op.add_column("alerts", sa.Column("recipient_phone", sa.String(), nullable=True))
    op.add_column("alerts", sa.Column("sms_status", sa.String(), nullable=True, server_default="PENDING"))
    op.add_column("alerts", sa.Column("sms_sent", sa.Boolean(), nullable=True, server_default=sa.false()))
    op.add_column("alerts", sa.Column("sms_sent_at", sa.DateTime(), nullable=True))
    op.add_column("alerts", sa.Column("resolved_at", sa.DateTime(), nullable=True))
    op.add_column("alerts", sa.Column("sms_error", sa.String(), nullable=True))
    op.create_index("ix_alerts_severity", "alerts", ["severity"])
    op.create_index("ix_alerts_sms_status", "alerts", ["sms_status"])


def downgrade() -> None:
    op.drop_index("ix_alerts_sms_status", table_name="alerts")
    op.drop_index("ix_alerts_severity", table_name="alerts")
    op.drop_column("alerts", "sms_error")
    op.drop_column("alerts", "resolved_at")
    op.drop_column("alerts", "sms_sent_at")
    op.drop_column("alerts", "sms_sent")
    op.drop_column("alerts", "sms_status")
    op.drop_column("alerts", "recipient_phone")
    op.drop_column("alerts", "severity")

    op.drop_column("products", "cost_price")
    op.drop_column("products", "selling_price")
    op.drop_column("products", "unit")
    op.drop_column("products", "brand")
    op.drop_column("products", "barcode")
    op.drop_column("users", "phone")
