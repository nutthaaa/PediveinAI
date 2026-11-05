"""Notifications, audit log, system settings, images and system status."""
from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AuditLog, Image, Notification, NotificationRead, User
from ..security import AdminUser, CurrentUser, require_roles
from ..services import ai_client, audit, scheduling, settings_store, storage

router = APIRouter(tags=["admin"])

AuditViewer = Annotated[User, Depends(require_roles("admin", "head_nurse"))]


def visible_notifications(user: User):
    return or_(Notification.user_id.is_(None), Notification.user_id == user.id)


@router.get("/api/notifications")
def list_notifications(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    category: Literal["all", "due", "ai", "system"] = "all",
    limit: int = 100,
):
    scheduling.refresh(db)
    stmt = (
        select(Notification, NotificationRead.read_at)
        .outerjoin(
            NotificationRead,
            (NotificationRead.notification_id == Notification.id) & (NotificationRead.user_id == user.id),
        )
        .where(visible_notifications(user))
        .order_by(Notification.created_at.desc())
        .limit(min(limit, 500))
    )
    if category != "all":
        stmt = stmt.where(Notification.category == category)
    return [
        {
            "id": n.id,
            "category": n.category,
            "title": n.title,
            "body": n.body,
            "link": n.link,
            "patient_id": n.patient_id,
            "analysis_id": n.analysis_id,
            "round_id": n.round_id,
            "created_at": n.created_at,
            "read": read_at is not None,
        }
        for n, read_at in db.execute(stmt)
    ]


@router.get("/api/notifications/unread-count")
def unread_count(user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    read_ids = select(NotificationRead.notification_id).where(NotificationRead.user_id == user.id)
    count = db.scalar(
        select(func.count()).where(visible_notifications(user), Notification.id.not_in(read_ids))
    )
    return {"count": count}


def _mark_read(db: Session, user: User, ids: list[int]) -> None:
    already = set(
        db.scalars(
            select(NotificationRead.notification_id).where(
                NotificationRead.user_id == user.id, NotificationRead.notification_id.in_(ids)
            )
        )
    )
    for notification_id in set(ids) - already:
        db.add(NotificationRead(notification_id=notification_id, user_id=user.id))
    db.commit()


@router.post("/api/notifications/{notification_id}/read")
def mark_read(notification_id: int, user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id not in (None, user.id):
        raise HTTPException(404, detail="Notification not found")
    _mark_read(db, user, [notification_id])
    return {"ok": True}


@router.post("/api/notifications/read-all")
def mark_all_read(user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    ids = list(db.scalars(select(Notification.id).where(visible_notifications(user))))
    _mark_read(db, user, ids)
    return {"ok": True}


@router.get("/api/audit-logs")
def audit_logs(
    _: AuditViewer,
    db: Annotated[Session, Depends(get_db)],
    category: Literal["all", "schedule", "ai", "permission", "system"] = "all",
    q: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    stmt = select(AuditLog)
    if category != "all":
        stmt = stmt.where(AuditLog.category == category)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(AuditLog.actor_name.ilike(like), AuditLog.event.ilike(like), AuditLog.target.ilike(like),
                AuditLog.details.ilike(like))
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(AuditLog.id.desc()).offset((page - 1) * page_size).limit(page_size))
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": r.id,
                "code": f"LOG-{r.id:04d}",
                "created_at": r.created_at,
                "actor_name": r.actor_name,
                "event_type": r.event_type,
                "category": r.category,
                "event": r.event,
                "target": r.target,
                "details": r.details,
                "ip_address": r.ip_address,
            }
            for r in rows
        ],
    }


@router.get("/api/settings")
def get_settings_(_: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    return settings_store.get_all(db)


@router.put("/api/settings")
def put_settings(
    values: dict[str, Any], admin: AdminUser, request: Request, db: Annotated[Session, Depends(get_db)]
):
    try:
        result = settings_store.update(db, values, admin.id)
    except KeyError as exc:
        raise HTTPException(422, detail=f"Unknown setting: {exc.args[0]}") from None
    audit.record(
        db, actor=admin, event_type="permission", category="system", event="แก้ไขการตั้งค่าระบบ",
        details=", ".join(f"{k}={v}" for k, v in values.items()), request=request,
    )
    db.commit()
    return result


@router.get("/api/images/{image_id}")
def get_image(image_id: int, _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    image = db.get(Image, image_id)
    if image is None:
        raise HTTPException(404, detail="Image not found")
    path = storage.absolute_path(image)
    if not path.exists():
        raise HTTPException(404, detail="Image file missing")
    return FileResponse(path, media_type=image.content_type, headers={"Cache-Control": "private, max-age=3600"})


@router.get("/api/system/status")
async def system_status(_: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    try:
        db.execute(text("SELECT 1"))
        database = "UP"
    except Exception:
        database = "DOWN"
    return {
        "database": database,
        "ai": await run_in_threadpool(ai_client.health),
        # No HIS integration exists yet; patients are registered manually.
        "his": {"status": "NOT_CONFIGURED"},
        "server_time": scheduling.now_utc(),
    }
