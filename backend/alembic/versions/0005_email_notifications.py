"""Email notifications: subject column and room for email recipients.

Revision ID: 0005_email
Revises: 0004_conversation_pin
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_email"
down_revision: Union[str, None] = "0004_conversation_pin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("notifications", "recipient", type_=sa.String(255), existing_type=sa.String(64),
                    existing_nullable=False)
    op.add_column("notifications", sa.Column("subject", sa.String(255), nullable=True))


def downgrade() -> None:
    op.execute("DELETE FROM notifications WHERE channel = 'EMAIL'")
    op.drop_column("notifications", "subject")
    op.alter_column("notifications", "recipient", type_=sa.String(64), existing_type=sa.String(255),
                    existing_nullable=False)
