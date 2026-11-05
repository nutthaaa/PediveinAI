"""Inspection-round scheduling for IV sites.

Every IV site gets ``duration_hours / interval_hours`` rounds when tracking starts
(168 h / 2 h = 84 rounds). The "current" round of a site is the latest pending round
that is already inside its due window; pending rounds before it were missed.

Removing the needle does not end tracking: the remaining window is re-planned at the
post-removal interval (8 h) and round numbers continue from the existing ones.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..models import InspectionRound, IvSite, Notification

MONITORED = ("active", "removed")
from . import audit, settings_store


def now_utc() -> datetime:
    return datetime.now(UTC)


def create_rounds(site: IvSite) -> list[InspectionRound]:
    count = max(site.duration_hours // site.interval_hours, 1)
    return [
        InspectionRound(
            round_no=index,
            due_at=site.started_at + timedelta(hours=site.interval_hours * index),
            status="pending",
        )
        for index in range(1, count + 1)
    ]


def schedule_status(due_at: datetime, now: datetime, window_min: int, grace_min: int) -> str:
    if now > due_at + timedelta(minutes=grace_min):
        return "overdue"
    if now >= due_at - timedelta(minutes=window_min):
        return "due"
    return "upcoming"


def current_round(db: Session, site: IvSite, now: datetime | None = None) -> InspectionRound | None:
    """Latest pending round already in its due window, else the next pending round."""
    now = now or now_utc()
    window = timedelta(minutes=settings_store.get(db, "due_window_minutes"))
    in_window = db.scalar(
        select(InspectionRound)
        .where(
            InspectionRound.iv_site_id == site.id,
            InspectionRound.status == "pending",
            InspectionRound.due_at <= now + window,
        )
        .order_by(InspectionRound.due_at.desc())
        .limit(1)
    )
    if in_window is not None:
        return in_window
    return db.scalar(
        select(InspectionRound)
        .where(InspectionRound.iv_site_id == site.id, InspectionRound.status == "pending")
        .order_by(InspectionRound.due_at)
        .limit(1)
    )


def mark_earlier_missed(db: Session, round_: InspectionRound) -> None:
    db.execute(
        update(InspectionRound)
        .where(
            InspectionRound.iv_site_id == round_.iv_site_id,
            InspectionRound.status == "pending",
            InspectionRound.round_no < round_.round_no,
        )
        .values(status="missed")
    )


def close_site(db: Session, site: IvSite, status: str, when: datetime) -> None:
    site.status = status
    if status == "completed":
        site.ended_at = min(when, site.started_at + timedelta(hours=site.duration_hours))
    db.execute(
        update(InspectionRound)
        .where(InspectionRound.iv_site_id == site.id, InspectionRound.status == "pending")
        .values(status="cancelled")
    )


def remove_needle(db: Session, site: IvSite, when: datetime) -> None:
    """Mark the needle removed and re-plan the rest of the window at the post-removal interval."""
    close_site(db, site, "removed", when)
    site.removed_at = when
    site.interval_hours = settings_store.get(db, "post_removal_interval_hours")
    last_no = db.scalar(
        select(func.max(InspectionRound.round_no)).where(InspectionRound.iv_site_id == site.id)
    ) or 0
    end = site.started_at + timedelta(hours=site.duration_hours)
    due = when + timedelta(hours=site.interval_hours)
    while due <= end:
        last_no += 1
        db.add(InspectionRound(iv_site_id=site.id, round_no=last_no, due_at=due, status="pending"))
        due += timedelta(hours=site.interval_hours)


def refresh(db: Session) -> None:
    """Complete expired sites and raise overdue notifications. Idempotent; call before reads."""
    now = now_utc()
    changed = False
    for site in db.scalars(select(IvSite).where(IvSite.status.in_(MONITORED))):
        if now >= site.started_at + timedelta(hours=site.duration_hours):
            close_site(db, site, "completed", now)
            audit.record(
                db,
                actor=None,
                event_type="complete",
                category="schedule",
                event=f"ครบระยะติดตาม เข็ม #{site.needle_no}",
                target=f"{site.patient.hn} · {site.location}",
            )
            changed = True
            continue

        if not settings_store.get(db, "notify_overdue"):
            continue
        round_ = current_round(db, site, now)
        if round_ is None:
            continue
        status = schedule_status(
            round_.due_at,
            now,
            settings_store.get(db, "due_window_minutes"),
            settings_store.get(db, "overdue_grace_minutes"),
        )
        if status != "overdue":
            continue
        exists = db.scalar(select(Notification.id).where(Notification.round_id == round_.id))
        if exists is None:
            patient = site.patient
            audit.notify(
                db,
                category="due",
                title=f"เกินกำหนดตรวจ: {patient.full_name}",
                body=f"เข็ม #{site.needle_no} {site.location} · รอบ {round_.round_no} "
                f"· {patient.ward} {patient.bed or ''}".strip(),
                link="rounds",
                patient_id=patient.id,
                round_id=round_.id,
            )
            changed = True
    if changed:
        db.commit()
