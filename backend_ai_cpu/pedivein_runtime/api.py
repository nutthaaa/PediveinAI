from __future__ import annotations

import asyncio
import os
import re
import secrets
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from .inference import PediveinPredictor

MODEL_VERSION = "PEDIVEIN_MULTITASK_CANDIDATE_V2.0.0"
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


def create_app(*, load_model: bool = True, predictor=None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.inference_lock = asyncio.Lock()
        app.state.startup_error = None
        app.state.predictor = predictor
        if load_model and app.state.predictor is None:
            try:
                app.state.predictor = await asyncio.to_thread(PediveinPredictor)
            except Exception:
                app.state.startup_error = "Model initialization failed"
        yield

    app = FastAPI(
        title="PediVeinCare AI API",
        version="1.0.0",
        description="CPU inference API for experimental INF/PHL and Grade 1-4 predictions.",
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
        return {
            "status": "READY",
            "model_version": MODEL_VERSION,
            "provider": "CPUExecutionProvider",
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

    return app


app = create_app()
