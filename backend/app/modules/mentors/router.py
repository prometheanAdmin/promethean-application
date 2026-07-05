from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.modules.identity.models import User
from app.modules.mentors.models import MentorProfile
from app.modules.mentors.schemas import MentorProfileRead, MentorProfileUpdate

router = APIRouter(prefix="/api/v1", tags=["mentors"])


@router.get("/mentors/", response_model=list[MentorProfileRead])
async def list_mentors(
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MentorProfileRead]:
    result = await db.execute(select(MentorProfile))
    profiles = result.scalars().all()
    return [MentorProfileRead.model_validate(p) for p in profiles]


@router.put("/me/mentor-profile", response_model=MentorProfileRead)
async def upsert_mentor_profile(
    body: MentorProfileUpdate,
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MentorProfileRead:
    """Create or update the mentor profile for the authenticated user."""
    clerk_user_id: str = request.state.user_id

    user_result = await db.execute(
        select(User).where(User.clerk_user_id == clerk_user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    profile_result = await db.execute(
        select(MentorProfile).where(MentorProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if profile is None:
        profile = MentorProfile(user_id=user.id)
        db.add(profile)

    if body.expertise is not None:
        profile.expertise = body.expertise
    if body.timezone is not None:
        profile.timezone = body.timezone

    await db.commit()
    await db.refresh(profile)
    return MentorProfileRead.model_validate(profile)
