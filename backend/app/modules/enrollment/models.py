"""Enrollment module ORM models — owns both batches and enrollments tables.

The enrollment module is the canonical owner of two tables:
- ``batches``     — cohort groups created by admins
- ``enrollments`` — student enrolments in a batch

The batches module re-exports the Batch class from here for backward
compatibility with any code that imports from ``batches.models``.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Batch(Base):
    """A cohort batch: students who work through a project track together.

    status: 'upcoming' | 'active' | 'completed' | 'cancelled'

    ``github_template_repo`` — the template repo each enrolling student's fork
    is created from.  The student's personal fork URL is stored on Enrollment.
    """

    __tablename__ = "batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # FK to domains.id — required; every batch has a domain
    domain_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("domains.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # FK to users.id — the mentor who runs this batch
    mentor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    project_track: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    max_students: Mapped[int] = mapped_column(
        Integer, nullable=False, default=20, server_default="20"
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="upcoming", server_default="'upcoming'"
    )

    # Template repo each student forks from at enrollment time
    github_template_repo: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Batch-level repo created at batch creation time (10s timeout, None on failure)
    github_repo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Enrollment(Base):
    """Student enrollment in a batch.

    status: 'active' | 'completed' | 'withdrawn'
    payment_status: 'free' | 'paid' | 'refunded'
    github_repo_url: URL of the student's personal fork of the batch template
                     repo — populated after the GitHub fork call completes.

    The unique constraint on (student_id, batch_id) prevents double-enrollment.
    """

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "batch_id", name="uq_enrollment_student_batch"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # student_id FK to users.id — plain FK, no cross-module ORM relationship
    student_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    batch_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("batches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Populated after GitHub fork completes (may remain None if GitHub is down)
    github_repo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="free", server_default="'free'"
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="'active'"
    )

    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
