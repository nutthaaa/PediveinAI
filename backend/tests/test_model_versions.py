from __future__ import annotations

import itertools
from datetime import timedelta

import pytest

from app.models import AiAnalysis, AuditLog, Image, IvSite, ModelVersion, Patient, Review, User
from app.services import ai_client, model_training, scheduling, settings_store
from app.services.ai_client import AiServiceError

from .conftest import login, make_user

BUILTIN = ai_client.BUILTIN_MODEL_VERSION
_ids = itertools.count(1)


class FakeAiRegistry:
    """In-memory stand-in for the AI service's /api/v1/models and /api/v1/training."""

    def __init__(self):
        self.active = BUILTIN
        self.versions = {BUILTIN: {"version": BUILTIN, "builtin": True, "state": "succeeded", "progress": 1.0,
                                   "metadata": {"version": BUILTIN, "oof_condition": {"accuracy": 0.73}}}}
        self.trained: list[dict] = []
        self.reachable = True

    def list_models(self):
        if not self.reachable:
            raise AiServiceError("down")
        running = any(v["state"] not in ("succeeded", "failed") for v in self.versions.values())
        return {"active": self.active, "loaded": self.active, "training_running": running,
                "versions": list(self.versions.values())}

    def get_model(self, version):
        return self.versions[version] | {"log": f"Epoch 1/1 for {version}"}

    def start_training(self, body):
        self.trained.append(body)
        self.versions[body["version"]] = {"version": body["version"], "builtin": False, "state": "queued",
                                          "progress": 0.0, "metadata": None}
        return {"state": "queued", "progress": 0.0, "message": "รอเริ่มเทรน"}

    def finish(self, version, ok=True):
        item = self.versions[version]
        item["state"] = "succeeded" if ok else "failed"
        item["finished_at"] = "2026-11-02T03:00:00+00:00"
        if ok:
            item["metadata"] = {"version": version, "base_version": BUILTIN,
                                "test_metrics": {"condition": {"accuracy": 0.8}, "grade": {"accuracy": 0.6}}}
        else:
            item["error"] = "ข้อมูลไม่พอ"

    def activate_model(self, version):
        self.active = version
        return {"active": version}


@pytest.fixture
def fake_registry(monkeypatch):
    fake = FakeAiRegistry()
    for name in ("list_models", "get_model", "start_training", "activate_model"):
        monkeypatch.setattr(ai_client, name, getattr(fake, name))
    return fake


def add_reviewed(db, patients: int, per_patient: int, labels=None):
    """Create reviewed analyses; ``labels`` cycles (infiltration grade, phlebitis grade) pairs."""
    labels = labels or [(2, 0), (0, 3), (1, 0), (0, 4)]
    k = 0
    for p in range(patients):
        patient = Patient(hn=f"HN{next(_ids)}", full_name=f"เด็ก {p}")
        site = IvSite(patient=patient, needle_no=1, body_side="ซ้าย", location="หลังมือ", vein="Cephalic",
                      started_at=scheduling.now_utc())
        db.add(site)
        db.flush()
        for _ in range(per_patient):
            inf, phl = labels[k % len(labels)]
            k += 1
            image = Image(iv_site_id=site.id, kind="round", storage_path=f"2026/11/{k}.png",
                          content_type="image/png", sha256="0" * 64, size_bytes=1)
            db.add(image)
            db.flush()
            analysis = AiAnalysis(iv_site_id=site.id, image_id=image.id, status="OK", prediction_issued=True,
                                  review_status="reviewed",
                                  preprocessing={"manual_target_selection": k % 5 == 0, "selected_arm_id": "ARM02"})
            reviewer = db.query(User).first()
            for condition, grade in (("infiltration", inf), ("phlebitis", phl)):
                analysis.reviews.append(Review(
                    condition=condition, finding="observation_found" if grade else "no_observation",
                    grade=grade, reviewer_id=reviewer.id,
                ))
            db.add(analysis)
    db.commit()


def test_label_rules(db):
    make_user(db, "nurse")
    add_reviewed(db, 1, 4, labels=[(2, 0), (0, 3), (0, 0), (2, 2)])
    samples, summary = model_training.build_dataset(db)
    assert [(s["condition"], s["grade"]) for s in samples] == [("INF", 2), ("PHL", 3)]
    assert summary["excluded"] == {"no_finding": 1, "both_conditions_same_grade": 1}
    assert summary["labelled"] == 2 and summary["patients"] == 1
    assert "HN" not in samples[0]["patient"]


def test_train_activate_and_rollback(client, db, fake_registry):
    make_user(db, "nurse")
    make_user(db, "boss", role="admin")
    login(client, "nurse")
    assert client.get("/api/model-versions").status_code == 403
    assert client.post("/api/model-versions/train", json={}).status_code == 403

    login(client, "boss")
    add_reviewed(db, 3, 4)
    too_few = client.post("/api/model-versions/train", json={})
    assert too_few.status_code == 422
    assert "อย่างน้อย 25" in too_few.json()["detail"]

    add_reviewed(db, 5, 4)
    page = client.get("/api/model-versions").json()
    assert page["ai_reachable"] is True
    assert page["dataset"]["labelled"] == 32
    assert page["dataset"]["new_since_last_training"] == 32
    assert "analysis_ids" not in page["dataset"]
    builtin = page["versions"][0]
    assert builtin["is_builtin"] and builtin["is_active"]

    started = client.post("/api/model-versions/train", json={"notes": "รอบแรก", "epochs": 5})
    assert started.status_code == 201, started.text
    run = started.json()
    assert run["version"] == "PEDIVEIN_MULTITASK_CANDIDATE_V2.1.0"
    assert run["state"] == "queued" and run["base_version"] == BUILTIN
    sent = fake_registry.trained[0]
    assert sent["epochs"] == 5 and len(sent["samples"]) == 32
    assert any(s["selected_arm_id"] == "ARM02" for s in sent["samples"])
    assert client.post("/api/model-versions/train", json={}).status_code == 409

    fake_registry.finish(run["version"])
    detail = client.get(f"/api/model-versions/{run['id']}").json()
    assert detail["state"] == "succeeded"
    assert detail["log"] == f"Epoch 1/1 for {run['version']}"
    assert detail["metadata"]["test_metrics"]["condition"]["accuracy"] == 0.8
    assert detail["dataset"]["labelled"] == 32 and detail["notes"] == "รอบแรก"
    assert db.query(AuditLog).filter(AuditLog.event == "เทรนโมเดลเสร็จ").count() == 1

    activated = client.post(f"/api/model-versions/{run['id']}/activate").json()
    assert activated["is_active"] is True and fake_registry.active == run["version"]
    page = client.get("/api/model-versions").json()
    assert [v["version"] for v in page["versions"] if v["is_active"]] == [run["version"]]
    assert page["dataset"]["new_since_last_training"] == 0

    # Roll back to the built-in model.
    client.post(f"/api/model-versions/{builtin['id']}/activate")
    assert fake_registry.active == BUILTIN
    assert db.query(AuditLog).filter(AuditLog.event == "เปลี่ยนโมเดล AI ที่ใช้งาน").count() == 2


def test_failed_run_cannot_be_activated(client, db, fake_registry):
    make_user(db, "boss", role="admin")
    login(client, "boss")
    add_reviewed(db, 8, 4)
    run = client.post("/api/model-versions/train", json={}).json()
    fake_registry.finish(run["version"], ok=False)
    detail = client.get(f"/api/model-versions/{run['id']}").json()
    assert detail["state"] == "failed" and detail["error"] == "ข้อมูลไม่พอ"
    assert client.post(f"/api/model-versions/{run['id']}/activate").status_code == 409
    # The next run gets a new version number.
    second = client.post("/api/model-versions/train", json={}).json()
    assert second["version"] == "PEDIVEIN_MULTITASK_CANDIDATE_V2.2.0"


def test_ai_unreachable(client, db, fake_registry):
    make_user(db, "boss", role="admin")
    login(client, "boss")
    fake_registry.reachable = False
    page = client.get("/api/model-versions").json()
    assert page["ai_reachable"] is False and page["ai_error"] == "down"
    assert client.post("/api/model-versions/train", json={}).status_code == 503


def test_old_ai_service_is_explained(client, db, monkeypatch):
    make_user(db, "boss", role="admin")
    login(client, "boss")

    def not_found():
        raise AiServiceError("บริการ AI: Not Found", status_code=404)

    monkeypatch.setattr(ai_client, "list_models", not_found)
    page = client.get("/api/model-versions").json()
    assert page["ai_reachable"] is False
    assert "build image" in page["ai_error"]


def test_scheduled_retrain(db, fake_registry):
    admin = make_user(db, "boss", role="admin")
    add_reviewed(db, 8, 4)
    assert model_training.scheduled_tick(db) is None  # disabled by default
    settings_store.update(db, {"auto_retrain_enabled": True, "auto_retrain_min_new_labels": 10}, admin.id)
    run = model_training.scheduled_tick(db)
    db.commit()
    assert run is not None and run.trigger == "schedule" and run.started_by_id is None
    assert model_training.scheduled_tick(db) is None  # still running

    fake_registry.finish(run.version)
    add_reviewed(db, 4, 4)
    assert model_training.scheduled_tick(db) is None  # interval not reached
    run.created_at = scheduling.now_utc() - timedelta(days=8)
    db.commit()
    second = model_training.scheduled_tick(db)
    assert second is not None and second.version.endswith("V2.2.0")
    # Scheduled runs never change the active model.
    assert fake_registry.active == BUILTIN
    assert db.query(ModelVersion).filter(ModelVersion.is_active.is_(True)).one().version == BUILTIN


def test_inspection_records_model_version_from_ai(client, db, monkeypatch):
    from .test_flow import PREDICTION_OK, QUALITY_PASS, image_file, start_site

    monkeypatch.setattr(ai_client, "check_quality", lambda data, content_type: QUALITY_PASS)
    monkeypatch.setattr(
        ai_client, "predict",
        lambda *a, **k: (PREDICTION_OK | {"model_version": "PEDIVEIN_MULTITASK_CANDIDATE_V2.3.0"}, 10),
    )
    make_user(db, "nurse")
    login(client, "nurse")
    _, site_id = start_site(client)
    site = client.get(f"/api/iv-sites/{site_id}").json()
    analysis = client.post(f"/api/rounds/{site['next_round']['id']}/inspect", files=image_file()).json()
    assert analysis["model_version"] == "PEDIVEIN_MULTITASK_CANDIDATE_V2.3.0"
