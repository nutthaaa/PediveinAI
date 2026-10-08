from __future__ import annotations

import hashlib
import json
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from . import quality_checker
from .preprocessing import FrozenPreprocessor

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "model" / "pedivein_multitask_v2_candidate.onnx"
EXPECTED_SHA256 = "9974895e27012a3dfd29de80b6ffcf87083e67263aea38d4ebbac8a164c2ce20"
MEAN = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values)
    values = np.exp(shifted)
    return values / values.sum()


class PediveinPredictor:
    """CPU-only backend runtime. One instance should be reused across requests."""

    def __init__(self, load_preprocessor: bool = True):
        actual = sha256(MODEL)
        if actual != EXPECTED_SHA256:
            raise RuntimeError(f"Model checksum mismatch: {actual}")
        self.session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
        self.preprocessor = FrozenPreprocessor() if load_preprocessor else None

    def infer_preprocessed(self, image_path: str | Path) -> dict:
        image = Image.open(image_path).convert("RGB")
        if image.size != (224, 224):
            raise ValueError("Preprocessed input must be 224x224 RGB")
        array = np.asarray(image, dtype=np.float32) / 255.0
        batch = np.transpose((array - MEAN) / STD, (2, 0, 1))[None]
        condition_logits, grade_logits = self.session.run(
            None, {self.session.get_inputs()[0].name: batch}
        )
        condition = softmax(condition_logits[0])
        grade = softmax(grade_logits[0])
        return {
            "condition_prediction": "PHL" if condition[1] >= 0.5 else "INF",
            "condition_probabilities": {"INF": float(condition[0]), "PHL": float(condition[1])},
            "grade_prediction": int(np.argmax(grade) + 1),
            "grade_probabilities": {str(i + 1): float(grade[i]) for i in range(4)},
            "model_status": "EXPERIMENTAL_CANDIDATE",
            "requires_clinician_confirmation": True,
        }

    def predict(
        self,
        image_path: str | Path,
        selected_arm_id: str | None = None,
        allow_manual_quality_review: bool = False,
    ) -> dict:
        if self.preprocessor is None:
            raise RuntimeError("Preprocessor was not loaded")
        image_path = Path(image_path)
        quality = quality_checker.assess(image_path)
        blocked = quality["status"] == "RETAKE" or (
            quality["status"] == "MANUAL_REVIEW" and not allow_manual_quality_review
        )
        base = {
            "image_sha256": sha256(image_path),
            "quality": quality,
            "prediction_issued": False,
        }
        if blocked:
            return base | {"status": "QUALITY_HOLD"}
        with tempfile.TemporaryDirectory(prefix="pedivein_") as directory:
            output = Path(directory) / "model_224.png"
            preprocessing = self.preprocessor.process(image_path, output, selected_arm_id)
            base["preprocessing"] = preprocessing
            if preprocessing["status"] != "READY":
                return base | {"status": "PREPROCESSING_HOLD"}
            result = self.infer_preprocessed(output)
        return base | result | {"status": "OK", "prediction_issued": True}


def to_json(result: dict) -> str:
    return json.dumps(result, ensure_ascii=False, indent=2)
