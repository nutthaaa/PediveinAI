from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from ..models import AuditLog, Notification, User


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def record(
    db: Session,
    *,
    actor: User | None,
    event_type: str,
    category: str,
    event: str,
    target: str | None = None,
    details: str | None = None,
    request: Request | None = None,
    actor_name: str | None = None,
) -> AuditLog:
    """Add an audit row to the session; the caller commits with its own change."""
    entry = AuditLog(
        actor_id=actor.id if actor else None,
        actor_name=actor_name or (actor.full_name if actor else "ระบบ"),
        event_type=event_type,
        category=category,
        event=event,
        target=target,
        details=details,
        ip_address=client_ip(request),
    )
    db.add(entry)
    return entry


def notify(
    db: Session,
    *,
    category: str,
    title: str,
    body: str | None = None,
    link: str | None = None,
    user_id: int | None = None,
    patient_id: int | None = None,
    analysis_id: int | None = None,
    round_id: int | None = None,
) -> Notification:
    item = Notification(
        category=category,
        title=title,
        body=body,
        link=link,
        user_id=user_id,
        patient_id=patient_id,
        analysis_id=analysis_id,
        round_id=round_id,
    )
    db.add(item)
    return item
