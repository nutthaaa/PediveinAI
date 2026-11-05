from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User
from ..security import CurrentUser, create_access_token, verify_password
from ..serializers import user_out
from ..services import audit, scheduling

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str
    remember_me: bool = False


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Annotated[Session, Depends(get_db)]):
    user = db.scalar(select(User).where(User.username == body.username.strip()))
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        audit.record(
            db,
            actor=None,
            actor_name=body.username.strip()[:200] or "ไม่ระบุ",
            event_type="login",
            category="permission",
            event="เข้าสู่ระบบไม่สำเร็จ",
            request=request,
        )
        db.commit()
        raise HTTPException(401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")

    user.last_login_at = scheduling.now_utc()
    audit.record(
        db, actor=user, event_type="login", category="permission", event="เข้าสู่ระบบ", request=request
    )
    db.commit()

    settings = get_settings()
    token = create_access_token(user)
    response.set_cookie(
        settings.cookie_name,
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=settings.jwt_expire_minutes * 60 if body.remember_me else None,
        path="/",
    )
    return {"user": user_out(user), "access_token": token, "token_type": "bearer"}


@router.post("/logout")
def logout(response: Response, user: CurrentUser, request: Request, db: Annotated[Session, Depends(get_db)]):
    audit.record(
        db, actor=user, event_type="login", category="permission", event="ออกจากระบบ", request=request
    )
    db.commit()
    response.delete_cookie(get_settings().cookie_name, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: CurrentUser):
    return user_out(user)
