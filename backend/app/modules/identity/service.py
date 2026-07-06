"""Identity service layer — business logic for user provisioning and lookup.

Layer order:  Router → Service → Repository → DB

All DB access goes through identity.repository.  Other modules must call
functions from this module rather than touching identity.models directly.

Transaction ownership:
- sync_clerk_user() owns its own transaction (opens session.begin() internally)
  so the caller must pass a *clean* session (get_public_db dependency).
- All other functions work within the caller's transaction (get_db dependency).
"""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity import repository as repo
from app.modules.identity.models import User
from app.modules.identity.schemas import AuthSyncRequest, AuthSyncResponse

log = structlog.get_logger(__name__)

# Ordered by privilege — used to determine the "primary" role.
_ROLE_PRIORITY: list[str] = ["admin", "mentor", "student"]


# ---------------------------------------------------------------------------
# Core Step-2 functions
# ---------------------------------------------------------------------------


async def sync_clerk_user(
    session: AsyncSession,
    *,
    payload: AuthSyncRequest,
) -> AuthSyncResponse:
    """Upsert the local user row from a Clerk auth/sync call.

    This function OWNS its transaction:
      - It opens ``async with session.begin()``.
      - The caller MUST pass a clean session (no prior transaction).
      - Use the ``get_public_db`` FastAPI dependency — NOT ``get_db``.

    Inside the transaction we:
      1. SET LOCAL app.bypass_rls = '1'   (skip RLS — no user context yet)
      2. Fetch or create the User row.
      3. Upsert the (user_id, role) row in user_roles — idempotent.

    Returns AuthSyncResponse with ``is_new_user=True`` on first call so the
    frontend can redirect to the onboarding flow.
    """
    email = str(payload.email).lower().strip()
    is_new_user = False

    async with session.begin():
        # Bypass RLS — this endpoint runs before the user has a session.
        await session.execute(text("SET LOCAL app.bypass_rls = '1'"))

        existing = await repo.get_user_by_clerk_id(session, payload.clerk_user_id)
        seeded_user = None if existing is not None else await repo.get_user_by_email(session, email)

        if existing is None:
            if seeded_user is None:
                user = await repo.create_user(
                    session,
                    clerk_user_id=payload.clerk_user_id,
                    email=email,
                    first_name=payload.first_name,
                    last_name=payload.last_name,
                    avatar_url=payload.avatar_url,
                )
                is_new_user = True
                log.info(
                    "identity.service.user_created",
                    clerk_user_id=payload.clerk_user_id,
                    role=payload.role,
                )
            else:
                # Demo/seeded rows may be created before the user ever signs in with
                # Clerk. Bind the real Clerk user_id to the existing email row so the
                # frontend lands on the seeded profile/enrollment instead of creating
                # a duplicate account on first login.
                seeded_user.clerk_user_id = payload.clerk_user_id
                user = await repo.update_user_fields(
                    session,
                    seeded_user,
                    email=email,
                    first_name=payload.first_name,
                    last_name=payload.last_name,
                    avatar_url=payload.avatar_url,
                )
                log.info(
                    "identity.service.seeded_user_bound_to_clerk",
                    clerk_user_id=payload.clerk_user_id,
                    email=email,
                    user_id=str(user.id),
                )
        else:
            user = await repo.update_user_fields(
                session,
                existing,
                email=email,
                first_name=payload.first_name,
                last_name=payload.last_name,
                avatar_url=payload.avatar_url,
            )
            log.debug(
                "identity.service.user_updated",
                clerk_user_id=payload.clerk_user_id,
            )

        # Only grant the declared role on first creation.
        # Subsequent syncs must NOT mutate roles — that would allow a returning
        # user to self-escalate by replaying the sync call with a different role.
        if is_new_user:
            await repo.upsert_user_role(session, user_id=user.id, role=payload.role)

        # Flush so the role row is visible in the re-fetch below.
        await session.flush()
        refreshed = await repo.get_user_by_clerk_id(session, payload.clerk_user_id)

    # Transaction committed — build the slim response.
    final_user = refreshed or user
    roles = [r.role for r in (final_user.roles or [])]

    return AuthSyncResponse(
        user_id=final_user.id,
        roles=roles,
        is_new_user=is_new_user,
    )


async def get_me(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
) -> User | None:
    """Return the User ORM object by local UUID.

    Used by GET /me after resolving the JWT clerk_user_id to a local UUID.
    Returns None if the user has not yet called /auth/sync.
    """
    return await repo.get_user_by_id(session, user_id)


# ---------------------------------------------------------------------------
# Backward-compatible helpers (used by other modules)
# ---------------------------------------------------------------------------


async def get_user_by_clerk_id(
    db: AsyncSession,
    clerk_user_id: str,
) -> User | None:
    """Thin wrapper around repository.get_user_by_clerk_id.

    Kept for backward compatibility — students/mentors/admin routers call this.
    """
    return await repo.get_user_by_clerk_id(db, clerk_user_id)


async def get_user_by_id(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> User | None:
    """Thin wrapper around repository.get_user_by_id."""
    return await repo.get_user_by_id(db, user_id)


async def list_users(db: AsyncSession) -> list[User]:
    """Return all users (admin only).  Thin wrapper around repository."""
    return await repo.list_users(db)


async def list_users_paginated(
    db: AsyncSession,
    *,
    role: str | None = None,
    search: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> list[User]:
    """Return paginated, filterable user list (admin only)."""
    return await repo.list_users_paginated(
        db, role=role, search=search, page=page, per_page=per_page
    )


async def count_users(
    db: AsyncSession,
    *,
    role: str | None = None,
    search: str | None = None,
) -> int:
    """Return total user count for the same filters (admin only)."""
    return await repo.count_users(db, role=role, search=search)


async def grant_role(
    db: AsyncSession,
    user: User,
    role: str,
    *,
    granted_by: uuid.UUID | None = None,
) -> None:
    """Grant an additional role to an existing user (idempotent)."""
    await repo.upsert_user_role(db, user_id=user.id, role=role, granted_by=granted_by)
    await db.commit()


def primary_role(user: User) -> str:
    """Return the highest-privilege role from user.roles.

    Falls back to 'student' if no roles are assigned (guards against empty
    state during a write-skew window).
    """
    if not user.roles:
        return "student"
    role_strings = {r.role for r in user.roles}
    for candidate in _ROLE_PRIORITY:
        if candidate in role_strings:
            return candidate
    # Unexpected role value — return the first one recorded.
    return user.roles[0].role


def has_role(user: User, role: str) -> bool:
    """Return True if the user holds the given role."""
    return any(r.role == role for r in user.roles)
