"""Identity router — POST /auth/sync and GET /me.

Security invariants:
1. POST /auth/sync is PUBLIC — listed in PUBLIC_ROUTES in auth.py.
   A JWT is not required at sync time because the frontend calls this
   endpoint before the full session is established. The route only trusts
   identity/profile fields from the request body — authorization stays
   server-owned and every new caller is provisioned as a student.
2. GET /me requires a valid Clerk JWT — uses get_db (not get_public_db).
3. Roles come from JWT publicMetadata (server-written) — NEVER from
   unsafeMetadata or request body after the account is created.
4. Email is normalised to lowercase before any DB operation.
5. No stack traces in HTTP error responses — only structured codes.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.dependencies import get_current_user, get_db, get_public_db
from app.modules.identity import service as identity_svc
from app.modules.identity.schemas import (
    AppRole,
    AuthSyncRequest,
    AuthSyncResponse,
    GitHubOAuthRequest,
    PublicAuthSyncRequest,
    UserContext,
    UserRead,
)

# Cross-module reads via service layer — never import models from other modules.
from app.modules.mentors import service as mentors_svc
from app.modules.students import service as students_svc

log = structlog.get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["identity"])


@router.post("/auth/sync", response_model=AuthSyncResponse, status_code=200)
async def auth_sync(
    body: PublicAuthSyncRequest,
    db: AsyncSession = Depends(get_public_db),
) -> AuthSyncResponse:
    """Provision or refresh the local user row from a Clerk auth event.

    PUBLIC endpoint — no JWT required.  Called by the frontend immediately
    after sign-in so the backend has a user row before any protected route
    is hit.  Idempotent — calling it twice is safe and returns the same
    stable user_id.

    On first call: creates the user row + a default student role grant,
    returns is_new_user=True. On subsequent calls: updates mutable fields
    (email, avatar), returns is_new_user=False.

    Side-effect: best-effort PATCH to Clerk publicMetadata so the JWT
    template starts including the role on next token refresh.
    """
    response = await identity_svc.sync_clerk_user(
        db,
        payload=AuthSyncRequest(
            clerk_user_id=body.clerk_user_id,
            email=body.email,
            first_name=body.first_name,
            last_name=body.last_name,
            avatar_url=body.avatar_url,
            role="student",
        ),
    )

    # Best-effort: push primary role to Clerk publicMetadata.
    if response.roles:
        await _push_role_to_clerk(body.clerk_user_id, response.roles[0])

    return response


@router.get("/me", response_model=UserRead)
async def read_me(
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    """Return the full user record for the authenticated caller.

    Requires a valid Clerk JWT.  Returns 404 if the user has not yet called
    POST /auth/sync (the frontend should gate on this).
    """
    clerk_user_id: str = request.state.user_id

    # Resolve clerk_user_id → local UUID, then load full user via get_me.
    stub = await identity_svc.get_user_by_clerk_id(db, clerk_user_id)
    if stub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    user = await identity_svc.get_me(db, user_id=stub.id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    return UserRead.model_validate(user)


@router.post("/auth/github", status_code=200)
async def github_oauth_exchange(
    body: GitHubOAuthRequest,
    request: Request,
    _user: dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Exchange a GitHub OAuth authorization code for the user's GitHub username.

    KAN-22 — The frontend triggers the GitHub OAuth redirect (not the token
    exchange).  This endpoint receives the code, exchanges it for an access
    token via the GitHub OAuth app, fetches the authenticated user's login,
    and stores it on the role-appropriate profile row.

    The GitHub username is NEVER typed by the user — it always comes from
    OAuth to guarantee authenticity.
    """
    settings = get_settings()
    clerk_user_id: str = request.state.user_id

    if not settings.GITHUB_APP_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GitHub OAuth is not configured on this server",
        )

    github_username = await _exchange_github_code(body.code, settings)

    user = await identity_svc.get_user_by_clerk_id(db, clerk_user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found — call POST /api/v1/auth/sync first",
        )

    if identity_svc.has_role(user, "student"):
        await students_svc.set_github_username(
            db, user_id=user.id, github_username=github_username
        )
    elif identity_svc.has_role(user, "mentor"):
        await mentors_svc.set_github_username(
            db, user_id=user.id, github_username=github_username
        )

    log.info(
        "github_oauth_linked",
        clerk_user_id=clerk_user_id,
        github_username=github_username,
    )
    return {"github_username": github_username}


@router.get("/identity/me", response_model=UserContext, deprecated=True)
async def read_current_identity(request: Request) -> UserContext:
    """Legacy endpoint — use GET /api/v1/me instead."""
    return UserContext(
        user_id=getattr(request.state, "user_id", None),
        roles=getattr(request.state, "roles", []) or [],
        email=getattr(request.state, "email", None),
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def _push_role_to_clerk(clerk_user_id: str, role: str) -> None:
    """PATCH /v1/users/{id} to set publicMetadata.role in Clerk.

    Best-effort: a Clerk API failure is logged but never raises to the caller.
    Retries once after 1 s to handle transient Clerk API blips.
    """
    settings = get_settings()
    if not settings.CLERK_SECRET_KEY:
        return

    url = f"https://api.clerk.com/v1/users/{clerk_user_id}"
    payload = {"public_metadata": {"role": role}}
    headers = {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.patch(url, json=payload, headers=headers)
                if resp.status_code in (200, 201):
                    return
                log.warning(
                    "clerk_metadata_sync_failed",
                    clerk_user_id=clerk_user_id,
                    http_status=resp.status_code,
                    attempt=attempt,
                )
        except Exception:
            log.exception("clerk_metadata_sync_error", clerk_user_id=clerk_user_id)

        if attempt == 0:
            await asyncio.sleep(1.0)


async def _exchange_github_code(code: str, settings: Settings) -> str:
    """Exchange a GitHub OAuth authorization code for the user's login name.

    Calls GitHub's token endpoint, then GET /user.  Raises HTTPException on
    any failure so the caller can surface a clean error to the client.
    """
    token_payload = {
        "client_id": settings.GITHUB_APP_ID,
        "client_secret": settings.GITHUB_APP_PRIVATE_KEY,
        "code": code,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                json=token_payload,
                headers={"Accept": "application/json"},
            )
            token_resp.raise_for_status()
            token_data: dict[str, Any] = token_resp.json()

            access_token = token_data.get("access_token")
            if not isinstance(access_token, str) or not access_token:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="GitHub did not return an access token",
                )

            user_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            user_resp.raise_for_status()
            github_login: object = user_resp.json().get("login")

            if not isinstance(github_login, str) or not github_login:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="GitHub returned an empty login name",
                )

            return github_login

    except HTTPException:
        raise
    except Exception as exc:
        log.exception("github_oauth_exchange_error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub OAuth exchange failed",
        ) from exc


# Re-export AppRole so other packages can do: from identity.router import AppRole
__all__ = ["router", "AppRole"]
