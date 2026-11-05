from __future__ import annotations

from datetime import timedelta

import pytest

from app.models import InspectionRound
from app.services import ai_client

from .conftest import login, make_user, png_bytes

QUALITY_PASS = {"status": "PASS", "reasons": [], "warnings": [], "checks": {"sharpness": "PASS"}}
PREDICTION_OK = {
    "status": "OK",
    "prediction_issued": True,
    "quality": QUALITY_PASS,
    "preprocessing": {"status": "READY", "reason": "", "output_path": "/tmp/x.png"},
    "condition_prediction": "PHL",
    "condition_probabilities": {"INF": 0.2, "PHL": 0.8},
    "grade_prediction": 3,
    "grade_probabilities": {"1": 0.1, "2": 0.2, "3": 0.6, "4": 0.1},
    "model_status": "EXPERIMENTAL_CANDIDATE",
}


@pytest.fixture
def fake_ai(monkeypatch):
    state = {"prediction": PREDICTION_OK, "quality": QUALITY_PASS, "calls": []}

    def predict(data, content_type, *, selected_arm_id=None, allow_manual_quality_review=False):
        state["calls"].append((selected_arm_id, allow_manual_quality_review))
        return state["prediction"], 1234

    monkeypatch.setattr(ai_client, "predict", predict)
    monkeypatch.setattr(ai_client, "check_quality", lambda data, content_type: state["quality"])
    return state


def image_file():
    return {"image": ("iv.png", png_bytes(), "image/png")}


def start_site(client) -> tuple[int, int]:
    patient = client.post("/api/patients", json={"hn": "HN1", "an": "AN1", "full_name": "เด็กทดสอบ", "gender": "male", "room": "A-01"}).json()
    response = client.post(
        f"/api/patients/{patient['id']}/iv-sites",
        data={"body_side": "ซ้าย", "location": "หลังมือซ้าย", "vein": "Cephalic vein"},
        files={"baseline_image": ("b.png", png_bytes(), "image/png")},
    )
    assert response.status_code == 201, response.text
    return patient["id"], response.json()["id"]


def test_requires_login(client):
    assert client.get("/api/patients").status_code == 401
    assert client.post("/api/auth/login", json={"username": "x", "password": "y"}).status_code == 401


def test_full_inspection_and_review_flow(client, db, fake_ai):
    make_user(db, "nurse")
    login(client, "nurse")
    patient_id, site_id = start_site(client)

    site = client.get(f"/api/iv-sites/{site_id}").json()
    assert site["total_rounds"] == 84
    assert site["next_round"]["round_no"] == 1
    assert site["next_round"]["schedule_status"] == "upcoming"
    assert client.get(site["baseline_image_url"]).status_code == 200

    analysis = client.post(f"/api/rounds/{site['next_round']['id']}/inspect", files=image_file()).json()
    assert analysis["status"] == "OK"
    assert analysis["conditions"]["phlebitis"]["flagged"] is True
    assert analysis["conditions"]["phlebitis"]["ai_grade"] == 3
    assert analysis["conditions"]["infiltration"]["flagged"] is False
    assert analysis["previous_image_url"] == site["baseline_image_url"]
    assert analysis["processing_ms"] == 1234

    queue = client.get("/api/analyses/review-queue").json()
    assert {item["condition"] for item in queue} == {"infiltration", "phlebitis"}
    assert client.get("/api/notifications/unread-count").json()["count"] == 1

    bad = client.post(f"/api/analyses/{analysis['id']}/reviews",
                      json={"condition": "phlebitis", "finding": "observation_found", "grade": 0})
    assert bad.status_code == 422
    client.post(f"/api/analyses/{analysis['id']}/reviews",
                json={"condition": "phlebitis", "finding": "observation_found", "grade": 2, "has_pain": True})
    done = client.post(f"/api/analyses/{analysis['id']}/reviews",
                       json={"condition": "infiltration", "finding": "no_observation", "grade": 3}).json()
    assert done["review_status"] == "reviewed"
    assert done["conditions"]["infiltration"]["review"]["grade"] == 0
    assert client.get("/api/analyses/review-queue").json() == []

    tracking = client.get("/api/tracking/phlebitis").json()
    assert [row["id"] for row in tracking] == [site_id]
    assert tracking[0]["latest_review"]["risk_level"] == "ปานกลาง"
    assert client.get("/api/tracking/infiltration").json() == []

    history = client.get("/api/history?condition=phlebitis").json()
    assert history[0]["grade"] == 2 and history[0]["ai_flagged"] is True

    report = client.get("/api/reports/summary?range=today").json()
    assert report["analyses_total"] == 1
    assert report["found"]["phlebitis"] == 1
    assert report["ai_agreement_rate"] == 1.0

    rounds = client.get(f"/api/patients/{patient_id}/rounds").json()
    assert rounds[0]["status"] == "completed"


def test_quality_hold_keeps_round_open(client, db, fake_ai):
    make_user(db, "nurse")
    login(client, "nurse")
    _, site_id = start_site(client)
    round_id = client.get(f"/api/iv-sites/{site_id}").json()["next_round"]["id"]

    fake_ai["prediction"] = {
        "status": "PREPROCESSING_HOLD",
        "prediction_issued": False,
        "quality": QUALITY_PASS,
        "preprocessing": {
            "status": "HOLD",
            "reason": "TARGET_SELECTION_AMBIGUOUS",
            "manual_review_candidates": [{"arm_id": "ARM01", "preview_data_url": "data:image/jpeg;base64,AA=="}],
        },
    }
    held = client.post(f"/api/rounds/{round_id}/inspect", files=image_file()).json()
    assert held["status"] == "PREPROCESSING_HOLD"
    assert held["manual_review_candidates"][0]["arm_id"] == "ARM01"
    assert held["review_status"] == "not_applicable"

    fake_ai["prediction"] = PREDICTION_OK
    response = client.post(f"/api/rounds/{round_id}/inspect", files=image_file(), data={"selected_arm_id": "ARM01"})
    assert response.json()["status"] == "OK"
    assert fake_ai["calls"][-1] == ("ARM01", False)
    assert client.post(f"/api/rounds/{round_id}/inspect", files=image_file()).status_code == 409


def test_baseline_rejected_when_retake(client, db, fake_ai):
    make_user(db, "nurse")
    login(client, "nurse")
    patient = client.post("/api/patients", json={"hn": "HN2", "full_name": "x", "gender": "female", "room": "A-02"}).json()
    fake_ai["quality"] = {"status": "RETAKE", "reasons": ["Image may be blurred"], "warnings": []}
    response = client.post(
        f"/api/patients/{patient['id']}/iv-sites",
        data={"body_side": "ซ้าย", "location": "a", "vein": "b"},
        files={"baseline_image": ("b.png", png_bytes(), "image/png")},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["quality"]["status"] == "RETAKE"


def test_skip_marks_earlier_rounds_missed_and_remove_cancels(client, db, fake_ai):
    make_user(db, "nurse")
    login(client, "nurse")
    patient_id, site_id = start_site(client)
    rounds = db.query(InspectionRound).filter_by(iv_site_id=site_id).order_by(InspectionRound.round_no).all()
    # Pretend the site started 5 hours ago: round 2 (due 4h) is the current round.
    for round_ in rounds:
        round_.due_at -= timedelta(hours=5)
    db.commit()

    current = client.get(f"/api/iv-sites/{site_id}").json()["next_round"]
    assert current["round_no"] == 2 and current["schedule_status"] == "overdue"
    assert client.post(f"/api/rounds/{current['id']}/skip", json={"reason": "ผู้ป่วยหลับ"}).status_code == 200
    site = client.get(f"/api/iv-sites/{site_id}").json()
    assert site["skipped_rounds"] == 1 and site["missed_rounds"] == 1

    removed = client.post(f"/api/iv-sites/{site_id}/remove", json={"reason": "เข็มหลุด"}).json()
    # Removed needles keep being observed every 8 h until the original 168 h window ends.
    assert removed["status"] == "removed" and removed["interval_hours"] == 8
    assert removed["next_round"]["round_no"] == 85
    assert [r["id"] for r in client.get("/api/rounds/board").json()] == [site_id]
    assert client.post(f"/api/iv-sites/{site_id}/remove", json={"reason": "ซ้ำ"}).status_code == 409

    discharged = client.post(f"/api/patients/{patient_id}/discharge", json={}).json()
    assert discharged["status"] == "discharged"
    assert [r["id"] for r in client.get("/api/tracking-completed").json()] == [site_id]
    assert client.get("/api/rounds/board").json() == []


def test_admin_only_endpoints(client, db):
    make_user(db, "nurse")
    make_user(db, "boss", role="admin")
    login(client, "nurse")
    assert client.get("/api/users").status_code == 403
    assert client.get("/api/audit-logs").status_code == 403
    assert client.put("/api/settings", json={"ai_enabled": False}).status_code == 403

    login(client, "boss")
    created = client.post("/api/users", json={
        "username": "newnurse", "password": "longpassword", "full_name": "N", "employee_code": "E1",
    })
    assert created.status_code == 201
    assert client.put("/api/settings", json={"due_window_minutes": 30}).json()["due_window_minutes"] == 30
    assert client.put("/api/settings", json={"bogus": 1}).status_code == 422
    logs = client.get("/api/audit-logs?category=permission").json()
    assert logs["total"] >= 2
    assert client.patch(f"/api/users/{created.json()['id']}", json={"is_active": False}).json()["is_active"] is False


def test_register_patient_with_room_and_gender_only(client, db):
    make_user(db, "nurse")
    login(client, "nurse")
    missing = client.post("/api/patients", json={"gender": "male"})
    assert missing.status_code == 422
    created = client.post("/api/patients", json={"room": " B-12 ", "gender": "female", "hn": "  ", "full_name": ""})
    assert created.status_code == 201, created.text
    patient = created.json()
    assert patient["hn"].isdigit() and len(patient["hn"]) == 10 and patient["hn"][0] != "0"
    assert patient["full_name"] == "ไม่ระบุชื่อ"
    assert patient["room"] == "B-12" and patient["ward"] == "PICU"
    second = client.post("/api/patients", json={"room": "B-13", "gender": "male"}).json()
    assert second["hn"] != patient["hn"]
    given = client.post("/api/patients", json={"room": "B-14", "gender": "male", "hn": "HN-7"}).json()
    assert given["hn"] == "HN-7"
    assert client.post("/api/patients", json={"room": "B-15", "gender": "male", "hn": "HN-7"}).status_code == 409


def test_pain_raises_grade_one_to_two(client, db, fake_ai):
    make_user(db, "nurse")
    login(client, "nurse")
    _, site_id = start_site(client)
    site = client.get(f"/api/iv-sites/{site_id}").json()
    analysis = client.post(f"/api/rounds/{site['next_round']['id']}/inspect", files=image_file()).json()
    url = f"/api/analyses/{analysis['id']}/reviews"
    raised = client.post(url, json={"condition": "phlebitis", "finding": "observation_found", "grade": 1, "has_pain": True})
    assert raised.json()["conditions"]["phlebitis"]["review"]["grade"] == 2
    kept = client.post(url, json={"condition": "infiltration", "finding": "observation_found", "grade": 1, "has_pain": False})
    assert kept.json()["conditions"]["infiltration"]["review"]["grade"] == 1
    higher = client.post(url, json={"condition": "phlebitis", "finding": "observation_found", "grade": 3, "has_pain": True})
    assert higher.json()["conditions"]["phlebitis"]["review"]["grade"] == 3


def test_admin_deletes_one_analysis_and_round_reopens(client, db, fake_ai):
    from app.config import get_settings
    from app.models import AiAnalysis, AuditLog, Image

    make_user(db, "nurse")
    make_user(db, "boss", role="admin")
    login(client, "nurse")
    _, site_id = start_site(client)
    site = client.get(f"/api/iv-sites/{site_id}").json()
    round_id = site["next_round"]["id"]
    analysis = client.post(f"/api/rounds/{round_id}/inspect", files=image_file()).json()
    client.post(f"/api/analyses/{analysis['id']}/reviews",
                json={"condition": "phlebitis", "finding": "observation_found", "grade": 2})
    image = db.get(Image, db.get(AiAnalysis, analysis["id"]).image_id)
    photo = get_settings().upload_dir / image.storage_path
    assert photo.exists()

    assert client.post(f"/api/analyses/{analysis['id']}/delete", json={"reason": "ถ่ายผิดคน"}).status_code == 403
    login(client, "boss")
    assert client.post(f"/api/analyses/{analysis['id']}/delete", json={"reason": ""}).status_code == 422
    response = client.post(f"/api/analyses/{analysis['id']}/delete", json={"reason": "ถ่ายผิดคน"})
    assert response.status_code == 200, response.text
    db.expire_all()
    assert db.get(AiAnalysis, analysis["id"]) is None
    assert not photo.exists()
    assert client.get("/api/analyses/review-queue").json() == []
    assert client.get(f"/api/iv-sites/{site_id}").json()["next_round"]["id"] == round_id
    log = db.query(AuditLog).filter(AuditLog.event == "ลบผลวิเคราะห์ AI (ถาวร)").one()
    assert "ถ่ายผิดคน" in log.details


def test_admin_deletes_whole_patient_case(client, db, fake_ai):
    from app.config import get_settings
    from app.models import AiAnalysis, AuditLog, Image, InspectionRound, IvSite, Patient

    make_user(db, "boss", role="admin")
    login(client, "boss")
    patient_id, site_id = start_site(client)
    site = client.get(f"/api/iv-sites/{site_id}").json()
    client.post(f"/api/rounds/{site['next_round']['id']}/inspect", files=image_file())
    photos = [get_settings().upload_dir / i.storage_path for i in db.query(Image).all()]
    assert len(photos) == 2 and all(p.exists() for p in photos)

    response = client.post(f"/api/patients/{patient_id}/delete", json={"reason": "ลงทะเบียนซ้ำ"})
    assert response.status_code == 200, response.text
    db.expire_all()
    assert db.get(Patient, patient_id) is None
    for model in (IvSite, InspectionRound, AiAnalysis, Image):
        assert db.query(model).count() == 0
    assert not any(p.exists() for p in photos)
    assert client.get(f"/api/patients/{patient_id}").status_code == 404
    assert client.get("/api/patients").json() == []
    assert db.query(AuditLog).filter(AuditLog.event == "ลบเคสผู้ป่วย (ถาวร)").count() == 1
