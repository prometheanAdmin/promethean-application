"""Enrollment router — batch discovery + student enrollment.

Routes:
  GET  /api/v1/batches                   — AUTH: paginated batch discovery (profile gate)
  GET  /api/v1/batches/{batch_id}        — PUBLIC: batch detail + enrollment count
  POST /api/v1/batches/{batch_id}/enroll — STUDENT: enroll in a batch
  GET  /api/v1/enrollments/me            — STUDENT: get own active enrollment (profile gate)

Admin batch CRUD (POST/PUT /api/v1/admin/batches) lives exclusively in the
admin router — this router owns student-facing discovery and self-enrollment only.

GET /api/v1/batches requires JWT + profile completion (KAN-26 / BE-013).
GET /api/v1/batches/{batch_id} remains public (safe to link from emails etc.).
Student endpoints use get_db (JWT required) + require_role("student").

Layer: Router → Service → Repository → DB.  No ORM in this file.
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import (
    get_current_user,
    get_db,
    get_public_db,
    require_profile_complete,
    require_role,
)
from app.modules.enrollment import service as enrollment_svc
from app.modules.enrollment.schemas import (
    BatchListItem,
    BatchRead,
    EnrollmentRead,
    EnrollSelfRequest,
    PaginatedBatchList,
)
from app.modules.identity import service as identity_svc

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["enrollment"])


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------


async def _resolve_user(request: Request, db: AsyncSession) -> Any:
    """Resolve the Clerk ID from the JWT to the local user ORM object.

    Raises HTTP 404 if the user hasn't called POST /auth/sync yet.
    """
    user = await identity_svc.get_user_by_clerk_id(db, request.state.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )
    return user


# ---------------------------------------------------------------------------
# GET /api/v1/batches  — AUTH (profile gate)
# ---------------------------------------------------------------------------


@router.get(
    "/batches",
    response_model=PaginatedBatchList,
    dependencies=[Depends(require_profile_complete)],
)
async def list_batches(
    domain_id: uuid.UUID | None = Query(None, description="Filter by domain UUID"),
    status_filter: str | None = Query("upcoming", alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedBatchList:
    """Return paginated batches.  Requires a complete profile (KAN-26).

    Default filter is status=upcoming so the discovery page shows
    the cohorts students can still join.

    Items (list), total (count), and per-batch enrollment counts are fetched
    sequentially because a single SQLAlchemy AsyncSession cannot be shared
    across concurrent coroutines safely.
    """
    batches = await enrollment_svc.list_batches_paginated(
        db, domain_id=domain_id, status=status_filter, page=page, per_page=per_page
    )
    total = await enrollment_svc.count_batches(db, domain_id=domain_id, status=status_filter)

    counts: list[int] = []
    for batch in batches:
        counts.append(await enrollment_svc.get_enrollment_count(db, batch.id))

    items = [
        BatchListItem(
            id=b.id,
            name=b.name,
            project_track=b.project_track,
            domain_id=b.domain_id,
            mentor_id=b.mentor_id,
            start_date=b.start_date,
            end_date=b.end_date,
            max_students=b.max_students,
            enrollment_count=count,
            status=b.status,
            description=b.description,
            github_repo_url=b.github_repo_url,
        )
        for b, count in zip(batches, counts)
    ]

    return PaginatedBatchList(items=items, total=total, page=page, per_page=per_page)


# ---------------------------------------------------------------------------
# GET /api/v1/batches/{batch_id}  — PUBLIC
# ---------------------------------------------------------------------------


@router.get("/batches/{batch_id}", response_model=BatchRead)
async def get_batch(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_public_db),
) -> BatchRead:
    """Return full batch detail including current enrollment count.

    No authentication required.  Batch and enrollment count are fetched
    sequentially to keep AsyncSession usage safe.
    """
    batch = await enrollment_svc.get_batch_by_id(db, batch_id)
    enrollment_count = await enrollment_svc.get_enrollment_count(db, batch_id)

    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )

    return BatchRead(
        id=batch.id,
        name=batch.name,
        project_track=batch.project_track,
        domain_id=batch.domain_id,
        mentor_id=batch.mentor_id,
        start_date=batch.start_date,
        end_date=batch.end_date,
        max_students=batch.max_students,
        description=batch.description,
        github_template_repo=batch.github_template_repo,
        github_repo_url=batch.github_repo_url,
        status=batch.status,
        enrollment_count=enrollment_count,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/batches/{batch_id}/enroll  — STUDENT
# ---------------------------------------------------------------------------


@router.post(
    "/batches/{batch_id}/enroll",
    response_model=EnrollmentRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("student")), Depends(require_profile_complete)],
)
async def enroll_in_batch(
    batch_id: uuid.UUID,
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    body: EnrollSelfRequest = Body(default_factory=EnrollSelfRequest),  # optional on the wire
) -> EnrollmentRead:
    """Enroll the authenticated student in the given batch.

    Requires the 'student' role.  Idempotent — calling twice for the same
    batch returns the existing enrollment without error.

    Pre-conditions:
    - Batch must exist and be open (status: upcoming | active).
    - Batch must not be at capacity.
    - Student must have connected their GitHub account.
    - Student not already enrolled in this batch.

    Side effects (fire-and-forget, never block the response):
    - GitHub repo fork from the batch template.
    - GitHub collaborator invite.
    - Enrollment confirmation email.
    """
    user = await _resolve_user(request, db)

    try:
        enrollment = await enrollment_svc.enroll_student(db, user.id, batch_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return EnrollmentRead.model_validate(enrollment)


# ---------------------------------------------------------------------------
# GET /api/v1/enrollments/me  — STUDENT
# ---------------------------------------------------------------------------


@router.get(
    "/enrollments/me",
    response_model=EnrollmentRead,
    dependencies=[Depends(require_role("student")), Depends(require_profile_complete)],
)
async def get_my_enrollment(
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EnrollmentRead:
    """Return the authenticated student's active enrollment.

    Returns 404 if the student is not currently enrolled in any batch.
    """
    user = await _resolve_user(request, db)
    enrollment = await enrollment_svc.get_active_enrollment(db, user.id)
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active enrollment found — enroll in a batch first",
        )
    return EnrollmentRead.model_validate(enrollment)
