from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.identity.schemas import AppRole


class AdminUserRead(BaseModel):
    id: int
    clerk_user_id: str
    email: str
    first_name: str | None
    last_name: str | None
    role: AppRole
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MentorVerifyResponse(BaseModel):
    id: int
    user_id: int
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)


class DomainCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)


class DomainUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=500)


class DomainRead(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
