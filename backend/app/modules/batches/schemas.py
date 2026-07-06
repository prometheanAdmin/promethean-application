from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class BatchCreate(BaseModel):
    """Admin creates a new batch."""

    name: str = Field(..., max_length=255)
    project_track: str = Field(..., max_length=255)
    domain_id: uuid.UUID
    mentor_id: uuid.UUID
    start_date: date
    end_date: date
    max_students: int = Field(default=20, ge=1, le=500)
    description: str | None = None
    github_template_repo: str | None = Field(None, max_length=500)
    status: str = "upcoming"


class BatchRead(BaseModel):
    id: uuid.UUID
    name: str
    project_track: str
    domain_id: uuid.UUID
    mentor_id: uuid.UUID
    start_date: date
    end_date: date
    max_students: int
    description: str | None
    github_template_repo: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    project_track: str | None = Field(None, max_length=255)
    domain_id: uuid.UUID | None = None
    mentor_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    max_students: int | None = Field(None, ge=1, le=500)
    description: str | None = None
    github_template_repo: str | None = Field(None, max_length=500)
    status: str | None = None
