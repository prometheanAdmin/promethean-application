"""Mentors repository — all raw DB I/O for the mentors module.

Layer order:  Router → Service → Repository → DB
Cross-module: other modules must call mentors.service, not this module.

All mutation functions flush but do NOT commit — the service layer owns
transactions.  Read-only helpers commit nothing.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.mentors.models import MentorProfile

log = structlog.get_logger(__name__)


async def get_mentor_profile_by_user_id(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> MentorProfile | None:
    """Return the MentorProfile row for the given user UUID, or None."""
    result = await session.execute(
        select(MentorProfile).where(MentorProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_mentor_profile_by_id(
    session: AsyncSession,
    profile_id: uuid.UUID,
) -> MentorProfile | None:
    """Return a MentorProfile by its own primary key."""
    result = await session.execute(
        select(MentorProfile).where(MentorProfile.id == profile_id)
    )
    return result.scalar_one_or_none()


async def create_mentor_profile(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    bio: str | None,
    company: str | None,
    experience_yrs: int | None,
    domains: list[str],
    github_username: str | None,
) -> MentorProfile:
    """INSERT a new MentorProfile row and flush so the PK is populated.

    is_verified defaults to False at the DB level — only admins can verify.
    Caller is responsible for the surrounding transaction.
    """
    profile = MentorProfile(
        user_id=user_id,
        bio=bio,
        company=company,
        experience_yrs=experience_yrs,
        domains=domains,
        github_username=github_username,
    )
    session.add(profile)
    await session.flush()
    log.info("mentors.repo.profile_created", user_id=str(user_id))
    return profile


async def update_mentor_profile(
    session: AsyncSession,
    profile: MentorProfile,
    *,
    bio: str | None,
    company: str | None,
    experience_yrs: int | None,
    domains: list[str],
    github_username: str | None,
) -> MentorProfile:
    """Mutate all editable fields on an existing MentorProfile and flush.

    The service computes the final merged values before calling here so there
    are no partial-write windows.  The DB trigger updates updated_at.
    Caller is responsible for the surrounding transaction.
    """
    profile.bio = bio
    profile.company = company
    profile.experience_yrs = experience_yrs
    profile.domains = domains
    profile.github_username = github_username
    await session.flush()
    log.debug("mentors.repo.profile_updated", user_id=str(profile.user_id))
    return profile


async def set_verified(
    session: AsyncSession,
    profile: MentorProfile,
    *,
    is_verified: bool,
) -> MentorProfile:
    """Update the is_verified flag and flush.

    Caller (mentors.service.verify_mentor) owns the transaction and handles
    the post-commit email notification.
    """
    profile.is_verified = is_verified
    await session.flush()
    return profile


async def list_verified_mentors(
    session: AsyncSession,
    *,
    domain_id: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[MentorProfile]:
    """Return is_verified=True mentors, optionally filtered by a domain string.

    ``domain`` here is a UUID string stored inside the JSONB ``domains`` array.
    We use the PostgreSQL ``@>`` (contains) operator via a raw cast so no ORM
    extension is required.

    Ordered by rating_avg DESC NULLS LAST so best-rated mentors appear first.
    """
    q = select(MentorProfile).where(MentorProfile.is_verified.is_(True))

    if domain_id is not None:
        # JSONB @> (array contains element) — cast UUID to text and wrap in array
        q = q.where(
            MentorProfile.domains.contains([str(domain_id)])
        )

    q = (
        q.order_by(MentorProfile.rating_avg.desc().nulls_last())
        .limit(per_page)
        .offset((page - 1) * per_page)
    )
    result = await session.execute(q)
    return list(result.scalars().all())


async def count_verified_mentors(
    session: AsyncSession,
    *,
    domain_id: str | None = None,
) -> int:
    """Return total count for the same filter as list_verified_mentors.

    Run alongside list_verified_mentors via asyncio.gather() for pagination
    metadata without an extra round-trip delay.
    """
    q = select(func.count()).select_from(MentorProfile).where(
        MentorProfile.is_verified.is_(True)
    )
    if domain_id is not None:
        q = q.where(MentorProfile.domains.contains([str(domain_id)]))
    result = await session.scalar(q)
    return int(result) if result is not None else 0


async def get_mentor_email_by_profile_id(
    session: AsyncSession,
    mentor_profile_id: uuid.UUID,
) -> str | None:
    """Return the email for a mentor profile via a raw SQL join.

    Crosses into the users table via SQL only — no ORM import from identity.
    Used exclusively by the verify_mentor service function to send email.
    """
    from sqlalchemy import text  # local import keeps top-level imports clean

    row = await session.execute(
        text(
            "SELECT u.email FROM users u "
            "JOIN mentor_profiles mp ON mp.user_id = u.id "
            "WHERE mp.id = :mid"
        ),
        {"mid": str(mentor_profile_id)},
    )
    result = row.first()
    return str(result[0]) if result else None
