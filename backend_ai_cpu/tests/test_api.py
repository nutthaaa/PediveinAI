from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pedivein_runtime.api import create_app


class FakePredictor:
    def predict(self, path, selected_arm_id=None, allow_manual_quality_review=False):
        assert Path(path).exists()
        return {
            "status": "OK",
            "prediction_issued": True,
            "condition_prediction": "INF",
            "grade_prediction": 2,
            "selected_arm_id": selected_arm_id,
            "manual_review_allowed": allow_manual_quality_review,
        }


def client():
    return TestClient(create_app(load_model=False, predictor=FakePredictor()))


def test_health_and_prediction():
    with client() as api:
        assert api.get("/health/live").json() == {"status": "UP"}
        assert api.get("/health/ready").status_code == 200
        response = api.post(
            "/api/v1/pedivein/predict",
            files={"image": ("test.jpg", b"fake-image-for-mocked-predictor", "image/jpeg")},
            data={"selected_arm_id": "ARM01", "allow_manual_quality_review": "true"},
        )
        assert response.status_code == 200
        assert response.json()["grade_prediction"] == 2
        assert response.json()["selected_arm_id"] == "ARM01"


def test_rejects_unsupported_media_type():
    with client() as api:
        response = api.post(
            "/api/v1/pedivein/predict",
            files={"image": ("test.gif", b"GIF89a", "image/gif")},
        )
        assert response.status_code == 415


def test_optional_api_key(monkeypatch):
    monkeypatch.setenv("PEDIVEIN_API_KEY", "secret")
    with client() as api:
        missing = api.post(
            "/api/v1/pedivein/predict",
            files={"image": ("test.jpg", b"fake", "image/jpeg")},
        )
        assert missing.status_code == 401
        allowed = api.post(
            "/api/v1/pedivein/predict",
            headers={"X-API-Key": "secret"},
            files={"image": ("test.jpg", b"fake", "image/jpeg")},
        )
        assert allowed.status_code == 200
