"""Retraining from clinician-confirmed reviews, and the model-version history.

The AI service owns the model files and runs training; this module decides what to train on,
names versions, mirrors their progress/metrics/log into ``model_versions`` and runs the schedule.
A new version is never activated here: an admin activates it from the model page.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import AiAnalysis, ModelVersion, User
from . import ai_client, audit, scheduling, settings_store
from .ai_client import AiServiceError

FINISHED = ("succeeded", "failed")
# The AI service needs >=20 training and >=5 test images after its by-patient split.
MIN_LABELS = 25
VERSION_PREFIX = "PEDIVEIN_MULTITASK_CANDIDATE_V2"


def label_for(reviews) -> tuple[str, int] | str:
    """Training label from the two per-condition reviews, or the reason the image is left out.

    The model predicts one condition (INF or PHL) and its grade, so an image is usable only when
    exactly one condition has the higher confirmed grade. Images with no finding are left out
    until the model has a "normal" class.
    """
    by_condition = {review.condition: review for review in reviews}
    if set(by_condition) != {"infiltration", "phlebitis"}:
        return "incomplete_review"

    def grade(condition: str) -> int:
        review = by_condition[condition]
        return review.grade if review.finding == "observation_found" and review.grade >= 1 else 0

    infiltration, phlebitis = grade("infiltration"), grade("phlebitis")
    if infiltration == phlebitis == 0:
        return "no_finding"
    if infiltration == phlebitis:
        return "both_conditions_same_grade"
    return ("INF", infiltration) if infiltration > phlebitis else ("PHL", phlebitis)


def build_dataset(db: Session) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    analyses = db.scalars(
        select(AiAnalysis)
        .where(AiAnalysis.review_status == "reviewed", AiAnalysis.prediction_issued.is_(True))
        .options(selectinload(AiAnalysis.reviews), selectinload(AiAnalysis.image), selectinload(AiAnalysis.iv_site))
        .order_by(AiAnalysis.id)
    ).all()
    samples: list[dict[str, Any]] = []
    analysis_ids: list[int] = []
    excluded: Counter = Counter()
    for analysis in analyses:
        label = label_for(analysis.reviews)
        if isinstance(label, str):
            excluded[label] += 1
            continue
        preprocessing = analysis.preprocessing or {}
        samples.append({
            "image": analysis.image.storage_path,
            # Only an internal id leaves the backend; it groups images for the by-patient split.
            "patient": str(analysis.iv_site.patient_id),
            "condition": label[0],
            "grade": label[1],
            "selected_arm_id": preprocessing.get("selected_arm_id") if preprocessing.get("manual_target_selection") else None,
        })
        analysis_ids.append(analysis.id)

    last = db.scalar(
        select(ModelVersion)
        .where(ModelVersion.is_builtin.is_(False), ModelVersion.state == "succeeded")
        .order_by(ModelVersion.created_at.desc())
        .limit(1)
    )
    used = set((last.dataset or {}).get("analysis_ids", [])) if last else set()
    summary = {
        "labelled": len(samples),
        "patients": len({s["patient"] for s in samples}),
        "condition": dict(sorted(Counter(s["condition"] for s in samples).items())),
        "grade": {str(g): sum(1 for s in samples if s["grade"] == g) for g in range(1, 5)},
        "excluded": dict(excluded),
        "new_since_last_training": len(set(analysis_ids) - used),
        "min_required": MIN_LABELS,
        "analysis_ids": analysis_ids,
    }
    return samples, summary


def public_summary(summary: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in summary.items() if k != "analysis_ids"}


def _parse_time(value: str | None) -> datetime | None:
    try:
        return datetime.fromisoformat(value) if value else None
    except ValueError:
        return None


def sync(db: Session) -> dict[str, Any] | None:
    """Mirror the AI registry into ``model_versions``; returns the AI listing or None if unreachable."""
    return sync_with_error(db)[0]


def sync_with_error(db: Session) -> tuple[dict[str, Any] | None, str | None]:
    try:
        listing = ai_client.list_models()
    except AiServiceError as exc:
        if exc.status_code == 404:
            return None, "บริการ AI ที่รันอยู่เป็นเวอร์ชันเก่าที่ยังไม่มีระบบจัดการโมเดล ต้อง build image ของบริการ AI ใหม่"
        return None, str(exc.detail)
    rows = {row.version: row for row in db.scalars(select(ModelVersion))}
    for item in listing.get("versions", []):
        version = item["version"]
        meta = item.get("metadata")
        row = rows.get(version)
        if row is None:
            row = ModelVersion(
                version=version, state=item["state"], is_builtin=item.get("builtin", False),
                trigger="builtin" if item.get("builtin") else "manual",
                base_version=(meta or {}).get("base_version"),
            )
            db.add(row)
            rows[version] = row
        was_finished = row.state in FINISHED and row.log is not None
        row.state = item["state"]
        row.progress = item.get("progress")
        row.message = item.get("message")
        row.error = item.get("error")
        if meta:
            row.model_metadata = meta
            row.base_version = meta.get("base_version", row.base_version)
        if row.state in FINISHED and not was_finished and not row.is_builtin:
            try:
                row.log = ai_client.get_model(version).get("log") or ""
            except AiServiceError:
                continue
            row.finished_at = _parse_time(item.get("finished_at")) or scheduling.now_utc()
            succeeded = row.state == "succeeded"
            metrics = (meta or {}).get("test_metrics") or {}
            audit.record(
                db, actor=None, actor_name="บริการ AI", event_type="ai", category="ai",
                event="เทรนโมเดลเสร็จ" if succeeded else "เทรนโมเดลไม่สำเร็จ", target=version,
                details=(
                    f"Condition acc {metrics.get('condition', {}).get('accuracy', 0):.0%} · "
                    f"Grade acc {metrics.get('grade', {}).get('accuracy', 0):.0%} · รอการอนุมัติก่อนใช้งาน"
                    if succeeded and metrics else row.error
                ),
            )
    for version, row in rows.items():
        if version not in {item["version"] for item in listing.get("versions", [])} and row.state not in FINISHED:
            row.state = "failed"
            row.error = "ไม่พบเวอร์ชันนี้ในบริการ AI"
        row.is_active = version == listing.get("active")
    db.flush()
    return listing, None


def next_version(db: Session) -> str:
    existing = set(db.scalars(select(ModelVersion.version)))
    number = 1
    while f"{VERSION_PREFIX}.{number}.0" in existing:
        number += 1
    return f"{VERSION_PREFIX}.{number}.0"


def start(
    db: Session,
    *,
    user: User | None,
    trigger: str,
    notes: str | None = None,
    epochs: int | None = None,
    request: Request | None = None,
) -> ModelVersion:
    listing = sync(db)
    if listing is None:
        raise AiServiceError("ไม่สามารถเชื่อมต่อบริการ AI ได้")
    if listing.get("training_running"):
        raise HTTPException(409, detail="มีการเทรนโมเดลกำลังทำงานอยู่")
    samples, summary = build_dataset(db)
    if len(samples) < MIN_LABELS:
        raise HTTPException(
            422, detail=f"มีภาพที่ยืนยันผลแล้วและใช้เทรนได้ {len(samples)} ภาพ ต้องมีอย่างน้อย {MIN_LABELS} ภาพ"
        )
    version = next_version(db)
    base = listing.get("active") or ai_client.BUILTIN_MODEL_VERSION
    body: dict[str, Any] = {"version": version, "base_version": base, "samples": samples}
    if epochs:
        body["epochs"] = epochs
    status = ai_client.start_training(body)
    row = ModelVersion(
        version=version, state=status.get("state", "queued"), progress=status.get("progress"),
        message=status.get("message"), base_version=base, trigger=trigger, notes=notes,
        dataset=summary, started_by_id=user.id if user else None,
    )
    db.add(row)
    audit.record(
        db, actor=user, actor_name=None if user else "ระบบ (ตั้งเวลา)", event_type="ai", category="ai",
        event="เริ่มเทรนโมเดล", target=version,
        details=f"จาก {base} · ภาพ {summary['labelled']} ภาพ / ผู้ป่วย {summary['patients']} คน "
                f"(ใหม่ {summary['new_since_last_training']}) · {'ตั้งเวลา' if trigger == 'schedule' else 'สั่งเอง'}",
        request=request,
    )
    db.flush()
    return row


def activate(db: Session, row: ModelVersion, user: User, request: Request) -> ModelVersion:
    if row.state != "succeeded":
        raise HTTPException(409, detail="ใช้งานได้เฉพาะเวอร์ชันที่เทรนสำเร็จ")
    previous = db.scalar(select(ModelVersion).where(ModelVersion.is_active.is_(True)))
    ai_client.activate_model(row.version)
    for other in db.scalars(select(ModelVersion).where(ModelVersion.is_active.is_(True))):
        other.is_active = False
    row.is_active = True
    row.activated_at = scheduling.now_utc()
    row.activated_by_id = user.id
    audit.record(
        db, actor=user, event_type="permission", category="ai", event="เปลี่ยนโมเดล AI ที่ใช้งาน",
        target=row.version, details=f"จาก {previous.version if previous else '-'} เป็น {row.version}",
        request=request,
    )
    db.flush()
    return row


def scheduled_tick(db: Session) -> ModelVersion | None:
    """Keep the history in sync and start a scheduled retrain when it is due and there is new data."""
    if sync(db) is None:
        return None
    settings = settings_store.get_all(db)
    if not settings["auto_retrain_enabled"]:
        return None
    last = db.scalar(
        select(ModelVersion).where(ModelVersion.is_builtin.is_(False)).order_by(ModelVersion.created_at.desc()).limit(1)
    )
    if last is not None:
        if last.state not in FINISHED:
            return None
        if scheduling.now_utc() - last.created_at < timedelta(days=settings["auto_retrain_interval_days"]):
            return None
    samples, summary = build_dataset(db)
    if len(samples) < MIN_LABELS or summary["new_since_last_training"] < settings["auto_retrain_min_new_labels"]:
        return None
    return start(db, user=None, trigger="schedule", notes="เทรนอัตโนมัติตามรอบเวลา")
