from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import IvSite, Patient
from ..security import CurrentUser
from ..serializers import round_brief, site_out
from ..services import ai_client, audit, scheduling, settings_store, storage

router = APIRouter(tags=["iv-sites"])


class RemoveIn(BaseModel):
    reason: str


def quality_blocks(quality: dict, allow_manual: bool) -> bool:
    return quality.get("status") == "RETAKE" or (quality.get("status") == "MANUAL_REVIEW" and not allow_manual)


@router.post("/api/ai/quality-check")
async def quality_check(_: CurrentUser, image: Annotated[UploadFile, File()]):
    """Capture-quality check for the camera step; nothing is stored."""
    data, content_type = await storage.read_upload(image)
    return await run_in_threadpool(ai_client.check_quality, data, content_type)


@router.post("/api/patients/{patient_id}/iv-sites", status_code=201)
async def create_site(
    patient_id: int,
    user: CurrentUser,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    body_side: Annotated[str, Form()],
    location: Annotated[str, Form()],
    vein: Annotated[str, Form()],
    baseline_image: Annotated[UploadFile, File()],
    interval_hours: Annotated[int | None, Form(ge=1, le=24)] = None,
    allow_manual_quality_review: Annotated[bool, Form()] = False,
):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(404, detail="ไม่พบผู้ป่วย")
    if patient.status != "admitted":
        raise HTTPException(409, detail="ผู้ป่วยสิ้นสุดการติดตามแล้ว")

    data, content_type = await storage.read_upload(baseline_image)
    quality = await run_in_threadpool(ai_client.check_quality, data, content_type)
    allow_manual = allow_manual_quality_review and settings_store.get(db, "allow_manual_quality_review")
    if quality_blocks(quality, allow_manual):
        raise HTTPException(422, detail={"message": "ภาพอ้างอิงไม่ผ่านเกณฑ์คุณภาพ", "quality": quality})

    now = scheduling.now_utc()
    needle_no = (db.scalar(select(func.max(IvSite.needle_no)).where(IvSite.patient_id == patient.id)) or 0) + 1
    site = IvSite(
        patient_id=patient.id,
        needle_no=needle_no,
        body_side=body_side,
        location=location,
        vein=vein,
        interval_hours=interval_hours or settings_store.get(db, "default_interval_hours"),
        duration_hours=settings_store.get(db, "tracking_duration_hours"),
        started_at=now,
        created_by_id=user.id,
    )
    site.rounds = scheduling.create_rounds(site)
    db.add(site)
    db.flush()

    image = storage.save_image(data, content_type, kind="baseline", iv_site_id=site.id, uploaded_by_id=user.id)
    image.quality = quality
    db.add(image)
    db.flush()
    site.baseline_image_id = image.id

    target = f"{patient.hn} · เข็ม #{needle_no} {location}"
    audit.record(db, actor=user, event_type="photo", category="schedule", event="บันทึกภาพอ้างอิงเริ่มต้น",
                 target=target, request=request)
    audit.record(db, actor=user, event_type="start", category="schedule", event="เริ่มติดตาม IV Site",
                 target=target,
                 details=f"{vein} · ด้าน{body_side} · ตรวจทุก {site.interval_hours} ชม. "
                         f"· {len(site.rounds)} รอบ ({site.duration_hours} ชม.)",
                 request=request)
    db.commit()
    return site_out(db, site)


@router.get("/api/iv-sites/{site_id}")
def get_site(site_id: int, _: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    scheduling.refresh(db)
    site = db.get(IvSite, site_id)
    if site is None:
        raise HTTPException(404, detail="ไม่พบ IV Site")
    return site_out(db, site) | {"rounds": [round_brief(r) for r in site.rounds]}


@router.post("/api/iv-sites/{site_id}/remove")
def remove_site(
    site_id: int, body: RemoveIn, user: CurrentUser, request: Request, db: Annotated[Session, Depends(get_db)]
):
    site = db.get(IvSite, site_id)
    if site is None:
        raise HTTPException(404, detail="ไม่พบ IV Site")
    if site.status != "active":
        raise HTTPException(409, detail="IV Site นี้ถอดเข็มหรือสิ้นสุดการติดตามแล้ว")
    scheduling.remove_needle(db, site, scheduling.now_utc())
    site.removal_reason = body.reason
    site.removed_by_id = user.id
    audit.record(
        db, actor=user, event_type="complete", category="schedule", event=f"ถอดเข็ม #{site.needle_no}",
        target=f"{site.patient.hn} · {site.location}",
        details=f"เหตุผล: {body.reason} · ติดตามต่อทุก {site.interval_hours} ชม. จนครบระยะเดิม", request=request,
    )
    db.commit()
    return site_out(db, site)
