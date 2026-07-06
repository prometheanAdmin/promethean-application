"""Students repository — all raw DB I/O for the students module.

Layer order:  Router → Service → Repository → DB
Cross-module: other modules must call students.service, not this module.

All functions flush but do NOT commit — the service layer owns transactions.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.students.models import StudentProfile

log = structlog.get_logger(__name__)


async def get_student_profile_by_user_id(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> StudentProfile | None:
    """Return the StudentProfile row for the given user UUID, or None.

    Uses the ``user_id`` unique index — this is a primary lookup path so
    the index on student_profiles.user_id is critical for latency.
    """
    result = await session.execute(
        select(StudentProfile).where(StudentProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_student_profile(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    education: str | None,
    skills: list[str],
    career_goals: str | None,
    domain_id: uuid.UUID | None,
    profile_complete: bool,
) -> StudentProfile:
    """INSERT a new StudentProfile row and flush so the PK is populated.

    profile_complete is computed by the service before this call — the
    repository does not contain business logic.

    Caller is responsible for the surrounding transaction.
    """
    profile = StudentProfile(
        user_id=user_id,
        education=education,
        skills=skills,
        career_goals=career_goals,
        domain_id=domain_id,
        profile_complete=profile_complete,
    )
    session.add(profile)
    await session.flush()
    log.info("students.repo.profile_created", user_id=str(user_id))
    return profile


async def update_student_profile(
    session: AsyncSession,
    profile: StudentProfile,
    *,
    education: str | None,
    skills: list[str],
    career_goals: str | None,
    domain_id: uuid.UUID | None,
    github_username: str | None,
    profile_complete: bool,
) -> StudentProfile:
    """Set all mutable fields on an existing StudentProfile ORM object and flush.

    The service computes the final value of every field (merging the payload
    with the current DB state) before calling here.  The repository sets all
    of them atomically so there are no partial-write windows.

    The DB-side ``set_updated_at`` trigger updates ``updated_at`` on flush.
    Caller is responsible for the surrounding transaction.
    """
    profile.education = education
    profile.skills = skills
    profile.career_goals = career_goals
    profile.domain_id = domain_id
    profile.github_username = github_username
    profile.profile_complete = profile_complete
    await session.flush()
    log.debug("students.repo.profile_updated", user_id=str(profile.user_id))
    return profile
