from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

import numpy as np
import pytest
import torch
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pedivein_runtime import registry, training
from pedivein_runtime.api import create_app


class FakePreprocessor:
    """Stands in for DINO + SAM2: resizes the photo to the 224x224 model input."""

    def __init__(self):
        self.calls = 0

    def process(self, image_path, output_path, selected_arm_id=None):
        self.calls += 1
        if Path(image_path).name.startswith("noarm"):
            return {"status": "HOLD", "reason": "NO_ARM_CANDIDATE"}
        Image.open(image_path).convert("RGB").resize((224, 224)).save(output_path)
        return {"status": "READY", "selected_arm_id": selected_arm_id or "ARM01"}


class FakePredictor:
    def __init__(self):
        self.preprocessor = FakePreprocessor()
        self.model_version = registry.BUILTIN_VERSION
        self.loaded = []

    def load_model(self, version):
        registry.verify(version)
        self.loaded.append(version)
        self.model_version = version


@pytest.fixture
def dirs(tmp_path, monkeypatch):
    monkeypatch.setenv("PEDIVEIN_MODEL_DIR", str(tmp_path / "models"))
    monkeypatch.setenv("PEDIVEIN_UPLOAD_DIR", str(tmp_path / "uploads"))
    return tmp_path


def make_samples(root: Path, patients: int = 8, per_patient: int = 4) -> list[dict]:
    rng = np.random.default_rng(0)
    samples = []
    for p in range(patients):
        for i in range(per_patient):
            condition = "INF" if (p + i) % 2 else "PHL"
            grade = (p + i) % 4 + 1
            relative = f"2026/11/p{p}_{i}.png"
            path = root / "uploads" / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            tint = (180, 120, 110) if condition == "INF" else (200, 90, 90)
            pixels = np.clip(rng.normal(tint, 20, (96, 64, 3)), 0, 255).astype(np.uint8)
            Image.fromarray(pixels).save(path)
            samples.append({"image": relative, "patient": f"P{p}", "condition": condition, "grade": grade})
    return samples


def test_warm_start_reproduces_builtin_onnx():
    model = training.build_model(registry.BUILTIN_VERSION).eval()
    batch = torch.randn(2, 3, 224, 224)
    expected = training.onnx_predictor(registry.BUILTIN_MODEL)(batch)
    actual = training.torch_predictor(model, torch.device("cpu"))(batch)
    for a, b in zip(actual, expected):
        assert np.abs(a - b).max() < 1e-4


def test_split_keeps_patients_apart():
    items = [(training.Sample(f"{p}_{i}.png", f"P{p}", "INF", 1), Path("x")) for p in range(10) for i in range(3)]
    train, test = training.split_by_patient(items, 0.2, seed=1)
    assert {s.patient for s, _ in train}.isdisjoint({s.patient for s, _ in test})
    assert len(train) + len(test) == 30 and len(test) >= 6


def test_metrics():
    metrics = training.classification_metrics([0, 0, 1, 1], [0, 1, 1, 1], 2)
    assert metrics["accuracy"] == 0.75
    assert metrics["confusion_matrix"] == [[1, 1], [0, 2]]
    assert metrics["balanced_accuracy"] == 0.75


def test_training_run_produces_servable_version(dirs):
    samples = training.parse_samples(make_samples(dirs))
    noarm = dirs / "uploads" / "noarm.png"
    Image.new("RGB", (64, 64)).save(noarm)
    samples.append(training.Sample("noarm.png", "P0", "INF", 1))
    version = "TEST_V2.1.0"
    registry.version_dir(version).mkdir(parents=True)
    preprocessor = FakePreprocessor()
    meta = training.run_training(
        version, registry.BUILTIN_VERSION, samples, training.TrainingConfig(epochs=2, batch_size=8),
        preprocessor, logging.getLogger("test"), lambda *args: None,
    )
    assert meta["dataset"]["received"] == 33
    assert meta["dataset"]["usable"] == 32
    assert meta["dataset"]["skipped"] == {"PREPROCESSING_NO_ARM_CANDIDATE": 1}
    assert meta["dataset"]["train"] + meta["dataset"]["test"] == 32
    assert len(meta["history"]) == 2
    assert meta["test_metrics"]["condition"]["n"] == meta["dataset"]["test"]
    assert meta["base_test_metrics"]["grade"]["n"] == meta["dataset"]["test"]
    assert registry.is_servable(version)
    assert registry.verify(version).exists()
    assert registry.checkpoint_path(version) is not None
    # A retrain of the retrain warm-starts from the saved checkpoint.
    assert training.build_model(version) is not None
    # Preprocessed images are cached for the next run.
    calls = preprocessor.calls
    training.preprocess_samples(samples, preprocessor, logging.getLogger("test"), lambda f: None)
    assert preprocessor.calls == calls


def test_too_little_data_fails(dirs):
    samples = training.parse_samples(make_samples(dirs, patients=2, per_patient=3))
    registry.version_dir("TINY").mkdir(parents=True)
    with pytest.raises(ValueError, match="ข้อมูลไม่พอ"):
        training.run_training("TINY", registry.BUILTIN_VERSION, samples, training.TrainingConfig(epochs=1),
                              FakePreprocessor(), logging.getLogger("test"), lambda *args: None)


def test_training_and_activation_api(dirs):
    predictor = FakePredictor()
    with TestClient(create_app(load_model=False, predictor=predictor)) as api:
        listing = api.get("/api/v1/models").json()
        assert listing["active"] == registry.BUILTIN_VERSION
        assert [v["version"] for v in listing["versions"]] == [registry.BUILTIN_VERSION]

        bad = api.post("/api/v1/training", json={"version": "../x", "samples": []})
        assert bad.status_code == 422
        response = api.post("/api/v1/training", json={
            "version": "API_V2.1.0", "samples": make_samples(dirs), "epochs": 1, "batch_size": 8,
        })
        assert response.status_code == 202, response.text
        for _ in range(600):
            state = api.get("/api/v1/models/API_V2.1.0").json()
            if state["state"] in ("succeeded", "failed"):
                break
            time.sleep(0.1)
        assert state["state"] == "succeeded", state
        assert "Epoch 1/1" in state["log"]
        assert state["metadata"]["base_version"] == registry.BUILTIN_VERSION

        duplicate = api.post("/api/v1/training", json={"version": "API_V2.1.0", "samples": make_samples(dirs)})
        assert duplicate.status_code == 409

        assert api.post("/api/v1/models/NOPE/activate").status_code == 404
        activated = api.post("/api/v1/models/API_V2.1.0/activate")
        assert activated.status_code == 200
        assert predictor.loaded == ["API_V2.1.0"]
        assert registry.get_active() == "API_V2.1.0"
        assert api.get("/health/ready").json()["model_version"] == "API_V2.1.0"
        # Roll back to the built-in model.
        assert api.post(f"/api/v1/models/{registry.BUILTIN_VERSION}/activate").status_code == 200
        assert registry.get_active() == registry.BUILTIN_VERSION
