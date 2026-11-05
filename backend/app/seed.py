"""First-run bootstrap: create the initial admin account when the users table is empty.

No patients, images or AI results are created; every record comes from real use.
"""
from __future__ import annotations

import logging
import os

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import User
from .security import hash_password

log = logging.getLogger(__name__)

INITIAL_ADMIN_PASSWORD = os.getenv("PEDIVEIN_DEMO_PASSWORD", "pedivein1234")


def seed(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)) is not None:
        return
    log.warning("Creating the initial admin account (username 'admin'); change its password after first login.")
    db.add(User(
        username="admin", password_hash=hash_password(INITIAL_ADMIN_PASSWORD), full_name="ผู้ดูแลระบบ",
        employee_code="ADMIN", role="admin", position="ผู้ดูแลระบบ", scope="ทุกแผนก",
    ))
    db.commit()
