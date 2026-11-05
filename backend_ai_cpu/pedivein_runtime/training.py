"""Retrain the INF/PHL + Grade 1-4 classifier from clinician-confirmed images.

A run warm-starts from a base version (the built-in v2 ONNX weights, or a previous retrain's
checkpoint), fine-tunes on the labelled images, and evaluates the new model and the base model on
the same held-out patients. The result is a new registry version; it is never activated here.
"""
from __future__ import annotations

import logging
import random
import threading
import time
import traceback
import warnings
from collections import Counter
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch
from PIL import Image
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

from . import registry
from .inference import MEAN, STD

ARCHITECTURE = "timm/mobilenetv4_conv_small + condition_head(2) + grade_head(4)"
PREPROCESSING_PROTOCOL = "PEDIVEIN_PREPROC_V1.1"
CONDITIONS = ("INF", "PHL")
MIN_TRAIN_IMAGES = 20
MIN_TEST_IMAGES = 5


@dataclass(frozen=True)
class Sample:
    image: str  # path relative to the upload directory
    patient: str  # grouping key: one patient's images never span train and test
    condition: str  # INF | PHL
    grade: int  # 1-4
    selected_arm_id: str | None = None  # arm the nurse picked when the photo was analysed


@dataclass(frozen=True)
class TrainingConfig:
    epochs: int = 15
    batch_size: int = 16
    learning_rate: float = 1e-4
    weight_decay: float = 1e-4
    test_fraction: float = 0.2
    seed: int = 42

    def validate(self) -> TrainingConfig:
        if not 1 <= self.epochs <= 100:
            raise ValueError("epochs must be 1-100")
        if not 1 <= self.batch_size <= 64:
            raise ValueError("batch_size must be 1-64")
        if not 1e-6 <= self.learning_rate <= 1e-2:
            raise ValueError("learning_rate must be 1e-6 to 1e-2")
        if not 0.1 <= self.test_fraction <= 0.5:
            raise ValueError("test_fraction must be 0.1-0.5")
        return self


def parse_samples(raw: list[dict]) -> list[Sample]:
    samples = []
    for item in raw:
        condition = item.get("condition")
        grade = item.get("grade")
        if condition not in CONDITIONS or grade not in (1, 2, 3, 4):
            raise ValueError(f"Invalid label: {condition!r} grade {grade!r}")
        if not item.get("image") or not item.get("patient"):
            raise ValueError("Each sample needs image and patient")
        samples.append(Sample(str(item["image"]), str(item["patient"]), condition, grade, item.get("selected_arm_id")))
    return samples


# --------------------------------------------------------------------------- model


class MultiTask(nn.Module):
    """Same structure (and parameter names) as the network exported to the v2 ONNX file."""

    def __init__(self):
        super().__init__()
        import timm

        self.backbone = timm.create_model("mobilenetv4_conv_small", pretrained=False, num_classes=0)
        features = self.backbone.head_hidden_size
        self.condition_head = nn.Linear(features, len(CONDITIONS))
        self.grade_head = nn.Linear(features, 4)

    def forward(self, x):
        z = self.backbone(x)
        return self.condition_head(z), self.grade_head(z)


def load_from_onnx(model: MultiTask, path: Path) -> None:
    """Load weights from an exported ONNX file whose BatchNorms were folded into the convolutions.

    Each folded conv keeps the fused weight; its BatchNorm becomes an identity whose bias is the fused
    bias. The result reproduces the ONNX outputs exactly as long as BatchNorm stays in eval mode,
    which ``train_mode`` guarantees.
    """
    import onnx
    from onnx import numpy_helper

    weights = {
        init.name: torch.from_numpy(numpy_helper.to_array(init).copy())
        for init in onnx.load(str(path)).graph.initializer
    }
    backbone = model.backbone
    modules = dict(backbone.named_modules())
    order: list[str] = []
    hooks = [
        module.register_forward_hook(lambda *_, name=name: order.append(name))
        for name, module in modules.items()
        if isinstance(module, (nn.Conv2d, nn.BatchNorm2d))
    ]
    backbone.eval()
    with torch.no_grad():
        backbone(torch.zeros(1, 3, 224, 224))
    for hook in hooks:
        hook.remove()

    with torch.no_grad():
        for conv_name, next_name in zip(order, order[1:] + [None]):
            conv = modules[conv_name]
            if not isinstance(conv, nn.Conv2d):
                continue
            conv.weight.copy_(weights.pop(f"backbone.{conv_name}.weight"))
            bias = weights.pop(f"backbone.{conv_name}.weight_bias", None)
            norm = modules.get(next_name) if next_name else None
            if isinstance(norm, nn.BatchNorm2d):
                norm.weight.fill_(1.0)
                norm.bias.copy_(bias if bias is not None else torch.zeros_like(norm.bias))
                norm.running_mean.zero_()
                norm.running_var.fill_(1.0 - norm.eps)
            elif bias is not None:
                raise RuntimeError(f"Folded bias without BatchNorm for {conv_name}")
        for head in ("condition_head", "grade_head"):
            getattr(model, head).weight.copy_(weights.pop(f"{head}.weight"))
            getattr(model, head).bias.copy_(weights.pop(f"{head}.bias"))
    leftover = [name for name in weights if name.startswith(("backbone.", "condition_head", "grade_head"))]
    if leftover:
        raise RuntimeError(f"Unused ONNX weights: {leftover[:5]}")


def build_model(base_version: str) -> MultiTask:
    model = MultiTask()
    checkpoint = registry.checkpoint_path(base_version)
    if checkpoint is not None:
        model.load_state_dict(torch.load(checkpoint, map_location="cpu", weights_only=True))
    else:
        load_from_onnx(model, registry.verify(base_version))
    return model


def train_mode(model: nn.Module) -> None:
    # BatchNorm stays frozen: batches are small and the warm-start weights depend on it.
    model.train()
    for module in model.modules():
        if isinstance(module, nn.BatchNorm2d):
            module.eval()


# --------------------------------------------------------------------------- data


def to_tensor(image: Image.Image) -> torch.Tensor:
    """Exactly the normalisation used by ``PediveinPredictor.infer_preprocessed``."""
    array = (np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0 - MEAN) / STD
    return torch.from_numpy(np.transpose(array, (2, 0, 1)).copy())


AUGMENT = transforms.Compose([
    transforms.RandomHorizontalFlip(),
    transforms.RandomAffine(degrees=10, translate=(0.03, 0.03), scale=(0.95, 1.05)),
    transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.05),
])


class ImageDataset(Dataset):
    def __init__(self, items: list[tuple[Sample, Path]], augment: bool):
        self.items = items
        self.augment = augment

    def __len__(self):
        return len(self.items)

    def __getitem__(self, index):
        sample, path = self.items[index]
        image = Image.open(path).convert("RGB")
        if self.augment:
            image = AUGMENT(image)
        return to_tensor(image), CONDITIONS.index(sample.condition), sample.grade - 1


def resolve_image(relative: str) -> Path:
    root = registry.upload_dir().resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f"Image outside upload directory: {relative}")
    return path


def preprocess_samples(samples: list[Sample], preprocessor, log: logging.Logger, progress) -> tuple[list, Counter]:
    """Run the frozen preprocessing on every image (cached by content hash + selected arm)."""
    cache = registry.model_dir() / "cache" / PREPROCESSING_PROTOCOL
    cache.mkdir(parents=True, exist_ok=True)
    ready: list[tuple[Sample, Path]] = []
    skipped: Counter = Counter()
    for index, sample in enumerate(samples, 1):
        progress(index / len(samples))
        try:
            source = resolve_image(sample.image)
        except ValueError:
            skipped["INVALID_PATH"] += 1
            continue
        if not source.exists():
            skipped["IMAGE_MISSING"] += 1
            continue
        key = f"{registry.sha256(source)}_{sample.selected_arm_id or 'AUTO'}"
        output = cache / f"{key}.png"
        hold = cache / f"{key}.hold.json"
        if not output.exists() and not hold.exists():
            result = preprocessor.process(source, output, sample.selected_arm_id)
            if result.get("status") != "READY":
                registry.write_json(hold, {"reason": result.get("reason", "UNKNOWN")})
        if output.exists():
            ready.append((sample, output))
        else:
            reason = (registry.read_json(hold) or {}).get("reason", "UNKNOWN")
            skipped[f"PREPROCESSING_{reason}"] += 1
    log.info("Preprocessing: %d ready, %d skipped %s", len(ready), sum(skipped.values()), dict(skipped))
    return ready, skipped


def split_by_patient(items: list, test_fraction: float, seed: int) -> tuple[list, list]:
    per_patient = Counter(sample.patient for sample, _ in items)
    patients = sorted(per_patient)
    random.Random(seed).shuffle(patients)
    target = max(1, round(len(items) * test_fraction))
    test_patients: set[str] = set()
    count = 0
    for patient in patients:
        if count >= target or len(test_patients) == len(patients) - 1:
            break
        test_patients.add(patient)
        count += per_patient[patient]
    train = [item for item in items if item[0].patient not in test_patients]
    test = [item for item in items if item[0].patient in test_patients]
    return train, test


def label_counts(items: list) -> dict:
    return {
        "condition": dict(sorted(Counter(sample.condition for sample, _ in items).items())),
        "grade": {str(g): sum(1 for sample, _ in items if sample.grade == g) for g in range(1, 5)},
        "patients": len({sample.patient for sample, _ in items}),
    }


# --------------------------------------------------------------------------- metrics


def classification_metrics(true: list[int], pred: list[int], classes: int) -> dict:
    matrix = np.zeros((classes, classes), dtype=int)
    for t, p in zip(true, pred):
        matrix[t, p] += 1
    present = [c for c in range(classes) if matrix[c].sum() > 0]
    recalls = [matrix[c, c] / matrix[c].sum() for c in present]
    f1s = []
    for c in present:
        precision = matrix[c, c] / matrix[:, c].sum() if matrix[:, c].sum() else 0.0
        recall = matrix[c, c] / matrix[c].sum()
        f1s.append(2 * precision * recall / (precision + recall) if precision + recall else 0.0)
    return {
        "n": int(matrix.sum()),
        "accuracy": float(np.trace(matrix) / matrix.sum()) if matrix.sum() else None,
        "balanced_accuracy": float(np.mean(recalls)) if recalls else None,
        "macro_f1": float(np.mean(f1s)) if f1s else None,
        "confusion_matrix": matrix.tolist(),
    }


def evaluate(predict, items: list) -> dict:
    """``predict(batch) -> (condition_logits, grade_logits)`` as numpy arrays."""
    condition_true, condition_pred, grade_true, grade_pred = [], [], [], []
    for start in range(0, len(items), 32):
        chunk = items[start:start + 32]
        batch = torch.stack([to_tensor(Image.open(path)) for _, path in chunk])
        condition_logits, grade_logits = predict(batch)
        condition = torch.softmax(torch.as_tensor(condition_logits), dim=1).numpy()
        for (sample, _), c, g in zip(chunk, condition, np.asarray(grade_logits)):
            condition_true.append(CONDITIONS.index(sample.condition))
            condition_pred.append(1 if c[1] >= 0.5 else 0)  # same threshold as inference
            grade_true.append(sample.grade - 1)
            grade_pred.append(int(np.argmax(g)))
    return {
        "condition": classification_metrics(condition_true, condition_pred, 2),
        "grade": classification_metrics(grade_true, grade_pred, 4),
    }


def onnx_predictor(path: Path):
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    return lambda batch: session.run(None, {session.get_inputs()[0].name: batch.numpy()})


def torch_predictor(model: nn.Module, device: torch.device):
    def predict(batch):
        with torch.no_grad():
            condition, grade = model(batch.to(device))
        return condition.cpu().numpy(), grade.cpu().numpy()

    return predict


def class_weights(labels: list[int], classes: int) -> torch.Tensor:
    counts = np.bincount(labels, minlength=classes)
    weights = len(labels) / (classes * np.maximum(counts, 1))
    weights[counts == 0] = 0.0
    return torch.tensor(weights, dtype=torch.float32)


# --------------------------------------------------------------------------- run


def run_training(
    version: str,
    base_version: str,
    samples: list[Sample],
    config: TrainingConfig,
    preprocessor,
    log: logging.Logger,
    report,
) -> dict:
    started = time.monotonic()
    out = registry.version_dir(version)
    torch.manual_seed(config.seed)
    random.seed(config.seed)
    np.random.seed(config.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info("Training %s from base %s on %s", version, base_version, device)
    log.info("Config: %s", asdict(config))
    log.info("Received %d labelled images from %d patients", len(samples), len({s.patient for s in samples}))

    report("preprocessing", 0.0, "เตรียมภาพ (หาแขนและปรับมาตรฐานภาพ)")
    ready, skipped = preprocess_samples(
        samples, preprocessor, log, lambda f: report("preprocessing", 0.3 * f, "เตรียมภาพ")
    )
    train_items, test_items = split_by_patient(ready, config.test_fraction, config.seed)
    dataset = {
        "received": len(samples),
        "usable": len(ready),
        "skipped": dict(skipped),
        "train": len(train_items),
        "test": len(test_items),
        "train_labels": label_counts(train_items),
        "test_labels": label_counts(test_items),
        "split": f"by patient, test_fraction={config.test_fraction}, seed={config.seed}",
    }
    log.info("Split: train %d images / %d patients, test %d images / %d patients",
             len(train_items), dataset["train_labels"]["patients"], len(test_items), dataset["test_labels"]["patients"])
    if len(train_items) < MIN_TRAIN_IMAGES or len(test_items) < MIN_TEST_IMAGES:
        raise ValueError(
            f"ข้อมูลไม่พอสำหรับการเทรน: ชุดเทรน {len(train_items)} ภาพ (ต้องการ ≥{MIN_TRAIN_IMAGES}), "
            f"ชุดทดสอบ {len(test_items)} ภาพ (ต้องการ ≥{MIN_TEST_IMAGES}) หลังแยกตามผู้ป่วย"
        )

    model = build_model(base_version).to(device)
    loader = DataLoader(
        ImageDataset(train_items, augment=True), batch_size=config.batch_size, shuffle=True,
        generator=torch.Generator().manual_seed(config.seed),
    )
    condition_loss = nn.CrossEntropyLoss(
        weight=class_weights([CONDITIONS.index(s.condition) for s, _ in train_items], 2).to(device)
    )
    grade_loss = nn.CrossEntropyLoss(weight=class_weights([s.grade - 1 for s, _ in train_items], 4).to(device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=config.epochs)
    history = []
    for epoch in range(1, config.epochs + 1):
        train_mode(model)
        total, seen, condition_hits, grade_hits = 0.0, 0, 0, 0
        for images, conditions, grades in loader:
            images, conditions, grades = images.to(device), conditions.to(device), grades.to(device)
            condition_logits, grade_logits = model(images)
            loss = condition_loss(condition_logits, conditions) + grade_loss(grade_logits, grades)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total += loss.item() * len(images)
            seen += len(images)
            condition_hits += (condition_logits.argmax(1) == conditions).sum().item()
            grade_hits += (grade_logits.argmax(1) == grades).sum().item()
        scheduler.step()
        row = {"epoch": epoch, "loss": total / seen, "train_condition_accuracy": condition_hits / seen,
               "train_grade_accuracy": grade_hits / seen}
        history.append(row)
        log.info("Epoch %d/%d loss=%.4f train_condition_acc=%.3f train_grade_acc=%.3f",
                 epoch, config.epochs, row["loss"], row["train_condition_accuracy"], row["train_grade_accuracy"])
        report("training", 0.3 + 0.55 * epoch / config.epochs, f"เทรนรอบที่ {epoch}/{config.epochs}")

    report("evaluating", 0.88, "ทดสอบกับผู้ป่วยชุดทดสอบ")
    model.eval()
    new_metrics = evaluate(torch_predictor(model, device), test_items)
    base_metrics = evaluate(onnx_predictor(registry.verify(base_version)), test_items)
    for label, metrics in (("New", new_metrics), ("Base", base_metrics)):
        log.info("%s model on test set: condition acc=%.3f bal_acc=%.3f | grade acc=%.3f bal_acc=%.3f",
                 label, metrics["condition"]["accuracy"], metrics["condition"]["balanced_accuracy"],
                 metrics["grade"]["accuracy"], metrics["grade"]["balanced_accuracy"])

    report("exporting", 0.95, "บันทึกโมเดล")
    model.cpu().eval()
    onnx_file = out / "model.onnx"
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        torch.onnx.export(
            model, (torch.zeros(1, 3, 224, 224),), str(onnx_file), dynamo=False, opset_version=17,
            input_names=["input"], output_names=["condition_logits", "grade_logits"],
            dynamic_axes={"input": {0: "batch"}, "condition_logits": {0: "batch"}, "grade_logits": {0: "batch"}},
        )
    probe = torch.stack([to_tensor(Image.open(path)) for _, path in test_items[:8]])
    exported = onnx_predictor(onnx_file)(probe)
    reference = torch_predictor(model, torch.device("cpu"))(probe)
    difference = max(float(np.abs(a - b).max()) for a, b in zip(exported, reference))
    if difference > 1e-3:
        raise RuntimeError(f"ONNX export does not match PyTorch (max diff {difference})")
    torch.save(model.state_dict(), out / "checkpoint.pt")

    meta = {
        "version": version,
        "status": "EXPERIMENTAL_CANDIDATE",
        "base_version": base_version,
        "architecture": ARCHITECTURE,
        "preprocessing_protocol": PREPROCESSING_PROTOCOL,
        "trained_at_utc": datetime.now(UTC).isoformat(),
        "duration_seconds": round(time.monotonic() - started, 1),
        "device": str(device),
        "config": asdict(config),
        "dataset": dataset,
        "history": history,
        "test_metrics": new_metrics,
        "base_test_metrics": base_metrics,
        "outputs": ["condition_logits[batch,2]", "grade_logits[batch,4]"],
        "onnx_export_max_diff": difference,
        "onnx_sha256": registry.sha256(onnx_file),
    }
    # Written last: a version is only servable once its metadata exists.
    registry.write_json(out / "metadata.json", meta)
    log.info("Finished in %.1fs; saved %s", meta["duration_seconds"], onnx_file)
    return meta


class TrainingManager:
    """Runs one training job at a time in a background thread."""

    def __init__(self):
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None

    @property
    def busy(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, version: str, base_version: str, samples: list[Sample], config: TrainingConfig, preprocessor) -> dict:
        with self._lock:
            if self.busy:
                raise RuntimeError("A training job is already running")
            if not registry.is_servable(base_version):
                raise ValueError(f"Base model not found: {base_version}")
            if version == registry.BUILTIN_VERSION or registry.version_dir(version).exists():
                raise FileExistsError(f"Model version already exists: {version}")
            registry.version_dir(version).mkdir(parents=True)
            status = self._write_status(version, "queued", 0.0, "รอเริ่มเทรน")
            self._thread = threading.Thread(
                target=self._run, args=(version, base_version, samples, config, preprocessor),
                name=f"training-{version}", daemon=True,
            )
            self._thread.start()
            return status

    @staticmethod
    def _write_status(version: str, state: str, progress: float, message: str, **extra) -> dict:
        previous = registry.status(version) or {}
        status = {
            "version": version,
            "state": state,
            "progress": round(progress, 3),
            "message": message,
            "started_at": previous.get("started_at") or datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        } | extra
        registry.write_json(registry.version_dir(version) / "status.json", status)
        return status

    def _run(self, version, base_version, samples, config, preprocessor) -> None:
        log = logging.getLogger(f"pedivein.training.{version}")
        log.setLevel(logging.INFO)
        log.propagate = False
        handler = logging.FileHandler(registry.version_dir(version) / "training.log", encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
        log.addHandler(handler)
        try:
            run_training(
                version, base_version, samples, config, preprocessor, log,
                lambda state, progress, message: self._write_status(version, state, progress, message),
            )
            self._write_status(version, "succeeded", 1.0, "เทรนเสร็จ รอการอนุมัติก่อนใช้งาน",
                               finished_at=datetime.now(UTC).isoformat())
        except Exception as exc:
            log.error("Training failed: %s\n%s", exc, traceback.format_exc())
            self._write_status(version, "failed", 1.0, "เทรนไม่สำเร็จ", error=str(exc),
                               finished_at=datetime.now(UTC).isoformat())
        finally:
            log.removeHandler(handler)
            handler.close()


def recover_interrupted() -> None:
    """Mark jobs that were running when the service stopped as failed."""
    for version in registry.list_versions():
        status = registry.status(version)
        if status and status.get("state") not in ("succeeded", "failed"):
            registry.write_json(
                registry.version_dir(version) / "status.json",
                status | {"state": "failed", "error": "บริการ AI ถูกรีสตาร์ทระหว่างเทรน",
                          "finished_at": datetime.now(UTC).isoformat()},
            )
