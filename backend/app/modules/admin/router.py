"""Admin router — user management, mentor verification, domain + batch CRUD.

All routes require the 'admin' role (enforced via require_role dependency).
Uses get_admin_db for RLS bypass so all rows are visible.

Layer: Router → Service → DB.  No SQLAlchemy in this file.
"""

from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_admin_db, require_role
from app.modules.admin.schemas import (
    AdminUserRead,
    DomainCreate,
    DomainRead,
    DomainUpdate,
    EnrollmentAdminRead,
    MentorProfileRead,
    PaginatedAdminUserList,
)
from app.modules.curriculum import service as curriculum_svc

# Cross-module access via service layer — never import models from other modules.
from app.modules.enrollment import service as enrollment_svc
from app.modules.enrollment.schemas import (
    AdminEnrollRequest,
    BatchCreate,
    BatchRead,
    BatchUpdate,
    EnrollmentRead,
)
from app.modules.identity import service as identity_svc
from app.modules.mentors import service as mentors_svc
from app.modules.mentors.schemas import MentorVerifyRequest

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/ping", dependencies=[Depends(require_role("admin"))])
async def admin_ping() -> dict[str, str]:
    """Liveness check for admin auth — confirms the JWT role gate is working."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /api/v1/admin/users — paginated user list with role + search filter
# ---------------------------------------------------------------------------


@router.get(
    "/users",
    response_model=PaginatedAdminUserList,
    dependencies=[Depends(require_role("admin"))],
)
async def list_users(
    role: str | None = Query(None, description="Filter by role (admin, mentor, student)"),
    search: str | None = Query(
        None, description="Case-insensitive search on email, first_name, last_name"
    ),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_admin_db),
) -> PaginatedAdminUserList:
    """Return paginated registered users with optional role/search filters.

    Admin-only.  Items and total are fetched sequentially because one
    SQLAlchemy AsyncSession cannot service concurrent queries safely.
    """
    users = await identity_svc.list_users_paginated(
        db, role=role, search=search, page=page, per_page=per_page
    )
    total = await identity_svc.count_users(db, role=role, search=search)
    items = [AdminUserRead.model_validate(u) for u in users]
    return PaginatedAdminUserList(items=items, total=total, page=page, per_page=per_page)


# ---------------------------------------------------------------------------
# PUT /api/v1/admin/mentors/{mentor_profile_id}/verify
# ---------------------------------------------------------------------------


@router.put(
    "/mentors/{mentor_user_id}/verify",
    response_model=MentorProfileRead,
    dependencies=[Depends(require_role("admin"))],
)
async def verify_mentor(
    mentor_user_id: uuid.UUID,
    body: MentorVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_admin_db),
) -> MentorProfileRead:
    """Approve or reject a mentor profile.

    Route param is the mentor's **user ID** (not the profile PK) — consistent
    with the rest of the mentor discovery API.

    is_verified=True  → approval + welcome email sent.
    is_verified=False → polite rejection email sent with optional reason.

    Email failures NEVER fail the request — DB is committed first.
    """
    admin_user = await identity_svc.get_user_by_clerk_id(db, request.state.user_id)
    verifier_id = admin_user.id if admin_user else uuid.UUID(int=0)

    profile = await mentors_svc.verify_mentor(
        db,
        mentor_user_id,
        is_verified=body.is_verified,
        rejection_reason=body.rejection_reason,
        verifier_user_id=verifier_id,
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mentor profile for user {mentor_user_id} not found",
        )

    return MentorProfileRead.model_validate(profile)


# ---------------------------------------------------------------------------
# Domain CRUD — /api/v1/admin/domains
# ---------------------------------------------------------------------------


@router.post(
    "/domains",
    response_model=DomainRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
async def create_domain(
    body: DomainCreate,
    db: AsyncSession = Depends(get_admin_db),
) -> DomainRead:
    """Create a new field-of-study domain.  Admin-only."""
    existing = await curriculum_svc.get_domain_by_name(db, body.name)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Domain '{body.name}' already exists",
        )
    domain = await curriculum_svc.create_domain(db, name=body.name, description=body.description)
    return DomainRead.model_validate(domain)


@router.put(
    "/domains/{domain_id}",
    response_model=DomainRead,
    dependencies=[Depends(require_role("admin"))],
)
async def update_domain(
    domain_id: uuid.UUID,
    body: DomainUpdate,
    db: AsyncSession = Depends(get_admin_db),
) -> DomainRead:
    """Update an existing domain.  Admin-only."""
    domain = await curriculum_svc.get_domain_by_id(db, domain_id)
    if domain is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Domain {domain_id} not found",
        )
    # Guard against renaming to an already-taken name — without this check the
    # unique DB constraint would surface as an unhandled 500.
    if body.name is not None:
        name_conflict = await curriculum_svc.get_domain_by_name(db, body.name)
        if name_conflict is not None and name_conflict.id != domain_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Domain '{body.name}' already exists",
            )
    domain = await curriculum_svc.update_domain(
        db, domain, name=body.name, description=body.description, status=body.status
    )
    return DomainRead.model_validate(domain)


@router.get(
    "/domains",
    response_model=list[DomainRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_domains(
    db: AsyncSession = Depends(get_admin_db),
) -> list[DomainRead]:
    """List ALL domains including inactive ones.  Admin-only.

    Unlike the public GET /domains endpoint (active-only from Redis cache),
    this queries the DB directly so admins can manage inactive domains.
    """
    domains = await curriculum_svc.list_all_domains(db)
    return [DomainRead.model_validate(d) for d in domains]


# ---------------------------------------------------------------------------
# Batch CRUD — /api/v1/admin/batches
# ---------------------------------------------------------------------------


@router.post(
    "/batches",
    response_model=BatchRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
async def create_batch(
    body: BatchCreate,
    db: AsyncSession = Depends(get_admin_db),
) -> BatchRead:
    """Create a new cohort batch.  Admin-only.

    GitHub repos are created per-student at enrollment time — no GitHub
    operation is performed here.
    """
    batch = await enrollment_svc.create_batch(db, body)
    log.info("admin.router.batch_created", batch_id=str(batch.id), name=batch.name)
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
        enrollment_count=0,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
    )


@router.put(
    "/batches/{batch_id}",
    response_model=BatchRead,
    dependencies=[Depends(require_role("admin"))],
)
async def update_batch(
    batch_id: uuid.UUID,
    body: BatchUpdate,
    db: AsyncSession = Depends(get_admin_db),
) -> BatchRead:
    """Partially update a batch.  Admin-only.  Only non-None fields are applied."""
    batch = await enrollment_svc.get_batch_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    updated = await enrollment_svc.update_batch(
        db,
        batch,
        name=body.name,
        project_track=body.project_track,
        domain_id=body.domain_id,
        mentor_id=body.mentor_id,
        start_date=body.start_date,
        end_date=body.end_date,
        max_students=body.max_students,
        description=body.description,
        github_template_repo=body.github_template_repo,
        status=body.status,
    )
    enrollment_count = await enrollment_svc.get_enrollment_count(db, batch_id)
    return BatchRead(
        id=updated.id,
        name=updated.name,
        project_track=updated.project_track,
        domain_id=updated.domain_id,
        mentor_id=updated.mentor_id,
        start_date=updated.start_date,
        end_date=updated.end_date,
        max_students=updated.max_students,
        description=updated.description,
        github_template_repo=updated.github_template_repo,
        github_repo_url=updated.github_repo_url,
        status=updated.status,
        enrollment_count=enrollment_count,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
    )


# ---------------------------------------------------------------------------
# Batch enrollments — /api/v1/admin/batches/{batch_id}/enrollments
# ---------------------------------------------------------------------------


@router.get(
    "/batches/{batch_id}/enrollments",
    response_model=list[EnrollmentAdminRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_batch_enrollments(
    batch_id: uuid.UUID,
    db: AsyncSession = Depends(get_admin_db),
) -> list[EnrollmentAdminRead]:
    """Return all enrollments for a batch with student identity details.  Admin-only.

    Includes student name and email via a raw SQL JOIN — no cross-module
    ORM relationship is used.
    """
    batch = await enrollment_svc.get_batch_by_id(db, batch_id)
    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch {batch_id} not found",
        )
    rows = await enrollment_svc.list_enrollments_with_students(db, batch_id)
    return [EnrollmentAdminRead.model_validate(row) for row in rows]


@router.post(
    "/batches/{batch_id}/enroll",
    response_model=EnrollmentRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role("admin"))],
)
async def admin_enroll_student(
    batch_id: uuid.UUID,
    body: AdminEnrollRequest,
    db: AsyncSession = Depends(get_admin_db),
) -> EnrollmentRead:
    """Admin-initiated enrollment — bypasses capacity check.

    Useful for seating a student in a batch that is technically full or
    for manually enrolling a student who cannot self-enroll.

    Idempotent — returns the existing enrollment if the student is already enrolled.
    Requires the student to have already connected their GitHub account.
    """
    try:
        enrollment = await enrollment_svc.admin_enroll_student(db, body.student_id, batch_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    log.info(
        "admin.router.student_enrolled",
        batch_id=str(batch_id),
        student_id=str(body.student_id),
    )
    return EnrollmentRead.model_validate(enrollment)
