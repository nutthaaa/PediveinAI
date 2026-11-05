from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .db import SessionLocal
from .routers import admin, analyses, auth, dashboard, iv_sites, model_versions, patients, rounds, users
from .seed import seed
from .services import model_training

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _retrain_tick() -> None:
    with SessionLocal() as db:
        model_training.scheduled_tick(db)
        db.commit()


async def retrain_scheduler(interval_seconds: int) -> None:
    """Mirror training progress/logs and start scheduled retrains (never activates a model)."""
    while True:
        await asyncio.sleep(interval_seconds)
        try:
            await run_in_threadpool(_retrain_tick)
        except Exception:
            logger.exception("Scheduled retraining check failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    if settings.seed_demo_data:
        with SessionLocal() as db:
            seed(db)
    task = asyncio.create_task(retrain_scheduler(settings.retrain_check_seconds)) if settings.retrain_scheduler else None
    yield
    if task is not None:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="PediVeinCare API",
        version="1.0.0",
        description="Backend for pediatric IV-site monitoring. AI results are experimental "
        "and always require clinician confirmation.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    for module in (auth, users, patients, iv_sites, rounds, analyses, dashboard, admin, model_versions):
        app.include_router(module.router)

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "UP"}

    return app


app = create_app()
