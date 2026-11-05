from __future__ import annotations

import asyncio
import logging
import os
import re
import secrets
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import quality_checker, registry, training
from .inference import PediveinPredictor

logger = logging.getLogger(__name__)
ALLOWED_CONTENT_TYPES = {"image/jpeg": ".jpg", "image/png": ".png"}


def _max_upload_bytes() -> int:
    return int(os.getenv("PEDIVEIN_MAX_UPLOAD_MB", "15")) * 1024 * 1024


async def require_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    expected = os.getenv("PEDIVEIN_API_KEY")
    if expected and (x_api_key is None or not secrets.compare_digest(x_api_key, expected)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


async def _save_upload(upload: UploadFile, destination: Path) -> None:
    total = 0
    with destination.open("wb") as handle:
        while chunk := await upload.read(1024 * 1024):
            total += len(chunk)
            if total > _max_upload_bytes():
                raise HTTPException(status_code=413, detail="Image exceeds upload limit")
            handle.write(chunk)
    if total == 0:
        raise HTTPException(status_code=422, detail="Empty image")


class TrainingRequest(BaseModel):
    version: str
    base_version: str | None = None  # defaults to the active version
    samples: list[dict]
    epochs: int = training.TrainingConfig.epochs
    batch_size: int = training.TrainingConfig.batch_size
    learning_rate: float = training.TrainingConfig.learning_rate
    test_fraction: float = training.TrainingConfig.test_fraction
    seed: int = training.TrainingConfig.seed


def version_summary(version: str) -> dict:
    status = registry.status(version) or {}
    return {
        "version": version,
        "builtin": version == registry.BUILTIN_VERSION,
        "state": status.get("state", "unknown"),
        "progress": status.get("progress"),
        "message": status.get("message"),
        "error": status.get("error"),
        "started_at": status.get("started_at"),
        "finished_at": status.get("finished_at"),
        "metadata": registry.metadata(version),
    }


def create_app(*, load_model: bool = True, predictor=None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.inference_lock = asyncio.Lock()
        app.state.startup_error = None
        app.state.predictor = predictor
        app.state.training = training.TrainingManager()
        try:
            training.recover_interrupted()
        except OSError:
            logger.exception("Model registry is not readable")
        if load_model and app.state.predictor is None:
            try:
                app.state.predictor = await asyncio.to_thread(PediveinPredictor)
            except Exception:
                app.state.startup_error = "Model initialization failed"
        yield

    app = FastAPI(
        title="PediVeinCare AI API",
        version="1.0.0",
        description="Inference and retraining API for experimental INF/PHL and Grade 1-4 predictions.",
        lifespan=lifespan,
    )

    @app.get("/health/live", tags=["health"])
    async def live():
        return {"status": "UP"}

    @app.get("/health/ready", tags=["health"])
    async def ready():
        if app.state.predictor is None:
            return JSONResponse(
                status_code=503,
                content={"status": "NOT_READY", "error": app.state.startup_error},
            )
        predictor_ = app.state.predictor
        return {
            "status": "READY",
            "model_version": getattr(predictor_, "model_version", registry.BUILTIN_VERSION),
            "model_warning": getattr(predictor_, "model_warning", None),
            "training_running": app.state.training.busy,
            "provider": "CPUExecutionProvider",
            # DINO + SAM2 run on CUDA when the container has a GPU; the ONNX classifier stays on CPU.
            "preprocessing_device": str(
                getattr(getattr(app.state.predictor, "preprocessor", None), "device", "unknown")
            ),
        }

    @app.post(
        "/api/v1/pedivein/predict",
        tags=["inference"],
        dependencies=[Depends(require_api_key)],
    )
    async def predict(
        image: Annotated[UploadFile, File(description="One JPG or PNG image")],
        selected_arm_id: Annotated[str | None, Form()] = None,
        allow_manual_quality_review: Annotated[bool, Form()] = False,
    ):
        if app.state.predictor is None:
            raise HTTPException(status_code=503, detail="AI model is not ready")
        content_type = (image.content_type or "").lower()
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="Only JPEG and PNG images are supported")
        if selected_arm_id is not None and re.fullmatch(r"ARM[0-9]{2}", selected_arm_id) is None:
            raise HTTPException(status_code=422, detail="Invalid selected_arm_id")

        path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                prefix="pedivein_upload_",
                suffix=ALLOWED_CONTENT_TYPES[content_type],
                delete=False,
            ) as temporary:
                path = Path(temporary.name)
            await _save_upload(image, path)
            async with app.state.inference_lock:
                result = await asyncio.to_thread(
                    app.state.predictor.predict,
                    path,
                    selected_arm_id,
                    allow_manual_quality_review,
                )
            return result
        except HTTPException:
            raise
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid image: {exc}") from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail="AI inference failed") from exc
        finally:
            await image.close()
            if path is not None:
                path.unlink(missing_ok=True)

    @app.post(
        "/api/v1/pedivein/quality",
        tags=["inference"],
        dependencies=[Depends(require_api_key)],
    )
    async def quality(image: Annotated[UploadFile, File(description="One JPG or PNG image")]):
        """Capture-quality check only; does not need the AI models to be loaded."""
        content_type = (image.content_type or "").lower()
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="Only JPEG and PNG images are supported")

        path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                prefix="pedivein_quality_",
                suffix=ALLOWED_CONTENT_TYPES[content_type],
                delete=False,
            ) as temporary:
                path = Path(temporary.name)
            await _save_upload(image, path)
            return await asyncio.to_thread(quality_checker.assess, path)
        except HTTPException:
            raise
        except (OSError, ValueError) as exc:
            raise HTTPException(status_code=422, detail=f"Invalid image: {exc}") from exc
        finally:
            await image.close()
            if path is not None:
                path.unlink(missing_ok=True)

    @app.get("/api/v1/models", tags=["models"], dependencies=[Depends(require_api_key)])
    async def list_models():
        return {
            "active": registry.get_active(),
            "loaded": getattr(app.state.predictor, "model_version", None),
            "training_running": app.state.training.busy,
            "versions": [version_summary(v) for v in registry.list_versions()],
        }

    @app.get("/api/v1/models/{version}", tags=["models"], dependencies=[Depends(require_api_key)])
    async def get_model(version: str):
        try:
            registry.validate_version(version)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if version not in registry.list_versions():
            raise HTTPException(status_code=404, detail="Model version not found")
        return version_summary(version) | {"log": registry.training_log(version)}

    @app.post("/api/v1/models/{version}/activate", tags=["models"], dependencies=[Depends(require_api_key)])
    async def activate_model(version: str):
        if app.state.predictor is None:
            raise HTTPException(status_code=503, detail="AI model is not ready")
        try:
            registry.validate_version(version)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if not registry.is_servable(version) or (registry.status(version) or {}).get("state") != "succeeded":
            raise HTTPException(status_code=404, detail="Model version is not available")
        async with app.state.inference_lock:
            try:
                await asyncio.to_thread(app.state.predictor.load_model, version)
            except Exception as exc:
                raise HTTPException(status_code=422, detail=f"Model could not be loaded: {exc}") from exc
            registry.set_active(version)
        return {"active": version}

    @app.post("/api/v1/training", tags=["models"], status_code=202, dependencies=[Depends(require_api_key)])
    async def start_training(body: TrainingRequest):
        preprocessor = getattr(app.state.predictor, "preprocessor", None)
        if preprocessor is None:
            raise HTTPException(status_code=503, detail="AI model is not ready")
        try:
            registry.validate_version(body.version)
            samples = training.parse_samples(body.samples)
            config = training.TrainingConfig(
                epochs=body.epochs, batch_size=body.batch_size, learning_rate=body.learning_rate,
                test_fraction=body.test_fraction, seed=body.seed,
            ).validate()
            base = body.base_version or registry.get_active()
            return app.state.training.start(body.version, base, samples, config, preprocessor)
        except RuntimeError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except FileExistsError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    return app


app = create_app()
