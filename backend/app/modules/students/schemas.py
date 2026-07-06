"""Pydantic schemas for the students module.

Three request shapes:
- StudentProfileCreate  — used when the client submits a full initial profile.
- StudentProfileUpdate  — partial update (all fields optional).
- GitHubConnectRequest  — direct GitHub username submission after OAuth.

Both Create and Update feed the same upsert service function; the router
passes whichever is appropriate depending on the endpoint semantics.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StudentProfileCreate(BaseModel):
    """Full profile submission — all required fields must be present for the
    profile to be marked complete.

    ``skills`` defaults to an empty list so the frontend can omit it on the
    first submit without causing a validation error.
    """

    education: str | None = Field(None, max_length=500)
    skills: list[str] = Field(default_factory=list)
    career_goals: str | None = Field(None, max_length=2000)
    domain_id: uuid.UUID | None = None


class StudentProfileUpdate(BaseModel):
    """Partial update — only supplied (non-None) fields are written to the DB.

    All fields are optional.  Omitting a field leaves the current DB value
    unchanged.  To explicitly clear a field, pass ``null``.
    """

    education: str | None = Field(None, max_length=500)
    skills: list[str] | None = Field(None, description="Full replacement list of skill strings")
    career_goals: str | None = Field(None, max_length=2000)
    domain_id: uuid.UUID | None = None


class StudentProfileRead(BaseModel):
    """Full student profile payload — returned from all profile endpoints."""

    id: uuid.UUID
    user_id: uuid.UUID
    education: str | None
    skills: list[str]
    career_goals: str | None
    github_username: str | None
    domain_id: uuid.UUID | None
    profile_complete: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GitHubConnectRequest(BaseModel):
    """Direct GitHub username submission.

    Validates that the username matches GitHub's allowed character set:
    alphanumeric characters and hyphens, 1–50 characters.  The service
    normalises the value to lowercase before storage.
    """

    github_username: str = Field(
        ...,
        min_length=1,
        max_length=50,
        pattern=r"^[a-zA-Z0-9-]+$",
        description="GitHub username (alphanumeric + hyphens, 1–50 chars)",
    )
