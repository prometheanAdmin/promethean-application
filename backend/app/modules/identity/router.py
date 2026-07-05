from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.dependencies import get_current_user, get_db
from app.modules.identity.models import Role, User
from app.modules.identity.schemas import AuthSyncRequest, MeResponse, UserContext
from app.modules.mentors.models import MentorProfile
from app.modules.students.models import StudentProfile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["identity"])


@router.post("/auth/sync", status_code=200)
async def auth_sync(
    body: AuthSyncRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Upsert the Clerk user into the local DB and back-fill publicMetadata.

    Called by the frontend immediately after sign-in.  Idempotent.

    Side-effect: writes ``role`` to Clerk's ``publicMetadata`` so the JWT
    template (``{{ user.public_metadata.role }}``) starts including it on the
    next token refresh — no manual Clerk Dashboard step required.
    """
    clerk_user_id: str = request.state.user_id  # set by ClerkAuthMiddleware

    result = await db.execute(select(User).where(User.clerk_user_id == clerk_user_id))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            clerk_user_id=clerk_user_id,
            email=str(body.email),
            first_name=body.first_name,
            last_name=body.last_name,
            role=Role(body.role),
        )
        db.add(user)
    else:
        user.email = str(body.email)
        if body.first_name is not None:
            user.first_name = body.first_name
        if body.last_name is not None:
            user.last_name = body.last_name

    await db.commit()

    # Best-effort: write the role into Clerk publicMetadata so the JWT template
    # can embed it.  Don't fail the request if the Clerk API is unreachable.
    await _push_role_to_clerk(clerk_user_id, user.role.value)

    return {"status": "ok"}


async def _push_role_to_clerk(clerk_user_id: str, role: str) -> None:
    """PATCH /v1/users/{id} to set publicMetadata.role in Clerk.

    This makes the JWT template ``{{ user.public_metadata.role }}`` work
    automatically for every subsequent token issued to this user.
    """
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        return

    url = f"https://api.clerk.com/v1/users/{clerk_user_id}"
    payload = {"public_metadata": {"role": role}}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.patch(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            )
            if resp.status_code not in (200, 201):
                logger.warning(
                    "Clerk publicMetadata sync failed for %s: %s %s",
                    clerk_user_id,
                    resp.status_code,
                    resp.text[:200],
                )
    except Exception:
        logger.exception("Clerk publicMetadata sync error for %s", clerk_user_id)


@router.get("/me", response_model=MeResponse)
async def read_me(
    request: Request,
    _user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeResponse:
    """Return the full user record for the authenticated caller.

    ``profile_complete`` is True once the caller has submitted their role-specific
    profile (student_profile or mentor_profile row exists and has required fields).
    """
    clerk_user_id: str = request.state.user_id

    result = await db.execute(
        select(User)
        .where(User.clerk_user_id == clerk_user_id)
        .options(
            selectinload(User.student_profile),
            selectinload(User.mentor_profile),
        )
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    return MeResponse(
        id=user.id,
        clerk_user_id=user.clerk_user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,  # type: ignore[arg-type]
        profile_complete=_is_profile_complete(user),
        created_at=user.created_at,
    )


@router.get("/identity/me", response_model=UserContext, deprecated=True)
async def read_current_identity(request: Request) -> UserContext:
    """Legacy endpoint — use GET /api/v1/me instead."""
    return UserContext(
        user_id=getattr(request.state, "user_id", None),
        roles=getattr(request.state, "roles", []) or [],
        email=getattr(request.state, "email", None),
    )


def _is_profile_complete(user: User) -> bool:
    if user.role == Role.ADMIN:
        return True
    if user.role == Role.STUDENT:
        p: StudentProfile | None = user.student_profile
        return p is not None and bool(p.cohort)
    if user.role == Role.MENTOR:
        m: MentorProfile | None = user.mentor_profile
        return m is not None and bool(m.expertise)
    return False
