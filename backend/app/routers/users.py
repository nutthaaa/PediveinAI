from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import AdminUser, CurrentUser, hash_password
from ..serializers import ROLE_LABELS, user_brief, user_out
from ..services import audit

router = APIRouter(prefix="/api/users", tags=["users"])

Role = Literal["admin", "head_nurse", "nurse", "doctor", "iv_team"]


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9._-]+$")
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=200)
    employee_code: str = Field(min_length=1, max_length=32)
    email: str | None = None
    role: Role = "nurse"
    position: str = "พยาบาลวิชาชีพ แผนกเด็ก"
    scope: str = "แผนกเด็ก"
    mfa_enabled: bool = False


class UserUpdate(BaseModel):
    full_name: str | None = None
    employee_code: str | None = None
    email: str | None = None
    role: Role | None = None
    position: str | None = None
    scope: str | None = None
    mfa_enabled: bool | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


@router.get("")
def list_users(
    _: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    status: Literal["all", "active", "inactive"] = "all",
):
    stmt = select(User).order_by(User.id)
    if status != "all":
        stmt = stmt.where(User.is_active == (status == "active"))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(User.full_name.ilike(like), User.employee_code.ilike(like), User.email.ilike(like),
                User.username.ilike(like))
        )
    return [user_out(u) for u in db.scalars(stmt)]


@router.get("/reviewers")
def list_reviewers(_: CurrentUser, db: Annotated[Session, Depends(get_db)]):
    """Active clinical staff who can be assigned to review AI results."""
    stmt = select(User).where(User.is_active, User.role != "admin").order_by(User.full_name)
    return [user_brief(u) for u in db.scalars(stmt)]


@router.get("/roles")
def roles(_: CurrentUser):
    return [{"value": k, "label": v} for k, v in ROLE_LABELS.items()]


@router.post("", status_code=201)
def create_user(body: UserCreate, admin: AdminUser, request: Request, db: Annotated[Session, Depends(get_db)]):
    if db.scalar(select(User.id).where(User.username == body.username)):
        raise HTTPException(409, detail="ชื่อผู้ใช้นี้มีอยู่แล้ว")
    user = User(**body.model_dump(exclude={"password"}), password_hash=hash_password(body.password))
    db.add(user)
    audit.record(
        db,
        actor=admin,
        event_type="permission",
        category="permission",
        event="เพิ่มผู้ใช้งาน",
        target=f"{body.full_name} · {body.employee_code}",
        details=f"บทบาท: {ROLE_LABELS[body.role]} · ขอบเขต: {body.scope}",
        request=request,
    )
    db.commit()
    return user_out(user)


@router.patch("/{user_id}")
def update_user(
    user_id: int, body: UserUpdate, admin: AdminUser, request: Request, db: Annotated[Session, Depends(get_db)]
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, detail="User not found")
    changes = body.model_dump(exclude_unset=True)
    if user.id == admin.id and (changes.get("is_active") is False or changes.get("role", "admin") != "admin"):
        raise HTTPException(400, detail="ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตนเองได้")
    password = changes.pop("password", None)
    for key, value in changes.items():
        setattr(user, key, value)
    if password:
        user.password_hash = hash_password(password)
    changed = list(changes) + (["password"] if password else [])
    audit.record(
        db,
        actor=admin,
        event_type="permission",
        category="permission",
        event="แก้ไขข้อมูลผู้ใช้งาน",
        target=f"{user.full_name} · {user.employee_code}",
        details="แก้ไข: " + ", ".join(changed) if changed else None,
        request=request,
    )
    db.commit()
    return user_out(user)
