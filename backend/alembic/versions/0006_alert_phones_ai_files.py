"""Extra SMS alert numbers, daily email switch, and files shared with the AI assistant.

Revision ID: 0006_alert_phones_ai_files
Revises: 0005_email
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_alert_phones_ai_files"
down_revision: Union[str, None] = "0005_email"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NOW = sa.text("now()")


def upgrade() -> None:
    op.add_column("companies", sa.Column("alert_phones", postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                                         server_default=sa.text("'[]'::jsonb")))
    op.add_column("companies", sa.Column("email_digest_enabled", sa.Boolean(), nullable=False,
                                         server_default=sa.text("true")))

    op.create_table(
        "ai_datasets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("company_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(8), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="PENDING"),
        sa.Column("row_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("columns", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("rows", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=True),
        sa.Column("import_job_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=NOW),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], name="fk_ai_datasets_company_id_companies",
                                ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_ai_datasets_user_id_users", ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["import_job_id"], ["import_jobs.id"], name="fk_ai_datasets_import_job_id_import_jobs",
                                ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_ai_datasets"),
    )
    op.create_index("ix_ai_datasets_company_id", "ai_datasets", ["company_id"])
    op.create_index("ix_ai_datasets_company_created", "ai_datasets", ["company_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_datasets_company_created", table_name="ai_datasets")
    op.drop_index("ix_ai_datasets_company_id", table_name="ai_datasets")
    op.drop_table("ai_datasets")
    op.drop_column("companies", "email_digest_enabled")
    op.drop_column("companies", "alert_phones")
