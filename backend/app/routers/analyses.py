from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AiAnalysis, IvSite, Patient, Review, User
from ..security import AdminUser, CurrentUser
from ..serializers import CONDITIONS, RISK_LEVELS, analysis_out, patient_brief, site_brief, user_brief
from ..services import audit, deletion, scheduling

router = APIRouter(tags=["analyses"])

Condition = Literal["infiltration", "phlebitis"]


class ReviewIn(BaseModel):
    condition: Condition
    finding: Literal["no_observation", "observation_found"]
    grade: int = Field(default=0, ge=0, le=4)
    has_pain: bool | None = None
    note: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def grade_matches_finding(self):
        if self.finding == "no_observation":
            self.grade = 0
        elif self.grade == 0:
            raise ValueError("ต้องระบุ Grade 1-4 เมื่อพบข้อสังเกต")
        return self


class AssignIn(BaseModel):
    reviewer_id: int


def get_analysis(db: Session, analysis_id: int) -> AiAnalysis:
    analysis = db.get(AiAnalysis, analysis_id)
    if analysis is None:
        raise HTTPException(404, detail="ไม่พบผลการวิเคราะห์")
    return analysis


@router.get("/api/analyses/review-queue")
def review_queue(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    condition: Literal["all", "infiltration", "phlebitis"] = "all",
    assigned_to_me: bool = False,
):
    """One item per (analysis, condition) that still needs a clinician review."""
    stmt = (
        select(AiAnalysis)
        .join(IvSite, AiAnalysis.iv_site_id == IvSite.id)
        .join(Patient, IvSite.patient_id == Patient.id)
        .where(AiAnalysis.review_status == "pending_review")
        .order_by(AiAnalysis.created_at)
    )
    if assigned_to_me:
        stmt = stmt.where(AiAnalysis.assigned_reviewer_id == user.id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Patient.full_name.ilike(like), Patient.hn.ilike(like), Patient.an.ilike(like),
                IvSite.location.ilike(like), IvSite.vein.ilike(like))
        )
    items = []
    for analysis in db.scalars(stmt):
        out = analysis_out(db, analysis)
        for name, view in out["conditions"].items():
            if view["review"] is None and condition in ("all", name):
                items.append({"key": f"{analysis.id}-{name}", "condition": name, "analysis": out})
    return items


@router.get("/api/analyses/{analysis_id}")
def get_analysis_detail(analysis_id: int, _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    return analysis_out(db, get_analysis(db, analysis_id))


@router.post("/api/analyses/{analysis_id}/reviews")
def submit_review(
    analysis_id: int, body: ReviewIn, user: CurrentUser, request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """Create or update the clinician confirmation for one condition of an analysis."""
    analysis = get_analysis(db, analysis_id)
    if not analysis.prediction_issued:
        raise HTTPException(409, detail="ผลการวิเคราะห์นี้ไม่ได้ออกผล AI จึงไม่สามารถทบทวนได้")
    review = next((r for r in analysis.reviews if r.condition == body.condition), None)
    edited = review is not None
    if review is None:
        review = Review(analysis_id=analysis.id, condition=body.condition, reviewer_id=user.id, finding=body.finding)
        analysis.reviews.append(review)
    review.finding = body.finding
    # Pain at the IV site means at least Grade 2.
    review.grade = 2 if body.finding == "observation_found" and body.grade == 1 and body.has_pain else body.grade
    review.has_pain = body.has_pain
    review.note = body.note
    review.reviewer_id = user.id
    reviewed = {r.condition for r in analysis.reviews}
    analysis.review_status = "reviewed" if reviewed >= set(CONDITIONS) else "pending_review"

    site = analysis.iv_site
    result = f"Grade {review.grade} ({RISK_LEVELS[review.grade]})" if review.grade else "ไม่พบข้อสังเกต"
    audit.record(
        db, actor=user, event_type="review", category="ai",
        event=f"{'แก้ไข' if edited else 'ยืนยัน'}ผลทบทวน {body.condition.capitalize()}",
        target=f"{site.patient.hn} · เข็ม #{site.needle_no}",
        details=f"ผลยืนยัน: {result} · AI คาดการณ์: {analysis.condition_prediction} Grade "
                f"{analysis.grade_prediction}" + (f" · หมายเหตุ: {body.note}" if body.note else ""),
        request=request,
    )
    db.commit()
    db.refresh(analysis)
    return analysis_out(db, analysis)


@router.post("/api/analyses/{analysis_id}/assign")
def assign_reviewer(
    analysis_id: int, body: AssignIn, user: CurrentUser, request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    analysis = get_analysis(db, analysis_id)
    reviewer = db.get(User, body.reviewer_id)
    if reviewer is None or not reviewer.is_active:
        raise HTTPException(422, detail="ไม่พบผู้ทบทวน")
    analysis.assigned_reviewer_id = reviewer.id
    analysis.assigned_at = scheduling.now_utc()
    patient = analysis.iv_site.patient
    audit.notify(
        db, category="ai", user_id=reviewer.id, title=f"คุณได้รับมอบหมายให้ทบทวนผล AI: {patient.full_name}",
        body=f"มอบหมายโดย {user.full_name}", link="ai_review", patient_id=patient.id, analysis_id=analysis.id,
    )
    audit.record(
        db, actor=user, event_type="review", category="ai", event="มอบหมายผู้ทบทวนผล AI",
        target=f"{patient.hn} · {reviewer.full_name}", request=request,
    )
    db.commit()
    return analysis_out(db, analysis)


@router.get("/api/history")
def review_history(
    _: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    condition: Literal["all", "infiltration", "phlebitis"] = "all",
    finding: Literal["all", "observation_found", "no_observation"] = "all",
    limit: int = 200,
):
    """Clinician-confirmed results, newest first."""
    stmt = (
        select(Review)
        .join(AiAnalysis, Review.analysis_id == AiAnalysis.id)
        .join(IvSite, AiAnalysis.iv_site_id == IvSite.id)
        .join(Patient, IvSite.patient_id == Patient.id)
        .order_by(Review.updated_at.desc())
        .limit(min(limit, 1000))
    )
    if condition != "all":
        stmt = stmt.where(Review.condition == condition)
    if finding != "all":
        stmt = stmt.where(Review.finding == finding)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Patient.full_name.ilike(like), Patient.hn.ilike(like), Patient.an.ilike(like)))
    result = []
    for review in db.scalars(stmt):
        analysis = review.analysis
        site = analysis.iv_site
        code = CONDITIONS[review.condition]
        result.append({
            "id": review.id,
            "condition": review.condition,
            "finding": review.finding,
            "grade": review.grade,
            "risk_level": RISK_LEVELS[review.grade],
            "has_pain": review.has_pain,
            "note": review.note,
            "reviewer": user_brief(review.reviewer),
            "reviewed_at": review.updated_at,
            "ai_probability": analysis.prob_inf if code == "INF" else analysis.prob_phl,
            "ai_flagged": analysis.condition_prediction == code,
            "ai_grade": analysis.grade_prediction if analysis.condition_prediction == code else None,
            "analysis_id": analysis.id,
            "analyzed_at": analysis.created_at,
            "image_url": f"/api/images/{analysis.image_id}",
            "site": site_brief(site),
            "patient": patient_brief(site.patient),
        })
    return result


class DeleteIn(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


@router.post("/api/analyses/{analysis_id}/delete")
def delete_analysis(
    analysis_id: int, body: DeleteIn, admin: AdminUser, request: Request, db: Annotated[Session, Depends(get_db)]
):
    """Permanently delete one AI analysis (e.g. wrong patient or wrong photo) with its reviews and photo."""
    analysis = get_analysis(db, analysis_id)
    site = analysis.iv_site
    round_text = f" · รอบ {analysis.round.round_no}" if analysis.round else ""
    result = f"{analysis.condition_prediction} Grade {analysis.grade_prediction}" if analysis.prediction_issued else analysis.status
    files = deletion.delete_analysis(db, analysis)
    audit.record(
        db, actor=admin, event_type="system", category="ai", event="ลบผลวิเคราะห์ AI (ถาวร)",
        target=f"{site.patient.hn} · เข็ม #{site.needle_no}{round_text}",
        details=f"ผล AI: {result} · เหตุผล: {body.reason.strip()}", request=request,
    )
    db.commit()
    deletion.remove_files(files)
    return {"deleted": True}
