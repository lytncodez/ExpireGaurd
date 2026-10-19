"""Add is_pinned to AI conversations (pin/unpin chats).

Revision ID: 0004_conversation_pin
Revises: 0003_pharmacy
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_conversation_pin"
down_revision: Union[str, None] = "0003_pharmacy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ai_conversations",
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("ai_conversations", "is_pinned")
