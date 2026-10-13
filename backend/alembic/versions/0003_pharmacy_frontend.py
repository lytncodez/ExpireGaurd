"""Tailor to the ExpiryGuard pharmacy frontend.

* roles become admin / dispenser (ADMIN->admin, MANAGER->admin, STAFF->dispenser)
* per-pharmacy risk bands and alert toggles, licence number
* batch receiving details (supplier, storage location, date received) and handling workflow
* product photo, user last login, per-batch activity history
* batch status EXPIRING_SOON is split into ACTION_REQUIRED / MONITOR (recomputed by the next expiry check)

Revision ID: 0003_pharmacy
Revises: 0002_ai
Create Date: 2026-10-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_pharmacy"
down_revision: Union[str, None] = "0002_ai"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TRUE = sa.text("true")


def upgrade() -> None:
    # --- users
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE users SET role = 'admin' WHERE role IN ('ADMIN', 'MANAGER')")
    op.execute("UPDATE users SET role = 'dispenser' WHERE role = 'STAFF'")

    # --- companies
    op.add_column("companies", sa.Column("license_number", sa.String(100), nullable=True))
    for name, default in (("critical_days", "7"), ("action_days", "30"), ("monitor_days", "60"), ("advisory_days", "90")):
        op.add_column("companies", sa.Column(name, sa.Integer(), nullable=False, server_default=default))
    for name in ("alert_expired", "alert_critical", "alert_action", "alert_monitor", "alert_advisory"):
        op.add_column("companies", sa.Column(name, sa.Boolean(), nullable=False, server_default=TRUE))
    op.alter_column("companies", "currency", server_default="GHS")

    # --- products
    op.add_column("products", sa.Column("photo", sa.Text(), nullable=True))

    # --- batches
    op.add_column("batches", sa.Column("supplier", sa.String(200), nullable=True))
    op.add_column("batches", sa.Column("storage_location", sa.String(120), nullable=True))
    op.add_column("batches", sa.Column("date_received", sa.Date(), nullable=True))
    op.add_column("batches", sa.Column("workflow_status", sa.String(20), nullable=False, server_default="ACTIVE"))
    op.add_column("batches", sa.Column("quarantine_reason", sa.String(20), nullable=True))
    op.add_column("batches", sa.Column("acknowledged_by", sa.Uuid(), nullable=True))
    op.add_column("batches", sa.Column("acknowledged_by_name", sa.String(200), nullable=True))
    op.add_column("batches", sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("batches", sa.Column("admin_flag", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("batches", sa.Column("supplier_return", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("batches", sa.Column("disposal", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_foreign_key(
        "fk_batches_acknowledged_by_users", "batches", "users", ["acknowledged_by"], ["id"], ondelete="SET NULL"
    )
    op.execute("UPDATE batches SET status = 'ACTION_REQUIRED' WHERE status = 'EXPIRING_SOON'")

    # --- activity history
    op.create_table(
        "batch_activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("batch_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("actor_name", sa.String(200), nullable=False),
        sa.Column("action", sa.String(200), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_batch_activities_company_id_companies", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["batch_id"], ["batches.id"], name="fk_batch_activities_batch_id_batches", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_batch_activities_user_id_users", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_batch_activities"),
    )
    op.create_index("ix_batch_activities_company_id", "batch_activities", ["company_id"])
    op.create_index("ix_batch_activities_batch_created", "batch_activities", ["batch_id", "created_at"])


def downgrade() -> None:
    op.drop_table("batch_activities")
    op.drop_constraint("fk_batches_acknowledged_by_users", "batches", type_="foreignkey")
    for col in ("disposal", "supplier_return", "admin_flag", "acknowledged_at", "acknowledged_by_name",
                "acknowledged_by", "quarantine_reason", "workflow_status", "date_received", "storage_location",
                "supplier"):
        op.drop_column("batches", col)
    op.execute("UPDATE batches SET status = 'EXPIRING_SOON' WHERE status IN ('ACTION_REQUIRED', 'MONITOR')")
    op.drop_column("products", "photo")
    for col in ("alert_advisory", "alert_monitor", "alert_action", "alert_critical", "alert_expired",
                "advisory_days", "monitor_days", "action_days", "critical_days", "license_number"):
        op.drop_column("companies", col)
    op.alter_column("companies", "currency", server_default="USD")
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'")
    op.execute("UPDATE users SET role = 'STAFF' WHERE role = 'dispenser'")
    op.drop_column("users", "last_login_at")
