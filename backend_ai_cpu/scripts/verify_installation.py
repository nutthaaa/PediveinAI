#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "model" / "pedivein_multitask_v2_candidate.onnx"
EXPECTED = {
    "pedivein_multitask_v2_candidate.onnx": "9974895e27012a3dfd29de80b6ffcf87083e67263aea38d4ebbac8a164c2ce20",
    "pedivein_multitask_v2_candidate.onnx.data": "1ccfc415219206dbc32c973e2667b6f2fb64c997ef899d5bd7484449677bae01",
}


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


for name, expected in EXPECTED.items():
    path = MODEL.parent / name
    if not path.exists() or digest(path) != expected:
        raise SystemExit(f"FAIL: checksum mismatch or missing file: {name}")

session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
outputs = session.run(None, {session.get_inputs()[0].name: np.zeros((1, 3, 224, 224), np.float32)})
if [list(item.shape) for item in outputs] != [[1, 2], [1, 4]]:
    raise SystemExit("FAIL: unexpected model output shapes")
if not all(np.isfinite(item).all() for item in outputs):
    raise SystemExit("FAIL: non-finite model output")
print(json.dumps({"status": "PASS", "provider": session.get_providers()[0], "outputs": [[1, 2], [1, 4]]}))
