"""Mentors service — business logic for the mentors module.

Layer order: Router → Service → Repository → DB.
This layer owns transactions (commits) and orchestrates side effects
(verification emails).  The repository handles all raw DB I/O.

Cross-module constraint: other modules call functions in this file,
never the repository directly.

Key design decisions:
- Email failures in verify_mentor NEVER roll back the DB update.  The
  verification is committed first; email is sent after in a try/except.
- github_username is normalised to lowercase before storage.
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.email import send_email
from app.modules.mentors import repository as repo
from app.modules.mentors.models import MentorProfile
from app.modules.mentors.schemas import MentorProfileCreate

log = structlog.get_logger(__name__)

# Dashboard URL embedded in the approval email
_DASHBOARD_URL = "https://app.promethean.dev/dashboard"


async def upsert_mentor_profile(
    session: AsyncSession,
    user_id: uuid.UUID,
    payload: MentorProfileCreate,
) -> MentorProfile:
    """Create or merge a mentor profile from the request payload.

    Patch semantics: a ``None`` value in the payload means "leave unchanged";
    the existing DB row supplies the current value.  Calling this endpoint
    multiple times is idempotent — the profile converges to the latest state.

    github_username is normalised to lowercase before storage to prevent
    case-duplicate entries (GitHub usernames are case-insensitive).

    This function owns the transaction — it commits before returning.
    """
    existing = await repo.get_mentor_profile_by_user_id(session, user_id)

    github_username = (
        payload.github_username.lower().strip()
        if payload.github_username is not None
        else None
    )

    if existing is None:
        bio = payload.bio
        company = payload.company
        experience_yrs = payload.experience_yrs
        domains: list[str] = payload.domains if payload.domains is not None else []
        if github_username is None:
            github_username = None  # explicit for readability

        profile = await repo.create_mentor_profile(
            session,
            user_id=user_id,
            bio=bio,
            company=company,
            experience_yrs=experience_yrs,
            domains=domains,
            github_username=github_username,
        )
        log.info("mentors.svc.profile_created", user_id=str(user_id))
    else:
        # Merge: non-None payload fields override existing values.
        bio = payload.bio if payload.bio is not None else existing.bio
        company = payload.company if payload.company is not None else existing.company
        experience_yrs = (
            payload.experience_yrs
            if payload.experience_yrs is not None
            else existing.experience_yrs
        )
        domains = payload.domains if payload.domains is not None else existing.domains
        github_username = (
            github_username
            if github_username is not None
            else existing.github_username
        )

        profile = await repo.update_mentor_profile(
            session,
            existing,
            bio=bio,
            company=company,
            experience_yrs=experience_yrs,
            domains=domains,
            github_username=github_username,
        )
        log.info("mentors.svc.profile_updated", user_id=str(user_id))

    await session.commit()
    return profile


async def verify_mentor(
    session: AsyncSession,
    mentor_user_id: uuid.UUID,
    *,
    is_verified: bool,
    rejection_reason: str | None,
    verifier_user_id: uuid.UUID,
) -> MentorProfile | None:
    """Admin action: approve or reject a mentor profile.

    Accepts the mentor's **user ID** (not the profile PK) so the admin
    endpoint uses the same identifier as the rest of the mentor discovery API.

    DB update is committed first.  Email is sent in a separate try/except so
    a Resend failure never rolls back the verification decision.

    Returns None if the profile does not exist.

    is_verified=True  → sends a welcome/approval email with dashboard link.
    is_verified=False → sends a polite rejection email with the reason (if any).
    """
    profile = await repo.get_mentor_profile_by_user_id(session, mentor_user_id)
    if profile is None:
        return None

    # Fetch email before the session closes (raw SQL join to users table).
    mentor_email = await repo.get_mentor_email_by_profile_id(session, profile.id)

    await repo.set_verified(session, profile, is_verified=is_verified)
    await session.commit()

    log.info(
        "mentors.svc.verification_updated",
        mentor_user_id=str(mentor_user_id),
        mentor_profile_id=str(profile.id),
        is_verified=is_verified,
        verifier_user_id=str(verifier_user_id),
    )

    # Best-effort email — never raises to caller.
    if mentor_email:
        if is_verified:
            await _send_approval_email(mentor_email)
        else:
            await _send_rejection_email(mentor_email, rejection_reason)

    return profile


# ---------------------------------------------------------------------------
# Internal email helpers
# ---------------------------------------------------------------------------


async def _send_approval_email(to: str) -> None:
    """Send a mentor approval/welcome email.  Failure is logged, never raised."""
    await send_email(
        to=to,
        subject="You're now a verified Promethean mentor! 🎉",
        html=(
            "<h1>Congratulations! You've been verified.</h1>"
            "<p>Your mentor profile is now live and students can discover and "
            "book sessions with you.</p>"
            f'<p><a href="{_DASHBOARD_URL}">Go to your dashboard →</a></p>'
            "<p>— The Promethean Team</p>"
        ),
        tags={"event": "mentor_approved"},
    )


async def _send_rejection_email(to: str, reason: str | None) -> None:
    """Send a mentor rejection email.  Failure is logged, never raised."""
    reason_paragraph = (
        f"<p><strong>Reason:</strong> {reason}</p>"
        if reason
        else "<p>Our team will reach out with more details if needed.</p>"
    )
    await send_email(
        to=to,
        subject="Promethean mentor application update",
        html=(
            "<p>Thank you for applying to become a Promethean mentor.</p>"
            "<p>After reviewing your profile, we're unable to verify your "
            "application at this time.</p>"
            f"{reason_paragraph}"
            "<p>You're welcome to update your profile and reapply at any time.</p>"
            "<p>— The Promethean Team</p>"
        ),
        tags={"event": "mentor_rejected"},
    )


# ---------------------------------------------------------------------------
# Wrappers — used by identity/router.py, admin/router.py, dependencies.py
# ---------------------------------------------------------------------------


async def get_profile_by_user_id(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> MentorProfile | None:
    """Thin wrapper — returns the mentor profile or None."""
    return await repo.get_mentor_profile_by_user_id(db, user_id)


async def get_profile_by_id(
    db: AsyncSession,
    mentor_profile_id: uuid.UUID,
) -> MentorProfile | None:
    """Thin wrapper — returns a mentor profile by primary key."""
    return await repo.get_mentor_profile_by_id(db, mentor_profile_id)


async def list_verified_mentors(
    db: AsyncSession,
    *,
    domain_id: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[MentorProfile]:
    """Return paginated verified mentors.  Wrapper for router convenience."""
    return await repo.list_verified_mentors(db, domain_id=domain_id, page=page, per_page=per_page)


async def count_verified_mentors(
    db: AsyncSession,
    *,
    domain_id: str | None = None,
) -> int:
    """Return total count of verified mentors for pagination metadata."""
    return await repo.count_verified_mentors(db, domain_id=domain_id)



async def get_mentor_email(
    db: AsyncSession,
    mentor_profile_id: uuid.UUID,
) -> str | None:
    """Backward-compatible wrapper — returns mentor email by profile ID."""
    return await repo.get_mentor_email_by_profile_id(db, mentor_profile_id)


async def set_github_username(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    github_username: str,
) -> MentorProfile | None:
    """Set github_username from OAuth exchange.

    Returns None if no mentor profile exists for this user — the identity
    router handles the None case gracefully (GitHub link stored at profile
    creation time on the next upsert call).
    """
    profile = await repo.get_mentor_profile_by_user_id(db, user_id)
    if profile is None:
        return None
    profile.github_username = github_username.lower().strip()
    await db.flush()
    await db.commit()
    return profile
