"""AI model versions: history with metrics and training logs, retraining and activation."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ModelVersion, User
from ..security import AdminUser, require_roles
from ..serializers import user_brief
from ..services import ai_client, model_training, settings_store
from ..services.ai_client import AiServiceError

router = APIRouter(prefix="/api/model-versions", tags=["model-versions"])

ModelViewer = Annotated[User, Depends(require_roles("admin", "head_nurse"))]


class TrainIn(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)
    epochs: int | None = Field(default=None, ge=1, le=100)


def version_out(row: ModelVersion, *, with_log: bool = False) -> dict:
    out = {
        "id": row.id,
        "version": row.version,
        "state": row.state,
        "progress": row.progress,
        "message": row.message,
        "error": row.error,
        "is_builtin": row.is_builtin,
        "is_active": row.is_active,
        "base_version": row.base_version,
        "trigger": row.trigger,
        "notes": row.notes,
        "dataset": model_training.public_summary(row.dataset) if row.dataset else None,
        "metadata": row.model_metadata,
        "created_at": row.created_at,
        "finished_at": row.finished_at,
        "activated_at": row.activated_at,
        "started_by": user_brief(row.started_by) if row.started_by else None,
        "activated_by": user_brief(row.activated_by) if row.activated_by else None,
    }
    if with_log:
        out["log"] = row.log
    return out


def get_row(db: Session, version_id: int) -> ModelVersion:
    row = db.get(ModelVersion, version_id)
    if row is None:
        raise HTTPException(404, detail="ไม่พบเวอร์ชันโมเดล")
    return row


@router.get("")
async def list_versions(_: ModelViewer, db: Annotated[Session, Depends(get_db)]):
    listing, ai_error = await run_in_threadpool(model_training.sync_with_error, db)
    db.commit()
    _, summary = model_training.build_dataset(db)
    settings = settings_store.get_all(db)
    rows = db.scalars(select(ModelVersion).order_by(ModelVersion.created_at.desc(), ModelVersion.id.desc()))
    return {
        "ai_reachable": listing is not None,
        "ai_error": ai_error,
        "active": listing.get("active") if listing else None,
        "loaded": listing.get("loaded") if listing else None,
        "training_running": bool(listing and listing.get("training_running")),
        "dataset": model_training.public_summary(summary),
        "schedule": {k: settings[k] for k in settings if k.startswith("auto_retrain_")},
        "versions": [version_out(row) for row in rows],
    }


@router.get("/{version_id}")
async def get_version(version_id: int, _: ModelViewer, db: Annotated[Session, Depends(get_db)]):
    row = get_row(db, version_id)
    if row.state not in model_training.FINISHED:
        await run_in_threadpool(model_training.sync, db)
        db.commit()
    out = version_out(row, with_log=True)
    if row.state not in model_training.FINISHED:
        # Live log while the run is in progress; the final log is stored when it ends.
        try:
            out["log"] = (await run_in_threadpool(ai_client.get_model, row.version)).get("log")
        except AiServiceError:
            pass
    return out


@router.post("/train", status_code=201)
async def train(body: TrainIn, admin: AdminUser, request: Request, db: Annotated[Session, Depends(get_db)]):
    row = await run_in_threadpool(
        lambda: model_training.start(
            db, user=admin, trigger="manual", notes=body.notes, epochs=body.epochs, request=request
        )
    )
    db.commit()
    return version_out(row)


@router.post("/{version_id}/activate")
async def activate(version_id: int, admin: AdminUser, request: Request, db: Annotated[Session, Depends(get_db)]):
    row = get_row(db, version_id)
    await run_in_threadpool(model_training.activate, db, row, admin, request)
    db.commit()
    db.refresh(row)
    return version_out(row)
