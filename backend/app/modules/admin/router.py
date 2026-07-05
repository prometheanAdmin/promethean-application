from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies import get_admin_db, require_role
from app.modules.admin.models import Domain
from app.modules.admin.schemas import (
    AdminUserRead,
    DomainCreate,
    DomainRead,
    DomainUpdate,
    MentorVerifyResponse,
)
from app.modules.identity.models import User
from app.modules.mentors.models import MentorProfile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/ping", dependencies=[Depends(require_role("admin"))])
async def admin_ping() -> dict[str, str]:
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# KAN-27 — GET /api/v1/admin/users
# ---------------------------------------------------------------------------


@router.get(
    "/users",
    response_model=list[AdminUserRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_users(
    db: AsyncSession = Depends(get_admin_db),
) -> list[AdminUserRead]:
    """Return all registered users.  Admin-only."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [AdminUserRead.model_validate(u) for u in users]


# ---------------------------------------------------------------------------
# KAN-28 — PUT /api/v1/admin/mentors/:id/verify
# ---------------------------------------------------------------------------


@router.put(
    "/mentors/{mentor_profile_id}/verify",
    response_model=MentorVerifyResponse,
    dependencies=[Depends(require_role("admin"))],
)
async def verify_mentor(
    mentor_profile_id: int,
    db: AsyncSession = Depends(get_admin_db),
) -> MentorVerifyResponse:
    """Mark a mentor as verified and send a welcome e-mail via Resend."""
    result = await db.execute(
        select(MentorProfile).where(MentorProfile.id == mentor_profile_id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mentor profile {mentor_profile_id} not found",
        )

    profile.is_verified = True
    await db.commit()
    await db.refresh(profile)

    # Send verification e-mail (best-effort — don't fail the request on error)
    await _send_mentor_verified_email(profile)

    return MentorVerifyResponse.model_validate(profile)


async def _send_mentor_verified_email(profile: MentorProfile) -> None:
    settings = get_settings()
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — skipping verification email")
        return

    try:
        import resend  # type: ignore[import-untyped]

        resend.api_key = settings.RESEND_API_KEY

        # Fetch the mentor's email via the user relationship
        mentor_email: str | None = None
        if profile.user is not None:
            mentor_email = profile.user.email

        if not mentor_email:
            logger.warning("Mentor profile %s has no associated email", profile.id)
            return

        resend.Emails.send(
            {
                "from": "Promethean <noreply@promethean.dev>",
                "to": [mentor_email],
                "subject": "You're now a verified Promethean mentor!",
                "html": (
                    "<h1>Congratulations!</h1>"
                    "<p>Your mentor profile has been verified. "
                    "Students can now book sessions with you.</p>"
                    "<p>— The Promethean Team</p>"
                ),
            }
        )
    except Exception:
        logger.exception("Failed to send mentor verification email for profile %s", profile.id)


# ---------------------------------------------------------------------------
# KAN-29 — POST /api/v1/admin/domains  +  PUT /api/v1/admin/domains/:id
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
    existing = await db.execute(select(Domain).where(Domain.name == body.name))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Domain '{body.name}' already exists",
        )

    domain = Domain(name=body.name, description=body.description)
    db.add(domain)
    await db.commit()
    await db.refresh(domain)
    return DomainRead.model_validate(domain)


@router.put(
    "/domains/{domain_id}",
    response_model=DomainRead,
    dependencies=[Depends(require_role("admin"))],
)
async def update_domain(
    domain_id: int,
    body: DomainUpdate,
    db: AsyncSession = Depends(get_admin_db),
) -> DomainRead:
    """Update an existing domain.  Admin-only."""
    result = await db.execute(select(Domain).where(Domain.id == domain_id))
    domain = result.scalar_one_or_none()
    if domain is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Domain {domain_id} not found",
        )

    if body.name is not None:
        domain.name = body.name
    if body.description is not None:
        domain.description = body.description

    await db.commit()
    await db.refresh(domain)
    return DomainRead.model_validate(domain)


@router.get(
    "/domains",
    response_model=list[DomainRead],
    dependencies=[Depends(require_role("admin"))],
)
async def list_domains(
    db: AsyncSession = Depends(get_admin_db),
) -> list[DomainRead]:
    result = await db.execute(select(Domain).order_by(Domain.name))
    domains = result.scalars().all()
    return [DomainRead.model_validate(d) for d in domains]
