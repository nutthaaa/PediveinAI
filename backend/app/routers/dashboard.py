from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AiAnalysis, InspectionRound, IvSite, Patient, Review
from ..security import CurrentUser
from ..serializers import CONDITIONS, patient_brief, review_out, site_out
from ..services import scheduling
from .rounds import board

router = APIRouter(tags=["dashboard"])
LOCAL_TZ = ZoneInfo("Asia/Bangkok")
RANGES = {"today": 0, "7d": 7, "30d": 30, "3m": 90}


def latest_review(db: Session, site_id: int, condition: str) -> Review | None:
    return db.scalar(
        select(Review)
        .join(AiAnalysis, Review.analysis_id == AiAnalysis.id)
        .where(AiAnalysis.iv_site_id == site_id, Review.condition == condition)
        .order_by(AiAnalysis.id.desc())
        .limit(1)
    )


def condition_sites(db: Session, condition: str) -> list[dict]:
    """Active sites whose most recent confirmed review for ``condition`` found an observation."""
    sites = db.scalars(
        select(IvSite)
        .join(Patient, IvSite.patient_id == Patient.id)
        .where(IvSite.status.in_(scheduling.MONITORED), Patient.status == "admitted")
    )
    now = scheduling.now_utc()
    rows = []
    for site in sites:
        review = latest_review(db, site.id, condition)
        if review is None or review.finding != "observation_found":
            continue
        history = db.scalars(
            select(Review)
            .join(AiAnalysis, Review.analysis_id == AiAnalysis.id)
            .where(AiAnalysis.iv_site_id == site.id, Review.condition == condition)
            .order_by(AiAnalysis.id)
        )
        rows.append(
            site_out(db, site, now)
            | {
                "patient": patient_brief(site.patient),
                "latest_review": review_out(review),
                "grade_history": [
                    {"grade": r.grade, "reviewed_at": r.updated_at, "analysis_id": r.analysis_id}
                    for r in history
                ],
            }
        )
    rows.sort(key=lambda r: -r["latest_review"]["grade"])
    return rows


@router.get("/api/tracking/{condition}")
def tracking(condition: Literal["infiltration", "phlebitis"], _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    scheduling.refresh(db)
    return condition_sites(db, condition)


@router.get("/api/tracking-completed")
def completed(_: CurrentUser, db: Annotated[Session, Depends(get_db)], q: str | None = None):
    scheduling.refresh(db)
    stmt = (
        select(IvSite)
        .join(Patient, IvSite.patient_id == Patient.id)
        .where(IvSite.status == "completed")
        .order_by(IvSite.id.desc())
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Patient.full_name.ilike(like) | Patient.hn.ilike(like))
    now = scheduling.now_utc()
    rows = []
    for site in db.scalars(stmt):
        findings = {c: review_out(latest_review(db, site.id, c)) for c in CONDITIONS}
        rows.append(site_out(db, site, now) | {"patient": patient_brief(site.patient), "final_reviews": findings})
    return rows


@router.get("/api/dashboard/overview")
def overview(user: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    rows = board(user, db)
    pending = db.scalars(select(AiAnalysis).where(AiAnalysis.review_status == "pending_review")).all()
    now = scheduling.now_utc()
    today_start = now.astimezone(LOCAL_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    counts = defaultdict(int)
    for row in rows:
        counts[(row["next_round"] or {}).get("schedule_status")] += 1

    conditions = {}
    for condition in CONDITIONS:
        tracked = condition_sites(db, condition)
        grades = {str(g): 0 for g in range(1, 5)}
        for row in tracked:
            grades[str(row["latest_review"]["grade"])] += 1
        conditions[condition] = {
            "total": len(tracked),
            "high_risk": grades["3"] + grades["4"],
            "grades": grades,
        }

    rounds_today = dict(
        db.execute(
            select(InspectionRound.status, func.count())
            .where(InspectionRound.due_at >= today_start, InspectionRound.due_at < today_end)
            .group_by(InspectionRound.status)
        ).all()
    )
    finished = sum(rounds_today.get(s, 0) for s in ("completed", "skipped", "missed"))
    return {
        "stats": {
            "admitted_patients": db.scalar(select(func.count()).where(Patient.status == "admitted")),
            "tracked_patients": len({row["patient"]["id"] for row in rows}),
            "active_sites": len(rows),
            "overdue": counts["overdue"],
            "due": counts["due"],
            "upcoming": counts["upcoming"],
            "pending_reviews": sum(2 - len(a.reviews) for a in pending),
            "infiltration_active": conditions["infiltration"]["total"],
            "phlebitis_active": conditions["phlebitis"]["total"],
            "inspections_today": rounds_today.get("completed", 0),
            "skipped_today": rounds_today.get("skipped", 0),
            "missed_today": rounds_today.get("missed", 0),
            "pending_today": rounds_today.get("pending", 0),
            "on_time_rate": rounds_today.get("completed", 0) / finished if finished else None,
            "ending_today": db.scalar(
                select(func.count()).where(
                    IvSite.status.in_(scheduling.MONITORED),
                    IvSite.started_at + func.make_interval(0, 0, 0, 0, IvSite.duration_hours) < today_end,
                )
            ),
        },
        "conditions": conditions,
        "rows": rows,
    }


@router.get("/api/reports/summary")
def report_summary(
    _: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    period: Annotated[Literal["today", "7d", "30d", "3m"], Query(alias="range")] = "30d",
):
    now_local = scheduling.now_utc().astimezone(LOCAL_TZ)
    start = now_local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=RANGES[period])

    analyses = db.scalars(select(AiAnalysis).where(AiAnalysis.created_at >= start)).all()
    reviews = db.scalars(select(Review).where(Review.updated_at >= start)).all()
    rounds = dict(
        db.execute(
            select(InspectionRound.status, func.count())
            .where(InspectionRound.due_at >= start, InspectionRound.due_at <= now_local)
            .group_by(InspectionRound.status)
        ).all()
    )

    grade_dist = {c: {str(g): 0 for g in range(1, 5)} for c in CONDITIONS}
    found = {c: 0 for c in CONDITIONS}
    agree = 0
    for review in reviews:
        if review.finding == "observation_found":
            found[review.condition] += 1
            grade_dist[review.condition][str(review.grade)] += 1
        ai_flagged = review.analysis.condition_prediction == CONDITIONS[review.condition]
        agree += ai_flagged == (review.finding == "observation_found")

    daily: dict[str, dict[str, int]] = {}
    for offset in range(RANGES[period], -1, -1):
        day = (now_local - timedelta(days=offset)).date().isoformat()
        daily[day] = {"analyses": 0, "infiltration": 0, "phlebitis": 0}
    for analysis in analyses:
        day = analysis.created_at.astimezone(LOCAL_TZ).date().isoformat()
        if day in daily:
            daily[day]["analyses"] += 1
    for review in reviews:
        day = review.updated_at.astimezone(LOCAL_TZ).date().isoformat()
        if day in daily and review.finding == "observation_found":
            daily[day][review.condition] += 1

    done = rounds.get("completed", 0)
    skipped = rounds.get("skipped", 0)
    missed = rounds.get("missed", 0)
    due_total = done + skipped + missed
    return {
        "range": period,
        "from": start,
        "to": now_local,
        "analyses_total": len(analyses),
        "analyses_issued": sum(a.prediction_issued for a in analyses),
        "analyses_held": sum(not a.prediction_issued for a in analyses),
        "avg_processing_ms": (
            int(sum(a.processing_ms or 0 for a in analyses) / len(analyses)) if analyses else None
        ),
        "reviews_total": len(reviews),
        "reviews_pending": sum(
            2 - len(a.reviews)
            for a in db.scalars(select(AiAnalysis).where(AiAnalysis.review_status == "pending_review"))
        ),
        "found": found,
        "grade_distribution": grade_dist,
        "ai_agreement_rate": agree / len(reviews) if reviews else None,
        "rounds": {"completed": done, "skipped": skipped, "missed": missed},
        "compliance_rate": done / due_total if due_total else None,
        "sites_started": db.scalar(select(func.count()).where(IvSite.started_at >= start)),
        "sites_removed": db.scalar(
            select(func.count()).where(IvSite.status == "removed", IvSite.removed_at >= start)
        ),
        "daily": [{"date": d} | v for d, v in daily.items()],
    }

