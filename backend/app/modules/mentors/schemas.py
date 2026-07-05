from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MentorProfileUpdate(BaseModel):
    expertise: str | None = Field(None, max_length=255)
    timezone: str | None = Field(None, max_length=50)


class MentorProfileRead(BaseModel):
    id: int
    user_id: int
    expertise: str | None
    timezone: str | None
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
