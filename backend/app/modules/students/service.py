"""Students service — business logic for the students module.

Layer order: Router → Service → Repository → DB.
This layer owns transactions: it commits at the end of each operation.

Cross-module constraint: other modules call functions in this file,
never the repository directly.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.students import repository as repo
from app.modules.students.models import StudentProfile
from app.modules.students.schemas import StudentProfileCreate, StudentProfileUpdate

log = structlog.get_logger(__name__)


def _compute_profile_complete(
    education: str | None,
    career_goals: str | None,
    domain_id: uuid.UUID | None,
) -> bool:
    """profile_complete = bool(education AND career_goals AND domain_id).

    Spec-mandated formula.  github_username is NOT part of completeness.
    """
    return bool(education and career_goals and domain_id)


async def upsert_student_profile(
    session: AsyncSession,
    user_id: uuid.UUID,
    payload: StudentProfileCreate | StudentProfileUpdate,
) -> StudentProfile:
    """Create or merge a student profile from the request payload.

    Patch semantics for StudentProfileUpdate: a ``None`` value in the
    payload means "leave unchanged"; the existing DB row supplies the
    current value.  StudentProfileCreate is treated the same way — omitted
    fields default to ``None`` / ``[]`` and do not overwrite existing data
    if a profile row already exists (idempotent first-create is safe).

    ``profile_complete`` is recomputed from the merged state after every
    call using the spec formula: bool(education AND career_goals AND domain_id).

    This function owns the transaction — it commits before returning.
    """
    existing = await repo.get_student_profile_by_user_id(session, user_id)

    if existing is None:
        # First submission — use payload values directly; None stays None.
        education = payload.education
        career_goals = payload.career_goals
        domain_id = payload.domain_id
        # skills: StudentProfileCreate defaults to []; StudentProfileUpdate to None
        skills: list[str] = payload.skills if payload.skills is not None else []
        github_username: str | None = None

        profile_complete = _compute_profile_complete(education, career_goals, domain_id)

        profile = await repo.create_student_profile(
            session,
            user_id=user_id,
            education=education,
            skills=skills,
            career_goals=career_goals,
            domain_id=domain_id,
            profile_complete=profile_complete,
        )
        log.info(
            "students.svc.profile_created",
            user_id=str(user_id),
            profile_complete=profile_complete,
        )
    else:
        # Merge: non-None payload fields override existing values.
        education = payload.education if payload.education is not None else existing.education
        career_goals = (
            payload.career_goals if payload.career_goals is not None else existing.career_goals
        )
        domain_id = payload.domain_id if payload.domain_id is not None else existing.domain_id
        skills = payload.skills if payload.skills is not None else existing.skills
        # github_username is only modified via connect_github — preserve it here.
        github_username = existing.github_username

        profile_complete = _compute_profile_complete(education, career_goals, domain_id)

        profile = await repo.update_student_profile(
            session,
            existing,
            education=education,
            skills=skills,
            career_goals=career_goals,
            domain_id=domain_id,
            github_username=github_username,
            profile_complete=profile_complete,
        )
        log.info(
            "students.svc.profile_updated",
            user_id=str(user_id),
            profile_complete=profile_complete,
        )

    await session.commit()
    return profile


async def connect_github(
    session: AsyncSession,
    user_id: uuid.UUID,
    github_username: str,
) -> StudentProfile:
    """Record the authenticated GitHub username on the student profile.

    Normalises ``github_username`` to lowercase + strip before storage to
    prevent case-duplicate entries (GitHub usernames are case-insensitive).

    Creates a minimal placeholder profile if none exists so the username
    is never lost even when the student hasn't filled out the rest of the
    form yet.  profile_complete is NOT affected by this call — only the
    spec-mandated fields (education, career_goals, domain_id) determine it.

    This function owns the transaction.
    """
    username = github_username.lower().strip()
    existing = await repo.get_student_profile_by_user_id(session, user_id)

    if existing is None:
        # Create a minimal profile stub so the username is persisted.
        profile = await repo.create_student_profile(
            session,
            user_id=user_id,
            education=None,
            skills=[],
            career_goals=None,
            domain_id=None,
            profile_complete=False,
        )
        profile.github_username = username
        await session.flush()
        log.info(
            "students.svc.github_connected_with_stub",
            user_id=str(user_id),
            github_username=username,
        )
    else:
        profile = await repo.update_student_profile(
            session,
            existing,
            education=existing.education,
            skills=existing.skills,
            career_goals=existing.career_goals,
            domain_id=existing.domain_id,
            github_username=username,
            profile_complete=existing.profile_complete,
        )
        log.info(
            "students.svc.github_connected",
            user_id=str(user_id),
            github_username=username,
        )

    await session.commit()
    return profile


# ---------------------------------------------------------------------------
# Wrappers — used by dependencies.py and identity/router.py
# ---------------------------------------------------------------------------


async def get_profile_by_user_id(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> StudentProfile | None:
    """Return the student profile for the given user_id, or None.

    Thin wrapper around the repository — callers outside this module
    should use this instead of importing the repository directly.
    """
    return await repo.get_student_profile_by_user_id(db, user_id)


async def set_github_username(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    github_username: str,
) -> StudentProfile:
    """Backward-compatible wrapper — delegates to connect_github.

    Used by identity/router.py after a successful GitHub OAuth exchange.
    Always returns a StudentProfile (creates a stub if none exists).
    """
    return await connect_github(db, user_id, github_username)
