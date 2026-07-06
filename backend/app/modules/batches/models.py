"""Batches module models — Batch has moved to the enrollment module.

The enrollment module now owns the ``batches`` table as part of the
cohort/enrollment domain consolidation.  This re-export keeps existing
imports working without changes.

New code should import directly from ``app.modules.enrollment.models``.
"""

from __future__ import annotations

from app.modules.enrollment.models import Batch as Batch  # noqa: F401
