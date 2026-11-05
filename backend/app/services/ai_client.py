"""HTTP client for the inference and retraining service in backend_ai_cpu/."""
from __future__ import annotations

import time
from typing import Any

import httpx
from fastapi import HTTPException

from ..config import get_settings

# Recorded for results from an AI service that predates per-version reporting.
BUILTIN_MODEL_VERSION = "PEDIVEIN_MULTITASK_CANDIDATE_V2.0.0"


class AiServiceError(HTTPException):
    def __init__(self, detail: str, status_code: int = 503):
        super().__init__(status_code=status_code, detail=detail)


def _headers() -> dict[str, str]:
    key = get_settings().ai_api_key
    return {"X-API-Key": key} if key else {}


def _post(path: str, data: bytes, content_type: str, form: dict[str, str] | None = None) -> dict:
    settings = get_settings()
    filename = "image.png" if content_type == "image/png" else "image.jpg"
    try:
        response = httpx.post(
            f"{settings.ai_base_url.rstrip('/')}{path}",
            files={"image": (filename, data, content_type)},
            data=form or {},
            headers=_headers(),
            timeout=settings.ai_timeout_seconds,
        )
    except httpx.HTTPError as exc:
        raise AiServiceError("ไม่สามารถเชื่อมต่อบริการ AI ได้") from exc
    if response.status_code == 503:
        raise AiServiceError("บริการ AI ยังโหลดโมเดลไม่เสร็จ")
    if response.status_code in (413, 415, 422):
        detail = response.json().get("detail", "ภาพไม่ถูกต้อง")
        raise AiServiceError(f"AI ปฏิเสธภาพ: {detail}", status_code=422)
    if response.status_code >= 400:
        raise AiServiceError(f"บริการ AI ผิดพลาด (HTTP {response.status_code})", status_code=502)
    return response.json()


def predict(
    data: bytes,
    content_type: str,
    *,
    selected_arm_id: str | None = None,
    allow_manual_quality_review: bool = False,
) -> tuple[dict[str, Any], int]:
    form = {"allow_manual_quality_review": "true" if allow_manual_quality_review else "false"}
    if selected_arm_id:
        form["selected_arm_id"] = selected_arm_id
    started = time.perf_counter()
    result = _post("/api/v1/pedivein/predict", data, content_type, form)
    return result, int((time.perf_counter() - started) * 1000)


def check_quality(data: bytes, content_type: str) -> dict[str, Any]:
    return _post("/api/v1/pedivein/quality", data, content_type)


def health() -> dict[str, Any]:
    settings = get_settings()
    try:
        response = httpx.get(
            f"{settings.ai_base_url.rstrip('/')}/health/ready", timeout=5.0
        )
        body = response.json()
    except (httpx.HTTPError, ValueError):
        return {"status": "UNREACHABLE"}
    return body


def _json(method: str, path: str, body: dict | None = None, timeout: float = 30.0) -> dict:
    settings = get_settings()
    try:
        response = httpx.request(
            method, f"{settings.ai_base_url.rstrip('/')}{path}", json=body, headers=_headers(), timeout=timeout
        )
    except httpx.HTTPError as exc:
        raise AiServiceError("ไม่สามารถเชื่อมต่อบริการ AI ได้") from exc
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail")
        except ValueError:
            detail = None
        if response.status_code == 401:
            raise AiServiceError("บริการ AI ปฏิเสธ API key (PEDIVEIN_AI_API_KEY ไม่ตรงกัน)", status_code=502)
        status_code = response.status_code if response.status_code in (404, 409, 422, 503) else 502
        raise AiServiceError(f"บริการ AI: {detail or f'HTTP {response.status_code}'}", status_code=status_code)
    return response.json()


def list_models() -> dict[str, Any]:
    return _json("GET", "/api/v1/models")


def get_model(version: str) -> dict[str, Any]:
    return _json("GET", f"/api/v1/models/{version}")


def start_training(body: dict[str, Any]) -> dict[str, Any]:
    return _json("POST", "/api/v1/training", body)


def activate_model(version: str) -> dict[str, Any]:
    # Loading a model is quick, but the AI service waits for any in-flight prediction first.
    return _json("POST", f"/api/v1/models/{version}/activate", timeout=get_settings().ai_timeout_seconds)
