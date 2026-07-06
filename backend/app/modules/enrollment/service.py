"""Enrollment service — business logic for batches and student enrollment.

Layer order: Router → Service → Repository → DB.
This layer owns transactions (commits) and orchestrates GitHub + email
side effects.

Key design decisions:

1. GitHub repo fork (enroll_student):
   For V1, we attempt the GitHub fork synchronously with a 10-second timeout.
   If it fails or times out, we log the error and leave github_repo_url=None.
   The enrollment is committed regardless — GitHub failure never blocks enrollment.

2. GitHub collaborator invite (enroll_student):
   Sent as a fire-and-forget asyncio.create_task after the enrollment is
   committed.  If it fails the student can still be invited manually.

3. Enrollment confirmation email:
   Also fire-and-forget.  Student email is fetched from the DB before the
   session commits so the background task only needs plain values (no session).

4. create_batch:
   No GitHub operation at batch creation time.  GitHub repos are per-student
   (each student forks the template when they enroll), not per-batch.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import date

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app import github as gh
from app.email import send_email
from app.modules.enrollment import repository as repo
from app.modules.enrollment.models import Batch, Enrollment
from app.modules.enrollment.schemas import BatchCreate

log = structlog.get_logger(__name__)

# Statuses that allow new enrollments
_OPEN_STATUSES = frozenset({"upcoming", "active"})

# Timeout for the synchronous GitHub fork attempt (used both at enrollment and batch creation)
_GITHUB_FORK_TIMEOUT_S = 10.0


# ---------------------------------------------------------------------------
# Batch operations
# ---------------------------------------------------------------------------


async def create_batch(
    session: AsyncSession,
    payload: BatchCreate,
) -> Batch:
    """Admin-only: create a new batch.

    If ``github_template_repo`` is set, attempts to create a batch-level
    GitHub repo from the template with a 10-second timeout.  Failure is
    logged and gracefully tolerated — ``github_repo_url`` stays None and
    the batch is committed regardless.

    This function owns the transaction (single commit after the GitHub call).
    """
    batch = await repo.create_batch(
        session,
        name=payload.name,
        project_track=payload.project_track,
        domain_id=payload.domain_id,
        mentor_id=payload.mentor_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        max_students=payload.max_students,
        description=payload.description,
        github_template_repo=payload.github_template_repo,
        status=payload.status,
    )

    # Attempt batch-level GitHub repo creation with a 10-second timeout.
    if payload.github_template_repo:
        github_repo_url: str | None = None
        try:
            github_repo_url = await asyncio.wait_for(
                gh.create_repo_from_template(
                    template_repo=payload.github_template_repo,
                    new_repo_name=f"batch-{batch.id}",
                    description=f"Promethean batch: {batch.name}",
                    private=True,
                ),
                timeout=_GITHUB_FORK_TIMEOUT_S,
            )
        except TimeoutError:
            log.warning(
                "enrollment.svc.batch_github_timeout",
                batch_id=str(batch.id),
                template=payload.github_template_repo,
            )
        except Exception:
            log.exception(
                "enrollment.svc.batch_github_error",
                batch_id=str(batch.id),
                template=payload.github_template_repo,
            )
        if github_repo_url:
            batch.github_repo_url = github_repo_url

    await session.commit()
    log.info(
        "enrollment.svc.batch_created",
        batch_id=str(batch.id),
        name=batch.name,
        github_repo_url=batch.github_repo_url,
    )
    return batch


async def get_batch_by_id(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> Batch | None:
    """Return a batch by primary key.  Thin wrapper for router use."""
    return await repo.get_batch_by_id(session, batch_id)


async def list_batches_paginated(
    session: AsyncSession,
    *,
    domain_id: uuid.UUID | None = None,
    status: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[Batch]:
    """Return paginated batches.  Pair with count_batches for total."""
    return await repo.list_batches_paginated(
        session, domain_id=domain_id, status=status, page=page, per_page=per_page
    )


async def count_batches(
    session: AsyncSession,
    *,
    domain_id: uuid.UUID | None = None,
    status: str | None = None,
) -> int:
    """Return total batch count for pagination metadata."""
    return await repo.count_batches(session, domain_id=domain_id, status=status)


async def get_enrollment_count(session: AsyncSession, batch_id: uuid.UUID) -> int:
    """Return number of active enrollments in a batch."""
    return await repo.get_enrollment_count(session, batch_id)


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
    """Partially update a batch.  Owns the transaction (commits)."""
    batch = await repo.update_batch(
        session,
        batch,
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
    await session.commit()
    return batch


# ---------------------------------------------------------------------------
# Enrollment operations
# ---------------------------------------------------------------------------


async def enroll_student(
    session: AsyncSession,
    student_id: uuid.UUID,
    batch_id: uuid.UUID,
) -> Enrollment:
    """Enroll a student in a batch.

    Validation checks (in order):
    1. Batch exists and status is 'upcoming' or 'active'.
    2. Batch is not at capacity.
    3. Student is not already enrolled (idempotent — returns existing).
    4. Student has a verified github_username (required for repo invite).

    After successful enrollment:
    - Attempts GitHub repo fork synchronously (10s timeout).
      On success: github_repo_url is stored on the enrollment.
      On failure: enrollment committed with github_repo_url=None.
    - Sends enrollment confirmation email (fire-and-forget).
    - Sends GitHub collaborator invite (fire-and-forget) when repo URL exists.

    Both fire-and-forget side effects are asyncio.create_task calls — failure
    never rolls back the enrollment.
    """
    # 1. Batch validation — acquire a row-level lock so concurrent enrollment
    #    requests for the same batch are serialised.  Without FOR UPDATE, two
    #    requests can both pass the capacity check and both insert, overfilling
    #    the batch.  The lock is released when this transaction commits.
    batch = await repo.get_batch_by_id_for_update(session, batch_id)
    if batch is None:
        raise ValueError(f"Batch {batch_id} not found")
    if batch.status not in _OPEN_STATUSES:
        raise ValueError(
            f"Batch '{batch.name}' is not open for enrollment (status: {batch.status})"
        )

    # 2. Capacity check — safe to read after the FOR UPDATE lock above.
    enrollment_count = await repo.get_enrollment_count(session, batch_id)
    if enrollment_count >= batch.max_students:
        raise ValueError(
            f"Batch '{batch.name}' is full ({batch.max_students} students enrolled)"
        )

    # 3. Idempotency — already enrolled
    existing = await repo.get_enrollment(session, student_id, batch_id)
    if existing is not None:
        log.debug(
            "enrollment.svc.already_enrolled",
            student_id=str(student_id),
            batch_id=str(batch_id),
        )
        return existing

    # 4. GitHub username required — cross-module service call (allowed)
    from app.modules.students import service as students_svc

    student_profile = await students_svc.get_profile_by_user_id(session, student_id)
    github_username = student_profile.github_username if student_profile else None
    if not github_username:
        raise ValueError(
            "GitHub account required before enrolling — "
            "connect your GitHub at POST /api/v1/me/github-connect"
        )

    # Fetch student email before commit (while session is still open).
    student_email = await _get_user_email(session, student_id)

    # 5. Create enrollment row
    enrollment = await repo.create_enrollment(session, student_id=student_id, batch_id=batch_id)

    # 6. Attempt GitHub fork (synchronous, 10s timeout).
    github_repo_url: str | None = None
    if batch.github_template_repo:
        repo_name = f"student-{student_id!s:.8}-batch-{batch_id!s:.8}"
        try:
            github_repo_url = await asyncio.wait_for(
                gh.create_repo_from_template(
                    template_repo=batch.github_template_repo,
                    new_repo_name=repo_name,
                    description=f"{batch.name} — student workspace",
                    private=True,
                ),
                timeout=_GITHUB_FORK_TIMEOUT_S,
            )
        except TimeoutError:
            log.warning(
                "enrollment.svc.github_fork_timeout",
                student_id=str(student_id),
                batch_id=str(batch_id),
                template=batch.github_template_repo,
            )
        if github_repo_url:
            await repo.set_enrollment_github_repo(session, enrollment, github_repo_url)

    # 7. Commit enrollment (and github_repo_url if available).
    await session.commit()

    log.info(
        "enrollment.svc.enrolled",
        student_id=str(student_id),
        batch_id=str(batch_id),
        github_repo_url=github_repo_url,
    )

    # 8. Fire-and-forget: GitHub collaborator invite.
    if github_repo_url and github_username:
        # repo_full_name = "org/repo-name" extracted from the HTML URL
        parts = github_repo_url.rstrip("/").split("/")
        if len(parts) >= 2:
            repo_full_name = f"{parts[-2]}/{parts[-1]}"
            asyncio.create_task(
                gh.invite_collaborator(
                    repo_full_name=repo_full_name,
                    github_username=github_username,
                )
            )

    # 9. Fire-and-forget: enrollment confirmation email.
    if student_email:
        asyncio.create_task(
            _send_enrollment_email(
                student_email=student_email,
                batch_name=batch.name,
                github_repo_url=github_repo_url,
            )
        )

    return enrollment


async def get_active_enrollment(
    session: AsyncSession,
    student_id: uuid.UUID,
) -> Enrollment | None:
    """Return the student's currently active enrollment."""
    return await repo.get_student_active_enrollment(session, student_id)


async def admin_enroll_student(
    session: AsyncSession,
    student_id: uuid.UUID,
    batch_id: uuid.UUID,
) -> Enrollment:
    """Admin-initiated enrollment — identical to enroll_student but skips the
    capacity check so admins can seat students in full batches.

    Validations retained:
    1. Batch exists.
    2. Batch status is 'upcoming' or 'active'.
    3. Idempotency — returns existing enrollment if already enrolled.
    4. Student must have a connected github_username.

    Side effects are identical: GitHub fork (10s timeout), fire-and-forget
    GitHub invite, and enrollment confirmation email.
    """
    # 1. Batch validation (no capacity check)
    batch = await repo.get_batch_by_id(session, batch_id)
    if batch is None:
        raise ValueError(f"Batch {batch_id} not found")
    if batch.status not in _OPEN_STATUSES:
        raise ValueError(
            f"Batch '{batch.name}' is not open for enrollment (status: {batch.status})"
        )

    # 2. Idempotency
    existing = await repo.get_enrollment(session, student_id, batch_id)
    if existing is not None:
        log.debug(
            "enrollment.svc.admin_already_enrolled",
            student_id=str(student_id),
            batch_id=str(batch_id),
        )
        return existing

    # 3. GitHub username required
    from app.modules.students import service as students_svc

    student_profile = await students_svc.get_profile_by_user_id(session, student_id)
    github_username = student_profile.github_username if student_profile else None
    if not github_username:
        raise ValueError(
            "Student must connect a GitHub account before being enrolled — "
            "ask them to call POST /api/v1/me/github-connect"
        )

    # Fetch student email before commit.
    student_email = await _get_user_email(session, student_id)

    # 4. Create enrollment row
    enrollment = await repo.create_enrollment(session, student_id=student_id, batch_id=batch_id)

    # 5. Attempt GitHub fork (synchronous, 10s timeout).
    github_repo_url: str | None = None
    if batch.github_template_repo:
        repo_name = f"student-{student_id!s:.8}-batch-{batch_id!s:.8}"
        try:
            github_repo_url = await asyncio.wait_for(
                gh.create_repo_from_template(
                    template_repo=batch.github_template_repo,
                    new_repo_name=repo_name,
                    description=f"{batch.name} — student workspace",
                    private=True,
                ),
                timeout=_GITHUB_FORK_TIMEOUT_S,
            )
        except TimeoutError:
            log.warning(
                "enrollment.svc.admin_github_fork_timeout",
                student_id=str(student_id),
                batch_id=str(batch_id),
            )
        if github_repo_url:
            await repo.set_enrollment_github_repo(session, enrollment, github_repo_url)

    await session.commit()

    log.info(
        "enrollment.svc.admin_enrolled",
        student_id=str(student_id),
        batch_id=str(batch_id),
        github_repo_url=github_repo_url,
    )

    # Fire-and-forget side effects
    if github_repo_url and github_username:
        parts = github_repo_url.rstrip("/").split("/")
        if len(parts) >= 2:
            asyncio.create_task(
                gh.invite_collaborator(
                    repo_full_name=f"{parts[-2]}/{parts[-1]}",
                    github_username=github_username,
                )
            )

    if student_email:
        asyncio.create_task(
            _send_enrollment_email(
                student_email=student_email,
                batch_name=batch.name,
                github_repo_url=github_repo_url,
            )
        )

    return enrollment


async def list_enrollments_for_batch(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> list[Enrollment]:
    """Return all enrollments for a batch (admin use only)."""
    return await repo.list_enrollments_for_batch(session, batch_id)


async def list_enrollments_with_students(
    session: AsyncSession,
    batch_id: uuid.UUID,
) -> list[dict[str, object]]:
    """Return enrollments for a batch enriched with student name and email.

    Used by GET /api/v1/admin/batches/{batch_id}/enrollments.
    The JOIN to the users table is done in raw SQL — no cross-module ORM
    relationship is introduced.
    """
    return await repo.list_enrollments_with_student_info(session, batch_id)


async def get_batches_by_domain(
    session: AsyncSession,
    domain_id: uuid.UUID,
    *,
    page: int = 1,
    per_page: int = 20,
) -> list[Batch]:
    """Return paginated batches for a specific domain (Step 6 spec contract)."""
    return await repo.get_batches_by_domain(session, domain_id, page=page, per_page=per_page)


# ---------------------------------------------------------------------------
# Backward-compatible wrappers (used by the old enrollment router)
# ---------------------------------------------------------------------------


async def get_active_enrollment_by_student(
    db: AsyncSession,
    student_id: uuid.UUID,
) -> Enrollment | None:
    """Backward-compatible wrapper."""
    return await repo.get_student_active_enrollment(db, student_id)


async def get_enrollment_by_student_and_batch(
    db: AsyncSession,
    student_id: uuid.UUID,
    batch_id: uuid.UUID,
) -> Enrollment | None:
    """Backward-compatible wrapper."""
    return await repo.get_enrollment(db, student_id, batch_id)


async def withdraw_enrollment(
    db: AsyncSession,
    *,
    student_id: uuid.UUID,
    batch_id: uuid.UUID,
) -> Enrollment | None:
    """Withdraw the student from a batch.  Returns None if not enrolled."""
    enrollment = await repo.get_enrollment(db, student_id, batch_id)
    if enrollment is None:
        return None
    enrollment.status = "withdrawn"
    await db.flush()
    await db.commit()
    return enrollment


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _get_user_email(session: AsyncSession, user_id: uuid.UUID) -> str | None:
    """Fetch the user's email via raw SQL to avoid cross-module ORM import."""
    from sqlalchemy import text

    row = await session.execute(
        text("SELECT email FROM users WHERE id = :uid"),
        {"uid": str(user_id)},
    )
    result = row.first()
    return str(result[0]) if result else None


async def _send_enrollment_email(
    *,
    student_email: str,
    batch_name: str,
    github_repo_url: str | None,
) -> None:
    """Send enrollment confirmation email.  Never raises."""
    repo_line = (
        f'<p>Your project workspace: <a href="{github_repo_url}">{github_repo_url}</a></p>'
        if github_repo_url
        else "<p>Your GitHub workspace will be set up shortly.</p>"
    )
    await send_email(
        to=student_email,
        subject=f"You're enrolled in {batch_name}!",
        html=(
            f"<h1>You're enrolled in {batch_name}!</h1>"
            "<p>Welcome to the Promethean cohort. Here's what's next:</p>"
            f"{repo_line}"
            "<p>— The Promethean Team</p>"
        ),
        tags={"event": "student_enrolled"},
    )
