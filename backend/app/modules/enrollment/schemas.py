"""Pydantic schemas for the enrollment module (batches + enrollments).

Shapes:
- BatchCreate         — admin creates a batch.
- BatchUpdate         — admin partially updates a batch.
- BatchRead           — full batch detail including enrollment count.
- BatchListItem       — summary view for the public discovery page.
- PaginatedBatchList  — paginated GET /batches response.
- EnrollSelfRequest   — body for POST /batches/{id}/enroll (student self-enroll).
- AdminEnrollRequest  — body for POST /admin/batches/{id}/enroll (admin-initiated).
- EnrollmentRead      — enrollment record returned to the student.
- EnrollmentAdminRead — enrollment record with student identity for admin view.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EnrollmentStatusStr = Literal["active", "completed", "withdrawn"]
PaymentStatusStr = Literal["free", "paid", "refunded"]
BatchStatusStr = Literal["upcoming", "active", "completed", "cancelled"]


class BatchCreate(BaseModel):
    """Admin: create a new batch."""

    name: str = Field(..., max_length=255)
    project_track: str = Field(..., max_length=255)
    domain_id: uuid.UUID
    mentor_id: uuid.UUID
    start_date: date
    end_date: date
    max_students: int = Field(default=20, ge=1, le=500)
    description: str | None = Field(None, max_length=2000)
    github_template_repo: str | None = Field(
        None,
        max_length=500,
        description="Full name of the GitHub template repo (e.g. 'org/template-python')",
    )
    status: BatchStatusStr = "upcoming"


class BatchUpdate(BaseModel):
    """Admin: partial update of an existing batch — all fields optional."""

    name: str | None = Field(None, max_length=255)
    project_track: str | None = Field(None, max_length=255)
    domain_id: uuid.UUID | None = None
    mentor_id: uuid.UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    max_students: int | None = Field(None, ge=1, le=500)
    description: str | None = Field(None, max_length=2000)
    github_template_repo: str | None = Field(None, max_length=500)
    status: BatchStatusStr | None = None


class BatchRead(BaseModel):
    """Full batch detail — includes current enrollment count and batch-level GitHub repo URL."""

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
    github_repo_url: str | None = None
    status: str
    enrollment_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BatchListItem(BaseModel):
    """Summary view returned from the authenticated GET /batches discovery page.

    Includes enrollment_count so the frontend can show "X / Y spots taken"
    without a second request per batch.
    """

    id: uuid.UUID
    name: str
    project_track: str
    domain_id: uuid.UUID
    mentor_id: uuid.UUID
    start_date: date
    end_date: date
    max_students: int
    enrollment_count: int
    status: str
    description: str | None
    github_repo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedBatchList(BaseModel):
    """Paginated GET /batches response with metadata for frontend page controls."""

    items: list[BatchListItem]
    total: int
    page: int
    per_page: int


class EnrollSelfRequest(BaseModel):
    """Body for POST /api/v1/batches/{batch_id}/enroll (student self-enrollment).

    Currently has no required fields — the batch is identified from the URL path
    and the student from the JWT.  The body is optional on the wire (clients may
    omit it entirely); once future fields are added they will be optional too.
    Defined explicitly so OpenAPI clients can generate a typed request body and
    so the schema can be extended (e.g. with a referral code or payment-intent
    ID) without a breaking API change.
    """


class AdminEnrollRequest(BaseModel):
    """Admin-initiated enrollment — admin specifies the student directly."""

    student_id: uuid.UUID


class EnrollmentRead(BaseModel):
    """Full enrollment record — returned to the student after enroll or GET /enrollments/me."""

    id: uuid.UUID
    student_id: uuid.UUID
    batch_id: uuid.UUID
    status: EnrollmentStatusStr
    payment_status: PaymentStatusStr
    github_repo_url: str | None
    enrolled_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EnrollmentAdminRead(BaseModel):
    """Enrollment record enriched with student identity — for admin endpoints.

    The student fields (email, first_name, last_name) are fetched via a raw SQL
    JOIN to the users table — no cross-module ORM relationship is used.
    """

    id: uuid.UUID
    student_id: uuid.UUID
    batch_id: uuid.UUID
    status: EnrollmentStatusStr
    payment_status: PaymentStatusStr
    github_repo_url: str | None
    enrolled_at: datetime
    updated_at: datetime
    student_email: str
    student_first_name: str | None
    student_last_name: str | None
