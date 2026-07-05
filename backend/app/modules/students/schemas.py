from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentProfileUpdate(BaseModel):
    cohort: str | None = Field(None, max_length=100)
    timezone: str | None = Field(None, max_length=50)


class StudentProfileRead(BaseModel):
    id: int
    user_id: int
    cohort: str | None
    timezone: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
