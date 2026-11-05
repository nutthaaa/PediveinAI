from __future__ import annotations

import secrets
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AiAnalysis, InspectionRound, IvSite, Patient, User
from ..security import AdminUser, CurrentUser
from ..serializers import analysis_out, patient_out, round_brief, site_brief
from ..services import audit, deletion, scheduling

router = APIRouter(prefix="/api/patients", tags=["patients"])

UNNAMED = "ไม่ระบุชื่อ"


class PatientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    # Only room and gender are required; a blank HN gets a generated 10-digit number.
    hn: str | None = Field(default=None, max_length=32)
    an: str | None = Field(default=None, max_length=32)
    full_name: str | None = Field(default=None, max_length=200)
    gender: Literal["male", "female", "other"]
    birth_date: date | None = None
    weight_kg: float | None = Field(default=None, gt=0, lt=300)
    diagnosis: str | None = None
    ward: str = "PICU"
    room: str = Field(min_length=1, max_length=64)
    bed: str | None = None
    attending_nurse_id: int | None = None


class PatientUpdate(BaseModel):
    an: str | None = None
    full_name: str | None = None
    gender: Literal["male", "female", "other"] | None = None
    birth_date: date | None = None
    weight_kg: float | None = Field(default=None, gt=0, lt=300)
    diagnosis: str | None = None
    ward: str | None = None
    room: str | None = None
    bed: str | None = None
    attending_nurse_id: int | None = None


class DischargeIn(BaseModel):
    note: str | None = None


def get_patient(db: Session, patient_id: int) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(404, detail="ไม่พบผู้ป่วย")
    return patient


@router.get("")
def list_patients(
    user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: Literal["admitted", "discharged", "all"] = "admitted",
    mine: bool = False,
    ward: str | None = None,
):
    scheduling.refresh(db)
    stmt = select(Patient).order_by(Patient.ward, Patient.bed, Patient.id)
    if status != "all":
        stmt = stmt.where(Patient.status == status)
    if mine:
        stmt = stmt.where(Patient.attending_nurse_id == user.id)
    if ward:
        stmt = stmt.where(Patient.ward == ward)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Patient.full_name.ilike(like), Patient.hn.ilike(like), Patient.an.ilike(like),
                Patient.bed.ilike(like), Patient.room.ilike(like))
        )
    now = scheduling.now_utc()
    return [patient_out(db, p, now) for p in db.scalars(stmt)]


def generate_hn(db: Session) -> str:
    """Random 10-digit HN (no leading zero) that is not used yet."""
    while True:
        hn = str(10**9 + secrets.randbelow(9 * 10**9))
        if db.scalar(select(Patient.id).where(Patient.hn == hn)) is None:
            return hn


@router.post("", status_code=201)
def create_patient(body: PatientCreate, user: CurrentUser, request: Request, db: Annotated[Session, Depends(get_db)]):
    if body.hn and db.scalar(select(Patient.id).where(Patient.hn == body.hn)):
        raise HTTPException(409, detail="มี HN นี้ในระบบแล้ว")
    if body.attending_nurse_id and db.get(User, body.attending_nurse_id) is None:
        raise HTTPException(422, detail="ไม่พบพยาบาลผู้ดูแล")
    values = body.model_dump()
    values["hn"] = body.hn or generate_hn(db)
    values["full_name"] = body.full_name or UNNAMED
    values["ward"] = body.ward or "PICU"
    patient = Patient(**values)
    db.add(patient)
    audit.record(
        db, actor=user, event_type="start", category="schedule", event="ลงทะเบียนผู้ป่วย",
        target=f"{patient.hn} · {patient.ward} {body.room} {body.bed or ''}".strip(), request=request,
    )
    db.commit()
    return patient_out(db, patient)


@router.get("/{patient_id}")
def get_patient_detail(patient_id: int, _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    scheduling.refresh(db)
    return patient_out(db, get_patient(db, patient_id))


@router.patch("/{patient_id}")
def update_patient(
    patient_id: int, body: PatientUpdate, user: CurrentUser, request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    patient = get_patient(db, patient_id)
    changes = body.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(patient, key, value)
    audit.record(
        db, actor=user, event_type="start", category="schedule", event="แก้ไขข้อมูลผู้ป่วย",
        target=patient.hn, details="แก้ไข: " + ", ".join(changes), request=request,
    )
    db.commit()
    return patient_out(db, patient)


@router.post("/{patient_id}/discharge")
def discharge(
    patient_id: int, body: DischargeIn, user: CurrentUser, request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """End tracking for every IV site of the patient and mark them discharged."""
    patient = get_patient(db, patient_id)
    if patient.status == "discharged":
        raise HTTPException(409, detail="ผู้ป่วยสิ้นสุดการติดตามแล้ว")
    now = scheduling.now_utc()
    for site in patient.iv_sites:
        if site.status in scheduling.MONITORED:
            scheduling.close_site(db, site, "completed", now)
    patient.status = "discharged"
    patient.discharged_at = now
    patient.discharge_note = body.note
    audit.record(
        db, actor=user, event_type="complete", category="schedule", event="สิ้นสุดการติดตามผู้ป่วย",
        target=f"{patient.hn} · {patient.ward} {patient.bed or ''}".strip(), details=body.note,
        request=request,
    )
    db.commit()
    return patient_out(db, patient)


@router.get("/{patient_id}/rounds")
def patient_rounds(patient_id: int, _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    """Rounds that already happened (completed/skipped/missed), newest first."""
    get_patient(db, patient_id)
    rows = db.execute(
        select(InspectionRound, IvSite)
        .join(IvSite, InspectionRound.iv_site_id == IvSite.id)
        .where(IvSite.patient_id == patient_id, InspectionRound.status.in_(("completed", "skipped", "missed")))
        .order_by(InspectionRound.due_at.desc())
    ).all()
    result = []
    for round_, site in rows:
        analysis = round_.analyses[-1] if round_.analyses else None
        result.append(
            round_brief(round_)
            | {"site": site_brief(site), "analysis": analysis_out(db, analysis) if analysis else None}
        )
    return result


@router.get("/{patient_id}/analyses")
def patient_analyses(patient_id: int, _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    get_patient(db, patient_id)
    analyses = db.scalars(
        select(AiAnalysis)
        .join(IvSite, AiAnalysis.iv_site_id == IvSite.id)
        .where(IvSite.patient_id == patient_id, AiAnalysis.status == "OK")
        .order_by(AiAnalysis.id.desc())
    )
    return [analysis_out(db, a) for a in analyses]


class PatientDeleteIn(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


@router.post("/{patient_id}/delete")
def delete_patient(
    patient_id: int, body: PatientDeleteIn, admin: AdminUser, request: Request,
    db: Annotated[Session, Depends(get_db)],
):
    """Permanently delete a whole patient case (registration mistake or test case)."""
    patient = get_patient(db, patient_id)
    target = f"{patient.hn} · {patient.full_name}"
    files, counts = deletion.delete_patient(db, patient)
    audit.record(
        db, actor=admin, event_type="system", category="schedule", event="ลบเคสผู้ป่วย (ถาวร)", target=target,
        details=f"IV Site {counts['sites']} · ผล AI {counts['analyses']} · ภาพ {counts['images']} · "
                f"เหตุผล: {body.reason.strip()}",
        request=request,
    )
    db.commit()
    deletion.remove_files(files)
    return {"deleted": True}
