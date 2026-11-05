from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import SystemSetting

DEFAULTS: dict[str, Any] = {
    # Rounds become "due" this many minutes before due_at ...
    "due_window_minutes": 15,
    # ... and "overdue" this many minutes after due_at.
    "overdue_grace_minutes": 15,
    "default_interval_hours": 2,
    # After the needle is removed the site is still observed at this interval until the window ends.
    "post_removal_interval_hours": 8,
    "tracking_duration_hours": 168,
    "ai_enabled": True,
    # Allow staff to run AI on images that the quality checker marks MANUAL_REVIEW.
    "allow_manual_quality_review": True,
    # Retraining from clinician-confirmed reviews. New versions are never activated automatically.
    "auto_retrain_enabled": False,
    "auto_retrain_interval_days": 7,
    "auto_retrain_min_new_labels": 20,
    "notify_overdue": True,
    "notify_ai_findings": True,
    "notify_skipped_rounds": True,
    "skip_reasons": [
        "ผู้ป่วยหลับ",
        "ผู้ป่วยไม่อยู่ในหอผู้ป่วย",
        "ผู้ป่วยอยู่ระหว่างทำหัตถการ",
        "ผู้ปกครองไม่ยินยอม",
    ],
    "removal_reasons": [
        "ครบกำหนดการใช้งาน",
        "พบภาวะ Infiltration",
        "พบภาวะ Phlebitis",
        "เข็มหลุด / อุดตัน",
        "แพทย์สั่งหยุดให้สารน้ำ",
    ],
}


def get_all(db: Session) -> dict[str, Any]:
    stored = {row.key: row.value for row in db.scalars(select(SystemSetting))}
    return DEFAULTS | {k: v for k, v in stored.items() if k in DEFAULTS}


def get(db: Session, key: str) -> Any:
    row = db.get(SystemSetting, key)
    return row.value if row is not None else DEFAULTS[key]


def update(db: Session, values: dict[str, Any], user_id: int) -> dict[str, Any]:
    for key, value in values.items():
        if key not in DEFAULTS:
            raise KeyError(key)
        row = db.get(SystemSetting, key)
        if row is None:
            db.add(SystemSetting(key=key, value=value, updated_by_id=user_id))
        else:
            row.value = value
            row.updated_by_id = user_id
    db.flush()
    return get_all(db)
