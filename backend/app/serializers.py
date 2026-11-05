"""Model -> JSON shapes consumed by the React frontend (see src/api/types.ts)."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import AiAnalysis, Image, InspectionRound, IvSite, Patient, Review, User
from .services import scheduling, settings_store

CONDITIONS = {"infiltration": "INF", "phlebitis": "PHL"}
RISK_LEVELS = {0: "ไม่พบ", 1: "ต่ำ", 2: "ปานกลาง", 3: "สูง", 4: "วิกฤต"}
ROLE_LABELS = {
    "admin": "ผู้ดูแลระบบ",
    "head_nurse": "หัวหน้าพยาบาล",
    "nurse": "พยาบาลวิชาชีพ",
    "doctor": "แพทย์",
    "iv_team": "เจ้าหน้าที่ IV",
}


def image_url(image_id: int | None) -> str | None:
    return f"/api/images/{image_id}" if image_id else None


def age_text(birth: date | None, today: date | None = None) -> str | None:
    if birth is None:
        return None
    today = today or date.today()
    months = (today.year - birth.year) * 12 + today.month - birth.month - (today.day < birth.day)
    years, months = divmod(max(months, 0), 12)
    if years == 0:
        return f"{months} เดือน"
    return f"{years} ปี {months} เดือน" if months else f"{years} ปี"


def user_brief(user: User | None) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "role": user.role,
        "role_label": ROLE_LABELS.get(user.role, user.role),
        "position": user.position,
    }


def user_out(user: User) -> dict[str, Any]:
    return user_brief(user) | {
        "username": user.username,
        "employee_code": user.employee_code,
        "email": user.email,
        "scope": user.scope,
        "mfa_enabled": user.mfa_enabled,
        "is_active": user.is_active,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
    }


def patient_brief(patient: Patient) -> dict[str, Any]:
    return {
        "id": patient.id,
        "hn": patient.hn,
        "an": patient.an,
        "full_name": patient.full_name,
        "gender": patient.gender,
        "age_text": age_text(patient.birth_date),
        "ward": patient.ward,
        "room": patient.room,
        "bed": patient.bed,
        "status": patient.status,
    }


def review_out(review: Review | None) -> dict[str, Any] | None:
    if review is None:
        return None
    return {
        "id": review.id,
        "condition": review.condition,
        "finding": review.finding,
        "grade": review.grade,
        "risk_level": RISK_LEVELS.get(review.grade),
        "has_pain": review.has_pain,
        "note": review.note,
        "reviewer": user_brief(review.reviewer),
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


def condition_view(analysis: AiAnalysis, condition: str) -> dict[str, Any]:
    code = CONDITIONS[condition]
    probability = analysis.prob_inf if code == "INF" else analysis.prob_phl
    flagged = analysis.prediction_issued and analysis.condition_prediction == code
    review = next((r for r in analysis.reviews if r.condition == condition), None)
    return {
        "condition": condition,
        "flagged": flagged,
        "probability": probability,
        "ai_grade": analysis.grade_prediction if flagged else None,
        "ai_risk_level": RISK_LEVELS.get(analysis.grade_prediction) if flagged else None,
        "review": review_out(review),
    }


def analysis_brief(analysis: AiAnalysis | None) -> dict[str, Any] | None:
    if analysis is None:
        return None
    confidence = None
    if analysis.prediction_issued and analysis.prob_inf is not None:
        confidence = max(analysis.prob_inf, analysis.prob_phl or 0.0)
    return {
        "id": analysis.id,
        "status": analysis.status,
        "prediction_issued": analysis.prediction_issued,
        "condition_prediction": analysis.condition_prediction,
        "grade_prediction": analysis.grade_prediction,
        "confidence": confidence,
        "review_status": analysis.review_status,
        "image_url": image_url(analysis.image_id),
        "created_at": analysis.created_at,
        "conditions": {c: condition_view(analysis, c) for c in CONDITIONS},
    }


def previous_image(db: Session, analysis: AiAnalysis) -> Image | None:
    """Image of the most recent earlier analysis of the same site, else the baseline."""
    earlier = db.scalar(
        select(AiAnalysis)
        .where(
            AiAnalysis.iv_site_id == analysis.iv_site_id,
            AiAnalysis.id < analysis.id,
            AiAnalysis.status == "OK",
        )
        .order_by(AiAnalysis.id.desc())
        .limit(1)
    )
    if earlier is not None:
        return earlier.image
    return analysis.iv_site.baseline_image


def analysis_out(db: Session, analysis: AiAnalysis) -> dict[str, Any]:
    site = analysis.iv_site
    previous = previous_image(db, analysis)
    quality = analysis.quality or {}
    preprocessing = analysis.preprocessing or {}
    return analysis_brief(analysis) | {
        "prob_inf": analysis.prob_inf,
        "prob_phl": analysis.prob_phl,
        "grade_probabilities": analysis.grade_probabilities,
        "model_version": analysis.model_version,
        "model_status": analysis.model_status,
        "processing_ms": analysis.processing_ms,
        "quality": {
            "status": quality.get("status"),
            "reasons": quality.get("reasons", []),
            "warnings": quality.get("warnings", []),
            "checks": quality.get("checks", {}),
        },
        "preprocessing_reason": preprocessing.get("reason"),
        "image_url": image_url(analysis.image_id),
        "baseline_image_url": image_url(site.baseline_image_id),
        "baseline_taken_at": site.baseline_image.created_at if site.baseline_image else None,
        "previous_image_url": image_url(previous.id) if previous else None,
        "previous_taken_at": previous.created_at if previous else None,
        "round": round_brief(analysis.round) if analysis.round else None,
        "site": site_brief(site),
        "patient": patient_brief(site.patient),
        "assigned_reviewer": user_brief(analysis.assigned_reviewer),
        "assigned_at": analysis.assigned_at,
    }


def round_brief(round_: InspectionRound) -> dict[str, Any]:
    return {
        "id": round_.id,
        "round_no": round_.round_no,
        "due_at": round_.due_at,
        "status": round_.status,
        "completed_at": round_.completed_at,
        "skip_reason": round_.skip_reason,
        "performed_by": user_brief(round_.performed_by),
        "image_url": image_url(round_.image_id),
    }


def site_brief(site: IvSite) -> dict[str, Any]:
    return {
        "id": site.id,
        "needle_no": site.needle_no,
        "label": f"เข็ม #{site.needle_no}",
        "body_side": site.body_side,
        "location": site.location,
        "vein": site.vein,
        "interval_hours": site.interval_hours,
        "duration_hours": site.duration_hours,
        "started_at": site.started_at,
        "status": site.status,
        "removed_at": site.removed_at,
        "ended_at": site.ended_at,
        "removal_reason": site.removal_reason,
        "baseline_image_url": image_url(site.baseline_image_id),
    }


def latest_analysis(db: Session, site_id: int) -> AiAnalysis | None:
    return db.scalar(
        select(AiAnalysis)
        .where(AiAnalysis.iv_site_id == site_id)
        .order_by(AiAnalysis.id.desc())
        .limit(1)
    )


def site_out(db: Session, site: IvSite, now: datetime | None = None) -> dict[str, Any]:
    now = now or scheduling.now_utc()
    end = site.ended_at or now
    elapsed = max(min((end - site.started_at).total_seconds() / 3600, site.duration_hours), 0)
    counts = dict(
        db.execute(
            select(InspectionRound.status, func.count())
            .where(InspectionRound.iv_site_id == site.id)
            .group_by(InspectionRound.status)
        ).all()
    )
    next_round = None
    if site.status in scheduling.MONITORED:
        round_ = scheduling.current_round(db, site, now)
        if round_ is not None:
            next_round = round_brief(round_) | {
                "schedule_status": scheduling.schedule_status(
                    round_.due_at,
                    now,
                    settings_store.get(db, "due_window_minutes"),
                    settings_store.get(db, "overdue_grace_minutes"),
                )
            }
    return site_brief(site) | {
        "elapsed_hours": round(elapsed, 1),
        "total_rounds": sum(counts.values()),
        "completed_rounds": counts.get("completed", 0),
        "skipped_rounds": counts.get("skipped", 0),
        "missed_rounds": counts.get("missed", 0),
        "next_round": next_round,
        "latest_analysis": analysis_brief(latest_analysis(db, site.id)),
        "ends_at": site.started_at + timedelta(hours=site.duration_hours),
    }


def patient_out(db: Session, patient: Patient, now: datetime | None = None) -> dict[str, Any]:
    sites = [site_out(db, s, now) for s in patient.iv_sites]
    return patient_brief(patient) | {
        "birth_date": patient.birth_date,
        "weight_kg": patient.weight_kg,
        "diagnosis": patient.diagnosis,
        "admitted_at": patient.admitted_at,
        "discharged_at": patient.discharged_at,
        "attending_nurse": user_brief(patient.attending_nurse),
        "sites": sites,
        "active_sites": sum(1 for s in sites if s["status"] in scheduling.MONITORED),
    }
