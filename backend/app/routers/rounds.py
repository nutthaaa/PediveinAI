from __future__ import annotations

import re
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AiAnalysis, InspectionRound, IvSite, Patient
from ..security import CurrentUser
from ..serializers import analysis_out, patient_brief, round_brief, site_out
from ..services import ai_client, audit, scheduling, settings_store, storage

router = APIRouter(prefix="/api/rounds", tags=["rounds"])

ARM_ID = re.compile(r"ARM[0-9]{2}")


class SkipIn(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


def get_round(db: Session, round_id: int) -> InspectionRound:
    round_ = db.get(InspectionRound, round_id)
    if round_ is None:
        raise HTTPException(404, detail="ไม่พบรอบตรวจ")
    if round_.status != "pending" or round_.iv_site.status not in scheduling.MONITORED:
        raise HTTPException(409, detail="รอบตรวจนี้ถูกบันทึกแล้ว หรือ IV Site สิ้นสุดการติดตาม")
    return round_


@router.get("/board")
def board(
    _: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: Literal["all", "overdue", "due", "upcoming", "ai_review"] = "all",
):
    """One row per active IV site with its current round, ordered by urgency."""
    scheduling.refresh(db)
    stmt = (
        select(IvSite)
        .join(Patient, IvSite.patient_id == Patient.id)
        .where(IvSite.status.in_(scheduling.MONITORED), Patient.status == "admitted")
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Patient.full_name.ilike(like), Patient.hn.ilike(like), Patient.an.ilike(like),
                Patient.bed.ilike(like), Patient.ward.ilike(like), IvSite.location.ilike(like))
        )
    now = scheduling.now_utc()
    rows = []
    for site in db.scalars(stmt):
        out = site_out(db, site, now) | {"patient": patient_brief(site.patient)}
        schedule = (out["next_round"] or {}).get("schedule_status")
        latest = out["latest_analysis"]
        needs_review = bool(latest and latest["review_status"] == "pending_review")
        if status == "ai_review" and not needs_review:
            continue
        if status in ("overdue", "due", "upcoming") and schedule != status:
            continue
        rows.append(out)
    order = {"overdue": 0, "due": 1, "upcoming": 2, None: 3}
    rows.sort(key=lambda r: (order[(r["next_round"] or {}).get("schedule_status")],
                             (r["next_round"] or {}).get("due_at") or now))
    return rows


@router.post("/{round_id}/skip")
def skip_round(
    round_id: int, body: SkipIn, user: CurrentUser, request: Request, db: Annotated[Session, Depends(get_db)]
):
    round_ = get_round(db, round_id)
    scheduling.mark_earlier_missed(db, round_)
    round_.status = "skipped"
    round_.skip_reason = body.reason
    round_.completed_at = scheduling.now_utc()
    round_.performed_by_id = user.id
    site = round_.iv_site
    audit.record(
        db, actor=user, event_type="skip", category="schedule", event=f"ข้ามรอบตรวจ: {body.reason}",
        target=f"{site.patient.hn} · เข็ม #{site.needle_no} · รอบ {round_.round_no}",
        details="การข้ามรอบไม่เริ่มนับระยะเวลา 7 วันใหม่", request=request,
    )
    if settings_store.get(db, "notify_skipped_rounds"):
        audit.notify(
            db, category="due", title=f"ข้ามรอบตรวจ: {site.patient.full_name}",
            body=f"เข็ม #{site.needle_no} {site.location} · รอบ {round_.round_no} · {body.reason} "
                 f"· บันทึกโดย {user.full_name}",
            link="rounds", patient_id=site.patient.id, round_id=round_.id,
        )
    db.commit()
    return round_brief(round_)


@router.post("/{round_id}/inspect")
async def inspect_round(
    round_id: int,
    user: CurrentUser,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    image: Annotated[UploadFile, File()],
    selected_arm_id: Annotated[str | None, Form()] = None,
    allow_manual_quality_review: Annotated[bool, Form()] = False,
):
    """Store the round photo and run AI.

    The round is completed only when AI issues a prediction; on QUALITY_HOLD or
    PREPROCESSING_HOLD the analysis is kept for audit and the nurse retakes or picks an arm.
    """
    round_ = get_round(db, round_id)
    if not settings_store.get(db, "ai_enabled"):
        raise HTTPException(503, detail="ระบบ AI ถูกปิดใช้งานในการตั้งค่าระบบ")
    if selected_arm_id is not None and not ARM_ID.fullmatch(selected_arm_id):
        raise HTTPException(422, detail="selected_arm_id ไม่ถูกต้อง")
    allow_manual = allow_manual_quality_review and settings_store.get(db, "allow_manual_quality_review")

    data, content_type = await storage.read_upload(image)
    result, elapsed_ms = await run_in_threadpool(
        ai_client.predict, data, content_type,
        selected_arm_id=selected_arm_id, allow_manual_quality_review=allow_manual,
    )

    site = round_.iv_site
    stored = storage.save_image(data, content_type, kind="round", iv_site_id=site.id, uploaded_by_id=user.id)
    stored.quality = result.get("quality")
    db.add(stored)
    db.flush()

    preprocessing = dict(result.get("preprocessing") or {})
    # Arm previews are patient images: return them to the caller but never persist them.
    candidates = preprocessing.pop("manual_review_candidates", [])
    preprocessing.pop("output_path", None)
    issued = result.get("status") == "OK" and bool(result.get("prediction_issued"))
    probabilities = result.get("condition_probabilities") or {}
    analysis = AiAnalysis(
        iv_site_id=site.id,
        round_id=round_.id,
        image_id=stored.id,
        status=result.get("status", "UNKNOWN"),
        prediction_issued=issued,
        condition_prediction=result.get("condition_prediction") if issued else None,
        prob_inf=probabilities.get("INF") if issued else None,
        prob_phl=probabilities.get("PHL") if issued else None,
        grade_prediction=result.get("grade_prediction") if issued else None,
        grade_probabilities=result.get("grade_probabilities") if issued else None,
        quality=result.get("quality"),
        preprocessing=preprocessing or None,
        model_version=result.get("model_version") or ai_client.BUILTIN_MODEL_VERSION,
        model_status=result.get("model_status"),
        processing_ms=elapsed_ms,
        review_status="pending_review" if issued else "not_applicable",
        created_by_id=user.id,
    )
    db.add(analysis)

    patient = site.patient
    target = f"{patient.hn} · เข็ม #{site.needle_no} · รอบ {round_.round_no}"
    audit.record(db, actor=user, event_type="photo", category="schedule", event="บันทึกภาพ IV Site",
                 target=target, request=request)
    if issued:
        scheduling.mark_earlier_missed(db, round_)
        round_.status = "completed"
        round_.completed_at = scheduling.now_utc()
        round_.performed_by_id = user.id
        round_.image_id = stored.id
        name = "Infiltration" if analysis.condition_prediction == "INF" else "Phlebitis"
        confidence = max(analysis.prob_inf or 0, analysis.prob_phl or 0)
        audit.record(
            db, actor=None, actor_name="บริการ AI", event_type="ai", category="ai", event="วิเคราะห์ภาพ",
            target=f"{name} {confidence:.0%} · Grade {analysis.grade_prediction}",
            details=f"{target} · INF {analysis.prob_inf:.0%} / PHL {analysis.prob_phl:.0%} "
                    f"· ประมวลผล {elapsed_ms / 1000:.1f} วินาที · โมเดล {analysis.model_version} (ทดลอง)",
            request=None,
        )
        db.flush()
        if settings_store.get(db, "notify_ai_findings"):
            audit.notify(
                db, category="ai", title=f"AI พบข้อสังเกต {name}: {patient.full_name}",
                body=f"เข็ม #{site.needle_no} {site.location} · Grade {analysis.grade_prediction} "
                     f"· ความเชื่อมั่น {confidence:.0%} · รอการทบทวน",
                link="ai_review", patient_id=patient.id, analysis_id=analysis.id,
            )
    else:
        reason = (result.get("quality") or {}).get("reasons") or [preprocessing.get("reason")]
        audit.record(
            db, actor=None, actor_name="บริการ AI", event_type="ai", category="ai",
            event="AI ไม่ออกผล (ต้องถ่ายภาพใหม่หรือเลือกแขน)", target=target,
            details=f"{analysis.status}: {', '.join(str(r) for r in reason if r)}",
        )
    db.commit()
    db.refresh(analysis)
    return analysis_out(db, analysis) | {"manual_review_candidates": candidates}
