from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

AppRole = Literal["student", "mentor", "admin"]


def is_app_role(value: object) -> bool:
    return value in {"student", "mentor", "admin"}


class UserContext(BaseModel):
    user_id: str | None = None
    roles: list[AppRole] = Field(default_factory=list)
    email: str | None = None


class AuthSyncRequest(BaseModel):
    """Body sent by the frontend on first login to provision the local user row."""

    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    role: AppRole = "student"


class MeResponse(BaseModel):
    """Full /me payload returned to the frontend."""

    id: int
    clerk_user_id: str
    email: str
    first_name: str | None
    last_name: str | None
    role: AppRole
    profile_complete: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserRead(BaseModel):
    id: int
    clerk_user_id: str
    email: str
    first_name: str | None
    last_name: str | None
    role: AppRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
