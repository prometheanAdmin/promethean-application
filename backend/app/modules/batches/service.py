from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.batches.models import Batch


async def get_batch_by_id(
    db: AsyncSession,
    batch_id: uuid.UUID,
) -> Batch | None:
    """Return a batch by primary key."""
    result = await db.execute(select(Batch).where(Batch.id == batch_id))
    return result.scalar_one_or_none()


async def list_batches(
    db: AsyncSession,
    *,
    domain_id: uuid.UUID | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Batch]:
    """Return batches, optionally filtered by domain and/or status.

    Ordered by start_date ascending so the soonest batch appears first.
    """
    q = select(Batch)
    if domain_id is not None:
        q = q.where(Batch.domain_id == domain_id)
    if status is not None:
        q = q.where(Batch.status == status)
    q = q.order_by(Batch.start_date.asc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_batch(
    db: AsyncSession,
    *,
    name: str,
    project_track: str,
    domain_id: uuid.UUID,
    mentor_id: uuid.UUID,
    start_date: date,
    end_date: date,
    max_students: int = 20,
    description: str | None = None,
    github_template_repo: str | None = None,
    status: str = "upcoming",
) -> Batch:
    """Create a new batch.  Admin-only at the router level."""
    batch = Batch(
        name=name,
        project_track=project_track,
        domain_id=domain_id,
        mentor_id=mentor_id,
        start_date=start_date,
        end_date=end_date,
        max_students=max_students,
        description=description,
        github_template_repo=github_template_repo,
        status=status,
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return batch


async def update_batch(
    db: AsyncSession,
    batch_id: uuid.UUID,
    *,
    name: str | None = None,
    project_track: str | None = None,
    domain_id: uuid.UUID | None = None,
    mentor_id: uuid.UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    max_students: int | None = None,
    description: str | None = None,
    github_template_repo: str | None = None,
    status: str | None = None,
) -> Batch | None:
    """Partially update a batch.  Returns None if not found."""
    batch = await get_batch_by_id(db, batch_id)
    if batch is None:
        return None

    if name is not None:
        batch.name = name
    if project_track is not None:
        batch.project_track = project_track
    if domain_id is not None:
        batch.domain_id = domain_id
    if mentor_id is not None:
        batch.mentor_id = mentor_id
    if start_date is not None:
        batch.start_date = start_date
    if end_date is not None:
        batch.end_date = end_date
    if max_students is not None:
        batch.max_students = max_students
    if description is not None:
        batch.description = description
    if github_template_repo is not None:
        batch.github_template_repo = github_template_repo
    if status is not None:
        batch.status = status

    await db.commit()
    await db.refresh(batch)
    return batch


async def count_enrollments(db: AsyncSession, batch_id: uuid.UUID) -> int:
    """Return the number of active enrollments in a batch.

    Crosses into the enrollment module via a raw SQL count to avoid importing
    its ORM model — keeping module boundaries intact.
    """
    from sqlalchemy import text

    row = await db.execute(
        text(
            "SELECT COUNT(*) FROM enrollments "
            "WHERE batch_id = :bid AND status = 'active'"
        ),
        {"bid": str(batch_id)},
    )
    result = row.scalar()
    return int(result) if result is not None else 0
