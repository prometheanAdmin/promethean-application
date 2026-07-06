"""Transactional email helper using the Resend API.

Usage:
    from app.email import send_email

    await send_email(
        to="student@example.com",
        subject="Welcome to Promethean",
        html="<p>You're in!</p>",
        tags={"event": "welcome", "environment": "production"},
    )

``send_email`` never raises — failures are logged at ERROR level and silently
swallowed so that a broken email provider cannot crash a request.
"""

from __future__ import annotations

import resend
import structlog

from app.config import get_settings

log = structlog.get_logger(__name__)


async def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    from_: str | None = None,
    tags: dict[str, str] | None = None,
) -> bool:
    """Send a transactional email via Resend.

    Returns ``True`` if the API call succeeded, ``False`` otherwise.
    Never raises — all exceptions are caught and logged.

    Args:
        to: Recipient email address.
        subject: Email subject line.
        html: HTML body of the email.
        from_: Sender address; defaults to ``settings.RESEND_FROM_EMAIL``.
        tags: Optional key/value metadata tags forwarded to Resend for
            filtering and analytics (e.g. ``{"event": "mentor_verified"}``).
    """
    settings = get_settings()

    if not settings.RESEND_API_KEY:
        log.warning("send_email_skipped", reason="RESEND_API_KEY not configured")
        return False

    resend.api_key = settings.RESEND_API_KEY
    sender = from_ or settings.RESEND_FROM_EMAIL

    payload: dict[str, object] = {
        "from": sender,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if tags:
        payload["tags"] = [{"name": k, "value": v} for k, v in tags.items()]

    try:
        resend.Emails.send(payload)  # type: ignore[arg-type]
        log.info("send_email_ok", to=to, subject=subject)
        return True
    except Exception:
        log.exception("send_email_failed", to=to, subject=subject)
        return False
