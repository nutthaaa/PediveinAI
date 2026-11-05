"""On-disk model registry: the built-in v2 model plus every retrained version.

Layout of ``PEDIVEIN_MODEL_DIR`` (a persistent volume in Docker)::

    active.json                      {"version": "..."}  the version served by /predict
    versions/<version>/model.onnx    exported model (same I/O contract as v2)
    versions/<version>/checkpoint.pt PyTorch weights, used to warm-start the next retrain
    versions/<version>/metadata.json metrics, dataset summary, hyper-parameters
    versions/<version>/status.json   training progress (queued ... succeeded | failed)
    versions/<version>/training.log  full training log
    cache/                           preprocessed 224x224 training images
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILTIN_VERSION = "PEDIVEIN_MULTITASK_CANDIDATE_V2.0.0"
BUILTIN_MODEL = ROOT / "model" / "pedivein_multitask_v2_candidate.onnx"
BUILTIN_METADATA = ROOT / "model" / "model_metadata.json"
BUILTIN_SHA256 = "9974895e27012a3dfd29de80b6ffcf87083e67263aea38d4ebbac8a164c2ce20"
VERSION_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$")


def model_dir() -> Path:
    return Path(os.getenv("PEDIVEIN_MODEL_DIR", ROOT / "model_registry"))


def upload_dir() -> Path:
    return Path(os.getenv("PEDIVEIN_UPLOAD_DIR", ROOT.parent / "backend" / "uploads"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_version(version: str) -> str:
    if not VERSION_PATTERN.fullmatch(version or ""):
        raise ValueError(f"Invalid model version: {version!r}")
    return version


def version_dir(version: str) -> Path:
    return model_dir() / "versions" / validate_version(version)


def onnx_path(version: str) -> Path:
    return BUILTIN_MODEL if version == BUILTIN_VERSION else version_dir(version) / "model.onnx"


def checkpoint_path(version: str) -> Path | None:
    if version == BUILTIN_VERSION:
        return None
    path = version_dir(version) / "checkpoint.pt"
    return path if path.exists() else None


def read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def metadata(version: str) -> dict | None:
    if version == BUILTIN_VERSION:
        value = read_json(BUILTIN_METADATA) or {}
        return value | {"version": BUILTIN_VERSION, "builtin": True, "onnx_sha256": BUILTIN_SHA256}
    return read_json(version_dir(version) / "metadata.json")


def status(version: str) -> dict | None:
    if version == BUILTIN_VERSION:
        return {"version": version, "state": "succeeded", "progress": 1.0}
    return read_json(version_dir(version) / "status.json")


def training_log(version: str) -> str:
    if version == BUILTIN_VERSION:
        return ""
    try:
        return (version_dir(version) / "training.log").read_text(encoding="utf-8")
    except OSError:
        return ""


def is_servable(version: str) -> bool:
    if version == BUILTIN_VERSION:
        return BUILTIN_MODEL.exists()
    meta = metadata(version)
    return bool(meta) and onnx_path(version).exists()


def verify(version: str) -> Path:
    """Return the ONNX path after checking it against the checksum recorded at training time."""
    path = onnx_path(version)
    meta = metadata(version)
    if not path.exists() or meta is None:
        raise FileNotFoundError(f"Model version not found: {version}")
    expected = meta.get("onnx_sha256")
    actual = sha256(path)
    if expected and actual != expected:
        raise RuntimeError(f"Model checksum mismatch for {version}: {actual}")
    return path


def list_versions() -> list[str]:
    versions = [BUILTIN_VERSION]
    root = model_dir() / "versions"
    if root.exists():
        versions += sorted(p.name for p in root.iterdir() if p.is_dir() and VERSION_PATTERN.fullmatch(p.name))
    return versions


def get_active() -> str:
    value = read_json(model_dir() / "active.json") or {}
    version = value.get("version")
    return version if isinstance(version, str) and VERSION_PATTERN.fullmatch(version) else BUILTIN_VERSION


def set_active(version: str) -> None:
    write_json(model_dir() / "active.json", {"version": validate_version(version)})
