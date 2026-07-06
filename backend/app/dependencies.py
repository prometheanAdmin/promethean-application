"""FastAPI dependency functions shared across all routers.

Session hierarchy:
- get_public_db  — no auth; used for public endpoints (POST /auth/sync)
- get_db         — JWT required; RLS context set to the caller's Clerk user ID
- get_admin_db   — JWT + admin role required; RLS bypassed for admin writes

Layer: dependencies live between Router and Service — they validate auth and
provide a DB session but contain no business logic.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal


async def _set_request_rls_context(
    session: AsyncSession,
    *,
    current_user_id: str,
    bypass_rls: bool,
) -> None:
    """Set per-request PostgreSQL settings for RLS-aware queries.

    `SET LOCAL ... = :bind` is not parameterizable on asyncpg/PostgreSQL, so
    we use `set_config(..., is_local := true)` to safely pass bound values.
    """
    await session.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": current_user_id},
    )
    await session.execute(
        text("SELECT set_config('app.bypass_rls', :bypass, true)"),
        {"bypass": "1" if bypass_rls else "0"},
    )


async def get_current_user(request: Request) -> dict[str, Any]:
    """FastAPI dependency — returns the authenticated user's context dict.

    Only ``user_id`` (from JWT ``sub``) is required.  ``roles`` defaults to an
    empty list when the JWT lacks a ``roles`` claim (Clerk does not include one
    unless a custom JWT template is configured).  ``email`` is optional for the
    same reason.
    """
    user_id = getattr(request.state, "user_id", None)

    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    roles = getattr(request.state, "roles", None)
    roles = roles if isinstance(roles, list) else []

    return {
        "user_id": user_id,
        "roles": [r for r in roles if isinstance(r, str)],
        "email": getattr(request.state, "email", None),
    }


def require_role(role: str) -> Callable[[Request], Awaitable[dict[str, Any]]]:
    """Dependency factory: gate a route on a specific role from the JWT."""

    async def dependency(request: Request) -> dict[str, Any]:
        user = await get_current_user(request)
        if role not in user["roles"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions — role '{role}' required",
            )
        return user

    return dependency


async def get_public_db() -> AsyncGenerator[AsyncSession]:
    """DB session for public (unauthenticated) endpoints.

    No JWT validation.  Used exclusively for POST /api/v1/auth/sync which is
    intentionally public — the frontend calls it right after Clerk sign-in
    before a full session token is available.

    The service layer (sync_clerk_user) opens its own transaction and sets
    ``SET LOCAL app.bypass_rls = '1'`` inside it.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_db(request: Request) -> AsyncGenerator[AsyncSession]:
    """DB session with RLS user context set for the authenticated caller."""
    user = await get_current_user(request)
    async with AsyncSessionLocal() as session:
        await _set_request_rls_context(
            session,
            current_user_id=user["user_id"],
            bypass_rls=False,
        )
        try:
            yield session
        finally:
            await session.close()


async def get_admin_db(request: Request) -> AsyncGenerator[AsyncSession]:
    """DB session with RLS bypassed — for admin routes only.

    Callers must also declare ``Depends(require_role('admin'))`` to ensure only
    admins reach this dependency.
    """
    user = await get_current_user(request)
    if "admin" not in user["roles"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions — role 'admin' required",
        )
    async with AsyncSessionLocal() as session:
        await _set_request_rls_context(
            session,
            current_user_id=user["user_id"],
            bypass_rls=True,
        )
        try:
            yield session
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# require_profile_complete — KAN-26 / BE-013
# Defined after get_db so the Depends(get_db) default is resolvable.
# ---------------------------------------------------------------------------


async def require_profile_complete(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Gate: block access until the calling user has a complete profile.

    KAN-26 / BE-013 — applied to all dashboard-facing endpoints except the
    profile completion endpoints themselves (PUT /me/student-profile and
    PUT /me/mentor-profile).

    Returns HTTP 403 with a structured body:
        {"code": "PROFILE_INCOMPLETE", "message": "..."}

    The frontend reads ``code`` specifically and redirects to the profile
    form — it does NOT treat this as a generic authentication failure.

    Rules:
    - Admins: always pass (no profile required).
    - Students: pass only when ``profile_complete = True``.
    - Mentors (not also a student): pass once a profile row exists
      (``is_verified`` is a separate admin gate, not a profile-completion gate).
    """
    from app.modules.identity import service as identity_svc
    from app.modules.mentors import service as mentors_svc
    from app.modules.students import service as students_svc

    roles: list[str] = current_user["roles"]

    # Admins bypass the profile gate entirely.
    if "admin" in roles:
        return current_user

    clerk_user_id = str(current_user["user_id"])
    user = await identity_svc.get_user_by_clerk_id(session, clerk_user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    if "student" in roles:
        student_profile = await students_svc.get_profile_by_user_id(session, user.id)
        if student_profile is None or not student_profile.profile_complete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "PROFILE_INCOMPLETE",
                    "message": "Complete your profile before accessing the dashboard.",
                },
            )

    if "mentor" in roles and "student" not in roles:
        mentor_profile = await mentors_svc.get_profile_by_user_id(session, user.id)
        if mentor_profile is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "PROFILE_INCOMPLETE",
                    "message": "Complete your mentor profile to continue.",
                },
            )

    return current_user
