"""Sync sales columns with the live ORM model."""

from alembic import op
import sqlalchemy as sa


revision = "003_sync_sales_model"
down_revision = "002_sync_live_models"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("sales") as batch_op:
        batch_op.alter_column("quantity_sold", new_column_name="quantity")
        batch_op.alter_column("revenue", new_column_name="total_amount")
        batch_op.alter_column(
            "sale_date",
            new_column_name="sold_at",
            existing_type=sa.Date(),
            type_=sa.DateTime(),
        )


def downgrade() -> None:
    with op.batch_alter_table("sales") as batch_op:
        batch_op.alter_column("quantity", new_column_name="quantity_sold")
        batch_op.alter_column("total_amount", new_column_name="revenue")
        batch_op.alter_column(
            "sold_at",
            new_column_name="sale_date",
            existing_type=sa.DateTime(),
            type_=sa.Date(),
        )
