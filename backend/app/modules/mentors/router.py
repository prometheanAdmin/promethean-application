"""Mentors router — profile management + public mentor discovery.

Routes:
  PUT  /api/v1/me/mentor-profile   — create/update own profile (mentor role required)
  GET  /api/v1/me/mentor-profile   — return own profile (any authenticated user)
  GET  /api/v1/mentors             — PUBLIC: paginated list of verified mentors
  GET  /api/v1/mentors/{user_id}   — PUBLIC: mentor detail with user name/avatar

Public endpoints use get_public_db (no JWT required).
The mentor detail endpoint fetches profile first, then loads the user row by
``profile.user_id``. Within a single SQLAlchemy AsyncSession we keep queries
sequential — concurrent use of one session is not safe.

Layer: Router → Service → Repository → DB.  No ORM in this file.
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db, get_public_db, require_role
from app.modules.identity import service as identity_svc
from app.modules.mentors import service as mentors_svc
from app.modules.mentors.schemas import (
    MentorDetailRead,
    MentorProfileCreate,
    MentorProfileRead,
    PaginatedMentorList,
)

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["mentors"])


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------


async def _resolve_user_id(request: Request, db: AsyncSession) -> Any:
    """Resolve the Clerk ID from the JWT to the local user ORM object.

    Raises HTTP 404 if the user hasn't called POST /auth/sync yet.
    """
    clerk_user_id: str = request.state.user_id
    user = await identity_svc.get_user_by_clerk_id(db, clerk_user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )
    return user


# ---------------------------------------------------------------------------
# PUT /api/v1/me/mentor-profile
# ---------------------------------------------------------------------------


@router.put(
    "/me/mentor-profile",
    response_model=MentorProfileRead,
    dependencies=[Depends(require_role("mentor"))],
)
async def upsert_mentor_profile(
    body: MentorProfileCreate,
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MentorProfileRead:
    """Create or update the mentor profile for the authenticated user.

    Requires the 'mentor' role.  Patch semantics: only non-None fields in
    the request body overwrite the existing row.  Calling this endpoint
    multiple times is safe — idempotent.
    """
    user = await _resolve_user_id(request, db)
    profile = await mentors_svc.upsert_mentor_profile(db, user.id, body)
    return MentorProfileRead.model_validate(profile)


# ---------------------------------------------------------------------------
# GET /api/v1/me/mentor-profile
# ---------------------------------------------------------------------------


@router.get("/me/mentor-profile", response_model=MentorProfileRead)
async def get_my_mentor_profile(
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MentorProfileRead:
    """Return the mentor profile for the authenticated user."""
    user = await _resolve_user_id(request, db)
    profile = await mentors_svc.get_profile_by_user_id(db, user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor profile not found — submit the profile form first",
        )
    return MentorProfileRead.model_validate(profile)


# ---------------------------------------------------------------------------
# GET /api/v1/mentors  — PUBLIC
# ---------------------------------------------------------------------------


@router.get("/mentors", response_model=PaginatedMentorList)
async def list_mentors(
    domain: str | None = Query(None, description="Filter by domain ID (UUID string)"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_public_db),
) -> PaginatedMentorList:
    """Return paginated verified mentors.  No authentication required.

    Results are ordered by rating_avg DESC NULLS LAST so the best-rated
    mentors appear at the top of the discovery page.

    Pagination metadata (total, page, per_page) is returned alongside items
    so the frontend can render page controls without a second request.

    ``items`` and ``total`` are fetched sequentially because SQLAlchemy
    AsyncSession objects cannot safely service concurrent queries.
    """
    items = await mentors_svc.list_verified_mentors(
        db, domain_id=domain, page=page, per_page=per_page
    )
    total = await mentors_svc.count_verified_mentors(db, domain_id=domain)
    return PaginatedMentorList(
        items=[MentorProfileRead.model_validate(p) for p in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ---------------------------------------------------------------------------
# GET /api/v1/mentors/{mentor_id}  — PUBLIC
# ---------------------------------------------------------------------------


@router.get("/mentors/{mentor_id}", response_model=MentorDetailRead)
async def get_mentor_detail(
    mentor_id: uuid.UUID,
    db: AsyncSession = Depends(get_public_db),
) -> MentorDetailRead:
    """Return a verified mentor's profile enriched with their identity fields.

    No authentication required.

    Route param is the **profile UUID** (not the user UUID).  The profile is
    fetched first; once we have ``profile.user_id`` the user lookup follows.
    Two sequential DB calls but no cross-module relationship needed — the
    profile row owns the foreign key.

    Returns 404 if the mentor doesn't exist, is not verified, or their user
    row is missing.
    """
    profile = await mentors_svc.get_profile_by_id(db, mentor_id)

    if profile is None or not profile.is_verified:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verified mentor {mentor_id} not found",
        )

    user = await identity_svc.get_user_by_id(db, profile.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mentor user record {profile.user_id} not found",
        )

    return MentorDetailRead(
        id=profile.id,
        user_id=profile.user_id,
        bio=profile.bio,
        company=profile.company,
        experience_yrs=profile.experience_yrs,
        github_username=profile.github_username,
        domains=profile.domains,
        is_verified=profile.is_verified,
        rating_avg=profile.rating_avg,
        rev_share_pct=profile.rev_share_pct,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
        first_name=user.first_name,
        last_name=user.last_name,
        avatar_url=user.avatar_url,
    )
