"""Students router — student profile management.

Routes:
  PUT  /api/v1/me/student-profile  — create or update the profile
  GET  /api/v1/me/student-profile  — return the current profile
  POST /api/v1/me/github-connect   — store a verified GitHub username

All routes require a valid Clerk JWT (Depends(get_current_user) + get_db).
Clerk ID resolution: clerk_user_id → local UUID via identity_svc.

Layer: Router → Service → Repository → DB.  No ORM in this file.
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.modules.identity import service as identity_svc
from app.modules.students import service as students_svc
from app.modules.students.schemas import (
    GitHubConnectRequest,
    StudentProfileRead,
    StudentProfileUpdate,
)

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["students"])


# ---------------------------------------------------------------------------
# Shared helper
# ---------------------------------------------------------------------------


async def _resolve_user_id(request: Request, db: AsyncSession) -> Any:
    """Resolve the Clerk ID from the JWT to the local user UUID.

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
# KAN-XX — PUT /api/v1/me/student-profile
# ---------------------------------------------------------------------------


@router.put("/me/student-profile", response_model=StudentProfileRead)
async def upsert_student_profile(
    body: StudentProfileUpdate,
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfileRead:
    """Create or update the student profile for the authenticated user.

    Patch semantics: only non-None fields in the request body are written.
    Calling this endpoint multiple times is safe — idempotent.

    ``profile_complete`` is recomputed on every call:
    true iff education, career_goals, and domain_id are all non-empty.
    """
    user = await _resolve_user_id(request, db)
    profile = await students_svc.upsert_student_profile(db, user.id, body)
    return StudentProfileRead.model_validate(profile)


# ---------------------------------------------------------------------------
# GET /api/v1/me/student-profile
# ---------------------------------------------------------------------------


@router.get("/me/student-profile", response_model=StudentProfileRead)
async def get_student_profile(
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfileRead:
    """Return the student profile for the authenticated user.

    Returns 404 if the profile has not been created yet (the student
    has not submitted the profile form).
    """
    user = await _resolve_user_id(request, db)
    profile = await students_svc.get_profile_by_user_id(db, user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found — submit the profile form first",
        )
    return StudentProfileRead.model_validate(profile)


# ---------------------------------------------------------------------------
# POST /api/v1/me/github-connect
# ---------------------------------------------------------------------------


@router.post("/me/github-connect", response_model=StudentProfileRead)
async def github_connect(
    body: GitHubConnectRequest,
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfileRead:
    """Store the student's verified GitHub username on their profile.

    The username is normalised to lowercase before storage.  If the student
    has no profile yet, a minimal stub is created automatically so the
    username is never lost.

    Note: this endpoint accepts the username directly.  For GitHub OAuth
    (where the username is fetched from GitHub's API after code exchange),
    use POST /api/v1/auth/github instead.
    """
    user = await _resolve_user_id(request, db)
    profile = await students_svc.connect_github(db, user.id, body.github_username)
    return StudentProfileRead.model_validate(profile)
