"""Pydantic schemas for the identity module.

Conventions:
- AppRole is a Literal string alias — not an ENUM — validates cleanly.
- Email normalised to lowercase in AuthSyncRequest.
- AuthSyncResponse is the slim payload from POST /auth/sync.
- UserRead is the canonical user payload for GET /me and admin endpoints.
- UserRoleRead serialises individual user_roles rows.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

# Canonical role values — string, not ENUM.  Add new values here only.
AppRole = Literal["student", "mentor", "admin"]


# ---------------------------------------------------------------------------
# Supporting schemas
# ---------------------------------------------------------------------------


class UserContext(BaseModel):
    """Attached to request.state by ClerkAuthMiddleware after JWT decode."""

    user_id: str | None = None
    roles: list[AppRole] = Field(default_factory=list)
    email: str | None = None


class UserRoleRead(BaseModel):
    """Serialised representation of a single user_roles row."""

    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    granted_at: datetime
    granted_by: uuid.UUID | None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class AuthSyncRequest(BaseModel):
    """Internal payload for user provisioning.

    This model is intentionally broader than the public HTTP contract so test
    setup and trusted backend code can provision non-student users without
    going through admin UI flows.
    """

    clerk_user_id: str = Field(..., min_length=1)
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None
    role: AppRole = "student"

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: object) -> object:
        """Normalize to lowercase before validation — stored lower in the DB."""
        if isinstance(v, str):
            return v.lower().strip()
        return v


class PublicAuthSyncRequest(BaseModel):
    """Public request body for POST /api/v1/auth/sync.

    The route accepts identity/profile fields from the client but never trusts
    the client to decide authorization. Every caller is provisioned as a
    student on first sync; higher-privilege roles must come from a trusted
    backend path.
    """

    clerk_user_id: str = Field(..., min_length=1)
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: object) -> object:
        """Normalize to lowercase before validation — stored lower in the DB."""
        if isinstance(v, str):
            return v.lower().strip()
        return v


class GitHubOAuthRequest(BaseModel):
    """Body sent by the frontend to complete the GitHub OAuth exchange."""

    code: str = Field(..., min_length=1, description="OAuth authorization code from GitHub")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class AuthSyncResponse(BaseModel):
    """Slim response from POST /auth/sync.

    Only the fields the frontend strictly needs to bootstrap the session.
    Full user data is available via GET /me.
    """

    user_id: uuid.UUID
    roles: list[str]
    is_new_user: bool


class UserRead(BaseModel):
    """Canonical user payload — returned from GET /me and admin user endpoints.

    ``roles`` is extracted from the user_roles relationship via the
    model_validator so ``model_validate(orm_user)`` works seamlessly.
    """

    id: uuid.UUID
    clerk_user_id: str
    email: str
    first_name: str | None
    last_name: str | None
    avatar_url: str | None
    roles: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_roles(cls, obj: Any) -> Any:  # noqa: ANN401
        """Convert UserRole ORM objects → plain role strings before validation."""
        if not isinstance(obj, dict) and hasattr(obj, "roles"):
            raw_roles = getattr(obj, "roles", []) or []
            return {
                "id": obj.id,
                "clerk_user_id": obj.clerk_user_id,
                "email": obj.email,
                "first_name": obj.first_name,
                "last_name": obj.last_name,
                "avatar_url": obj.avatar_url,
                "roles": [r.role for r in raw_roles],
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            }
        return obj
