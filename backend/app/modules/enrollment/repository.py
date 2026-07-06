"""Enrollment repository — all raw DB I/O for batches and enrollments.

Layer order:  Router → Service → Repository → DB.
All mutation functions flush but do NOT commit — the service layer owns
transactions.
"""

from __future__ import annotations

import uuid
from datetime import date

import structlog
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.enrollment.models import Batch, Enrollment

log = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Batch queries
# ---------------------------------------------------------------------------


async def get_batch_by_id(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> Batch | None:
    """Return a Batch by primary key."""
    result = await session.execute(select(Batch).where(Batch.id == batch_id))
    return result.scalar_one_or_none()


async def get_batch_by_id_for_update(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> Batch | None:
    """Return a Batch with a row-level lock (SELECT FOR UPDATE).

    Used during self-enrollment to prevent concurrent requests from both
    seeing one remaining slot and both succeeding.  The lock is held until
    the surrounding transaction commits, serialising concurrent enrolments
    for the same batch.
    """
    result = await session.execute(
        select(Batch).where(Batch.id == batch_id).with_for_update()
    )
    return result.scalar_one_or_none()


async def list_batches_paginated(
    session: AsyncSession,
    *,
    domain_id: uuid.UUID | None = None,
    status: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[Batch]:
    """Return batches matching the given filters, ordered by start_date ASC.

    This function returns ORM objects — callers pair it with
    ``count_batches`` (run in parallel via asyncio.gather) for pagination
    metadata.
    """
    q = select(Batch)
    if domain_id is not None:
        q = q.where(Batch.domain_id == domain_id)
    if status is not None:
        q = q.where(Batch.status == status)
    q = q.order_by(Batch.start_date.asc()).limit(per_page).offset((page - 1) * per_page)
    result = await session.execute(q)
    return list(result.scalars().all())


async def count_batches(
    session: AsyncSession,
    *,
    domain_id: uuid.UUID | None = None,
    status: str | None = None,
) -> int:
    """Return total batch count for the same filters as list_batches_paginated.

    Run alongside list_batches_paginated via asyncio.gather() to get pagination
    metadata without waiting for the first query to complete.
    """
    q = select(func.count()).select_from(Batch)
    if domain_id is not None:
        q = q.where(Batch.domain_id == domain_id)
    if status is not None:
        q = q.where(Batch.status == status)
    result = await session.scalar(q)
    return int(result) if result is not None else 0


async def get_batches_by_domain(
    session: AsyncSession,
    domain_id: uuid.UUID,
    *,
    page: int = 1,
    per_page: int = 20,
) -> list[Batch]:
    """Return paginated batches for a specific domain, ordered by start_date ASC.

    Dedicated contract for domain-filtered discovery (Step 6 spec).
    """
    q = (
        select(Batch)
        .where(Batch.domain_id == domain_id)
        .order_by(Batch.start_date.asc())
        .limit(per_page)
        .offset((page - 1) * per_page)
    )
    result = await session.execute(q)
    return list(result.scalars().all())


async def create_batch(
    session: AsyncSession,
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
    github_repo_url: str | None = None,
    status: str = "upcoming",
) -> Batch:
    """INSERT a new Batch row and flush so the PK is populated.

    ``github_repo_url`` is set by the service layer after a successful GitHub
    fork attempt — the repo passes it back in after the wait_for call.
    Caller is responsible for the surrounding transaction.
    """
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
        github_repo_url=github_repo_url,
        status=status,
    )
    session.add(batch)
    await session.flush()
    log.info("enrollment.repo.batch_created", batch_id=str(batch.id), name=name)
    return batch


async def update_batch(
    session: AsyncSession,
    batch: Batch,
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
) -> Batch:
    """Patch non-None fields on an existing Batch and flush."""
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
    await session.flush()
    return batch


# ---------------------------------------------------------------------------
# Enrollment queries
# ---------------------------------------------------------------------------


async def get_enrollment_count(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> int:
    """Return the number of active enrollments in the given batch."""
    result = await session.scalar(
        select(func.count())
        .select_from(Enrollment)
        .where(Enrollment.batch_id == batch_id, Enrollment.status == "active")
    )
    return int(result) if result is not None else 0


async def get_enrollment(
    session: AsyncSession,
    student_id: uuid.UUID,
    batch_id: uuid.UUID,
) -> Enrollment | None:
    """Return the enrollment for a specific student + batch combo, or None."""
    result = await session.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.batch_id == batch_id,
        )
    )
    return result.scalar_one_or_none()


async def create_enrollment(
    session: AsyncSession,
    *,
    student_id: uuid.UUID,
    batch_id: uuid.UUID,
) -> Enrollment:
    """INSERT a new Enrollment row and flush.

    Caller is responsible for the surrounding transaction.
    Uniqueness is enforced at DB level (unique constraint on student_id + batch_id).
    """
    enrollment = Enrollment(
        student_id=student_id,
        batch_id=batch_id,
        status="active",
        payment_status="free",
    )
    session.add(enrollment)
    await session.flush()
    log.info(
        "enrollment.repo.enrollment_created",
        student_id=str(student_id),
        batch_id=str(batch_id),
    )
    return enrollment


async def get_student_active_enrollment(
    session: AsyncSession,
    student_id: uuid.UUID,
) -> Enrollment | None:
    """Return the student's currently active enrollment, or None.

    A student may have at most one ACTIVE enrollment at a time.
    """
    result = await session.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_id,
            Enrollment.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def list_enrollments_for_batch(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> list[Enrollment]:
    """Return all enrollments for the given batch (any status)."""
    result = await session.execute(
        select(Enrollment)
        .where(Enrollment.batch_id == batch_id)
        .order_by(Enrollment.enrolled_at.asc())
    )
    return list(result.scalars().all())


async def set_enrollment_github_repo(
    session: AsyncSession,
    enrollment: Enrollment,
    github_repo_url: str,
) -> Enrollment:
    """Store the GitHub fork URL on an existing enrollment and flush."""
    enrollment.github_repo_url = github_repo_url
    await session.flush()
    return enrollment


async def list_enrollments_with_student_info(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> list[dict[str, object]]:
    """Return enrollments for a batch enriched with student identity fields.

    Uses a raw SQL JOIN to the users table — cross-module via SQL only,
    no ORM relationship is defined.  Returns plain dicts so the caller
    can validate them directly into EnrollmentAdminRead.
    """
    result = await session.execute(
        text("""
            SELECT
                e.id,
                e.student_id,
                e.batch_id,
                e.status,
                e.payment_status,
                e.github_repo_url,
                e.enrolled_at,
                e.updated_at,
                u.email        AS student_email,
                u.first_name   AS student_first_name,
                u.last_name    AS student_last_name
            FROM enrollments e
            JOIN users u ON u.id = e.student_id
            WHERE e.batch_id = :batch_id
            ORDER BY e.enrolled_at ASC
        """),
        {"batch_id": str(batch_id)},
    )
    return [dict(row._mapping) for row in result]
