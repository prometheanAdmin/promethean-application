from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.modules.identity.models import User
from app.modules.students.models import StudentProfile
from app.modules.students.schemas import StudentProfileRead, StudentProfileUpdate

router = APIRouter(prefix="/api/v1", tags=["students"])


@router.get("/students/", response_model=list[StudentProfileRead])
async def list_students(
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[StudentProfileRead]:
    result = await db.execute(select(StudentProfile))
    profiles = result.scalars().all()
    return [StudentProfileRead.model_validate(p) for p in profiles]


@router.put("/me/student-profile", response_model=StudentProfileRead)
async def upsert_student_profile(
    body: StudentProfileUpdate,
    request: Request,
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudentProfileRead:
    """Create or update the student profile for the authenticated user."""
    clerk_user_id: str = request.state.user_id

    # Resolve the local user row
    user_result = await db.execute(
        select(User).where(User.clerk_user_id == clerk_user_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    # Upsert the student profile
    profile_result = await db.execute(
        select(StudentProfile).where(StudentProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()

    if profile is None:
        profile = StudentProfile(user_id=user.id)
        db.add(profile)

    if body.cohort is not None:
        profile.cohort = body.cohort
    if body.timezone is not None:
        profile.timezone = body.timezone

    await db.commit()
    await db.refresh(profile)
    return StudentProfileRead.model_validate(profile)
