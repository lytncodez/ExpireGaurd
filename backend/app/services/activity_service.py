"""Per-batch activity history (the "Activity history" panel in the frontend). Writes join the caller's
transaction; nothing here commits."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BatchActivity, User


def log(
    db: AsyncSession,
    *,
    company_id: uuid.UUID,
    batch_id: uuid.UUID,
    user: User | None,
    action: str,
    note: str | None = None,
) -> BatchActivity:
    entry = BatchActivity(
        company_id=company_id,
        batch_id=batch_id,
        user_id=user.id if user else None,
        actor_name=user.name if user else "ExpireGuard",
        action=action[:200],
        note=(note or None),
    )
    db.add(entry)
    return entry


async def for_batches(db: AsyncSession, batch_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[BatchActivity]]:
    if not batch_ids:
        return {}
    rows = (
        await db.scalars(
            select(BatchActivity)
            .where(BatchActivity.batch_id.in_(batch_ids))
            .order_by(BatchActivity.created_at, BatchActivity.id)
        )
    ).all()
    out: dict[uuid.UUID, list[BatchActivity]] = {}
    for row in rows:
        out.setdefault(row.batch_id, []).append(row)
    return out
