"""Pydantic schemas for the mentors module.

Four request/response shapes:
- MentorProfileCreate   — initial or full profile submission.
- MentorProfileRead     — full profile payload (returned from list + owned endpoints).
- MentorDetailRead      — profile enriched with user name/avatar (returned from GET /mentors/{id}).
- MentorVerifyRequest   — admin action to approve or reject a mentor.
- PaginatedMentorList   — paginated GET /mentors response with total count.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MentorProfileCreate(BaseModel):
    """Full or partial mentor profile submission.

    All fields are optional so mentors can fill in their profiles incrementally.
    The service merges the payload with the existing DB row (None = keep current).
    """

    bio: str | None = Field(None, max_length=2000)
    company: str | None = Field(None, max_length=255)
    experience_yrs: int | None = Field(None, ge=0, le=60)
    domains: list[str] | None = Field(
        None,
        description="Full replacement list of domain ID strings (UUIDs)",
    )
    github_username: str | None = Field(None, max_length=100)


class MentorProfileRead(BaseModel):
    """Full mentor profile — returned from all mentor-facing endpoints."""

    id: uuid.UUID
    user_id: uuid.UUID
    bio: str | None
    company: str | None
    experience_yrs: int | None
    github_username: str | None
    domains: list[str]
    is_verified: bool
    rating_avg: Decimal | None
    rev_share_pct: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MentorDetailRead(BaseModel):
    """Mentor profile enriched with identity fields for the public detail endpoint.

    Combines data from mentor_profiles (profile) and users (name, avatar) —
    constructed manually in the router from two parallel service calls.
    """

    # Profile fields
    id: uuid.UUID
    user_id: uuid.UUID
    bio: str | None
    company: str | None
    experience_yrs: int | None
    github_username: str | None
    domains: list[str]
    is_verified: bool
    rating_avg: Decimal | None
    rev_share_pct: Decimal
    created_at: datetime
    updated_at: datetime

    # Identity fields — may be None if the user row is missing (defensive)
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class MentorVerifyRequest(BaseModel):
    """Admin approval or rejection of a mentor profile.

    ``is_verified=True`` → approval email sent.
    ``is_verified=False`` → polite rejection email sent, with optional reason.
    """

    is_verified: bool
    rejection_reason: str | None = Field(
        None,
        max_length=1000,
        description="Required when is_verified=False; included in the rejection email",
    )


class PaginatedMentorList(BaseModel):
    """Paginated list of verified mentors for the public discovery endpoint."""

    items: list[MentorProfileRead]
    total: int
    page: int
    per_page: int
