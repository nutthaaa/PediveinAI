"""Tests run against a real PostgreSQL database (``pedivein_test`` on the docker-compose server)."""
from __future__ import annotations

import io
import os

import pytest
from PIL import Image as PILImage
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

ADMIN_URL = os.getenv("PEDIVEIN_TEST_ADMIN_URL", "postgresql+psycopg://pedivein:pedivein@localhost:5434/pedivein")
TEST_URL = make_url(ADMIN_URL).set(database="pedivein_test").render_as_string(hide_password=False)


def _recreate_database() -> None:
    engine = create_engine(ADMIN_URL, isolation_level="AUTOCOMMIT")
    with engine.connect() as connection:
        connection.execute(text("DROP DATABASE IF EXISTS pedivein_test WITH (FORCE)"))
        connection.execute(text("CREATE DATABASE pedivein_test"))
    engine.dispose()


_recreate_database()
os.environ["PEDIVEIN_DATABASE_URL"] = TEST_URL
os.environ["PEDIVEIN_SEED_DEMO_DATA"] = "false"


@pytest.fixture(scope="session", autouse=True)
def schema(tmp_path_factory):
    os.environ["PEDIVEIN_UPLOAD_DIR"] = str(tmp_path_factory.mktemp("uploads"))
    from alembic import command
    from alembic.config import Config

    from app.config import get_settings

    get_settings.cache_clear()
    command.upgrade(Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini")), "head")
    yield


@pytest.fixture
def db():
    from app.db import SessionLocal

    with SessionLocal() as session:
        yield session


@pytest.fixture(autouse=True)
def clean_tables(db):
    yield
    db.execute(
        text(
            "TRUNCATE notification_reads, notifications, reviews, ai_analyses, inspection_rounds, "
            "images, iv_sites, patients, audit_logs, system_settings, model_versions, users RESTART IDENTITY CASCADE"
        )
    )
    db.commit()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from app.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client


def make_user(db, username: str, role: str = "nurse"):
    from app.models import User
    from app.security import hash_password

    user = User(username=username, password_hash=hash_password("password123"), full_name=f"{username} name",
                employee_code=username.upper(), role=role)
    db.add(user)
    db.commit()
    return user


def login(client, username: str) -> None:
    response = client.post("/api/auth/login", json={"username": username, "password": "password123"})
    assert response.status_code == 200, response.text


def png_bytes() -> bytes:
    buffer = io.BytesIO()
    PILImage.new("RGB", (64, 48), (200, 150, 120)).save(buffer, format="PNG")
    return buffer.getvalue()
