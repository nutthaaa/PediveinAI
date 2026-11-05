from __future__ import annotations

import base64
import json
import logging
import tempfile
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from . import quality_checker, registry
from .preprocessing import FrozenPreprocessor
from .registry import sha256

logger = logging.getLogger(__name__)

MEAN = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)


def softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values)
    values = np.exp(shifted)
    return values / values.sum()


def embed_review_candidates(preprocessing: dict) -> None:
    """Embed temporary review previews before their directory is removed."""
    for candidate in preprocessing.get("manual_review_candidates", []):
        preview_path = candidate.pop("preview_path", None)
        if not preview_path:
            continue
        data = Path(preview_path).read_bytes()
        candidate["preview_data_url"] = (
            "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
        )


class PediveinPredictor:
    """Backend runtime. One instance should be reused across requests."""

    def __init__(self, load_preprocessor: bool = True):
        self.model_warning: str | None = None
        active = registry.get_active()
        try:
            self.load_model(active)
        except Exception as exc:
            if active == registry.BUILTIN_VERSION:
                raise
            # Keep the service usable, but surface the fallback in /health/ready.
            logger.exception("Active model %s failed to load; falling back to %s", active, registry.BUILTIN_VERSION)
            self.model_warning = f"Active model {active} failed to load ({exc}); serving {registry.BUILTIN_VERSION}"
            self.load_model(registry.BUILTIN_VERSION)
        self.preprocessor = FrozenPreprocessor() if load_preprocessor else None

    def load_model(self, version: str) -> None:
        """Swap the classifier; callers must hold the inference lock while requests are running."""
        path = registry.verify(version)
        self.session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        self.model_version = version
        self.model_status = (registry.metadata(version) or {}).get("status", "EXPERIMENTAL_CANDIDATE")
        self.model_warning = None

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
            "model_version": self.model_version,
            "model_status": self.model_status,
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
            embed_review_candidates(preprocessing)
            base["preprocessing"] = preprocessing
            if preprocessing["status"] != "READY":
                return base | {"status": "PREPROCESSING_HOLD"}
            result = self.infer_preprocessed(output)
        return base | result | {"status": "OK", "prediction_issued": True}


def to_json(result: dict) -> str:
    return json.dumps(result, ensure_ascii=False, indent=2)
