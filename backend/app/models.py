from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _now_col() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    full_name: Mapped[str] = mapped_column(String(200))
    employee_code: Mapped[str] = mapped_column(String(32), index=True)
    email: Mapped[str | None] = mapped_column(String(200))
    # admin | head_nurse | nurse | doctor | iv_team
    role: Mapped[str] = mapped_column(String(32), default="nurse")
    position: Mapped[str] = mapped_column(String(200), default="พยาบาลวิชาชีพ แผนกเด็ก")
    scope: Mapped[str] = mapped_column(String(200), default="แผนกเด็ก")
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _now_col()


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    hn: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    an: Mapped[str | None] = mapped_column(String(32), index=True)
    full_name: Mapped[str] = mapped_column(String(200))
    gender: Mapped[str | None] = mapped_column(String(16))
    birth_date: Mapped[date | None] = mapped_column(Date)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    diagnosis: Mapped[str | None] = mapped_column(String(300))
    ward: Mapped[str] = mapped_column(String(64), default="PICU")
    room: Mapped[str | None] = mapped_column(String(64))
    bed: Mapped[str | None] = mapped_column(String(64))
    attending_nurse_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    # admitted | discharged
    status: Mapped[str] = mapped_column(String(16), default="admitted", index=True)
    admitted_at: Mapped[datetime] = _now_col()
    discharged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    discharge_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _now_col()

    attending_nurse: Mapped[User | None] = relationship()
    iv_sites: Mapped[list[IvSite]] = relationship(
        back_populates="patient", order_by="IvSite.needle_no"
    )


class Image(Base):
    __tablename__ = "images"

    id: Mapped[int] = mapped_column(primary_key=True)
    iv_site_id: Mapped[int | None] = mapped_column(ForeignKey("iv_sites.id"), index=True)
    # baseline | round
    kind: Mapped[str] = mapped_column(String(16))
    storage_path: Mapped[str] = mapped_column(String(500))
    content_type: Mapped[str] = mapped_column(String(32))
    sha256: Mapped[str] = mapped_column(String(64))
    size_bytes: Mapped[int] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    quality: Mapped[dict | None] = mapped_column(JSON)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = _now_col()


class IvSite(Base):
    __tablename__ = "iv_sites"
    __table_args__ = (UniqueConstraint("patient_id", "needle_no"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    needle_no: Mapped[int] = mapped_column(Integer)
    body_side: Mapped[str] = mapped_column(String(16))
    location: Mapped[str] = mapped_column(String(100))
    vein: Mapped[str] = mapped_column(String(100))
    interval_hours: Mapped[int] = mapped_column(Integer, default=2)
    duration_hours: Mapped[int] = mapped_column(Integer, default=168)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # active | removed | completed
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    removed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    removal_reason: Mapped[str | None] = mapped_column(Text)
    removed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    baseline_image_id: Mapped[int | None] = mapped_column(
        ForeignKey("images.id", use_alter=True, name="fk_iv_sites_baseline_image")
    )
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = _now_col()

    patient: Mapped[Patient] = relationship(back_populates="iv_sites")
    rounds: Mapped[list[InspectionRound]] = relationship(
        back_populates="iv_site", order_by="InspectionRound.round_no"
    )
    baseline_image: Mapped[Image | None] = relationship(foreign_keys=[baseline_image_id])


class InspectionRound(Base):
    __tablename__ = "inspection_rounds"
    __table_args__ = (UniqueConstraint("iv_site_id", "round_no"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    iv_site_id: Mapped[int] = mapped_column(ForeignKey("iv_sites.id"), index=True)
    round_no: Mapped[int] = mapped_column(Integer)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # pending | completed | skipped | cancelled
    status: Mapped[str] = mapped_column(String(16), default="pending", index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    performed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    skip_reason: Mapped[str | None] = mapped_column(Text)
    note: Mapped[str | None] = mapped_column(Text)
    image_id: Mapped[int | None] = mapped_column(ForeignKey("images.id"))

    iv_site: Mapped[IvSite] = relationship(back_populates="rounds")
    performed_by: Mapped[User | None] = relationship()
    image: Mapped[Image | None] = relationship()
    analyses: Mapped[list[AiAnalysis]] = relationship(
        back_populates="round", order_by="AiAnalysis.id"
    )


class AiAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[int] = mapped_column(primary_key=True)
    iv_site_id: Mapped[int] = mapped_column(ForeignKey("iv_sites.id"), index=True)
    round_id: Mapped[int | None] = mapped_column(ForeignKey("inspection_rounds.id"), index=True)
    image_id: Mapped[int] = mapped_column(ForeignKey("images.id"))
    # OK | QUALITY_HOLD | PREPROCESSING_HOLD
    status: Mapped[str] = mapped_column(String(32), index=True)
    prediction_issued: Mapped[bool] = mapped_column(Boolean, default=False)
    condition_prediction: Mapped[str | None] = mapped_column(String(8))  # INF | PHL
    prob_inf: Mapped[float | None] = mapped_column(Float)
    prob_phl: Mapped[float | None] = mapped_column(Float)
    grade_prediction: Mapped[int | None] = mapped_column(Integer)
    grade_probabilities: Mapped[dict | None] = mapped_column(JSON)
    quality: Mapped[dict | None] = mapped_column(JSON)
    preprocessing: Mapped[dict | None] = mapped_column(JSON)
    model_version: Mapped[str | None] = mapped_column(String(64))
    model_status: Mapped[str | None] = mapped_column(String(64))
    processing_ms: Mapped[int | None] = mapped_column(Integer)
    # pending_review | reviewed | not_applicable
    review_status: Mapped[str] = mapped_column(String(32), default="not_applicable", index=True)
    assigned_reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = _now_col()

    iv_site: Mapped[IvSite] = relationship()
    round: Mapped[InspectionRound | None] = relationship(back_populates="analyses")
    image: Mapped[Image] = relationship()
    assigned_reviewer: Mapped[User | None] = relationship(foreign_keys=[assigned_reviewer_id])
    reviews: Mapped[list[Review]] = relationship(back_populates="analysis", order_by="Review.id")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("analysis_id", "condition"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey("ai_analyses.id"), index=True)
    # infiltration | phlebitis
    condition: Mapped[str] = mapped_column(String(16))
    # no_observation | observation_found
    finding: Mapped[str] = mapped_column(String(32))
    grade: Mapped[int] = mapped_column(Integer, default=0)
    has_pain: Mapped[bool | None] = mapped_column(Boolean)
    note: Mapped[str | None] = mapped_column(Text)
    reviewer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = _now_col()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    analysis: Mapped[AiAnalysis] = relationship(back_populates="reviews")
    reviewer: Mapped[User] = relationship()


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    # NULL user_id means visible to every user
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    # due | ai | system
    category: Mapped[str] = mapped_column(String(16), index=True)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str | None] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String(64))
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("patients.id"))
    analysis_id: Mapped[int | None] = mapped_column(ForeignKey("ai_analyses.id"))
    round_id: Mapped[int | None] = mapped_column(ForeignKey("inspection_rounds.id"))
    created_at: Mapped[datetime] = _now_col()


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    notification_id: Mapped[int] = mapped_column(
        ForeignKey("notifications.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    read_at: Mapped[datetime] = _now_col()


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(200))
    # skip | ai | photo | permission | complete | start | review | login | system
    event_type: Mapped[str] = mapped_column(String(32))
    # schedule | ai | permission | system
    category: Mapped[str] = mapped_column(String(32), index=True)
    event: Mapped[str] = mapped_column(String(300))
    target: Mapped[str | None] = mapped_column(String(300))
    details: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(String(64))


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[dict | list | str | int | float | bool | None] = mapped_column(JSON)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ModelVersion(Base):
    """One AI model version: the built-in model or a retraining run, with its metrics and log.

    Rows mirror the AI service registry (which holds the model files); the log and metrics are
    copied here when training ends so they stay with the hospital database.
    """

    __tablename__ = "model_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(64), unique=True)
    # queued | preprocessing | training | evaluating | exporting | succeeded | failed
    state: Mapped[str] = mapped_column(String(16), index=True)
    progress: Mapped[float | None] = mapped_column(Float)
    message: Mapped[str | None] = mapped_column(String(300))
    error: Mapped[str | None] = mapped_column(Text)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    base_version: Mapped[str | None] = mapped_column(String(64))
    # manual | schedule | builtin
    trigger: Mapped[str] = mapped_column(String(16), default="manual")
    notes: Mapped[str | None] = mapped_column(Text)
    # Labels sent to training: counts and the analysis ids, so a run can be traced back to its images.
    dataset: Mapped[dict | None] = mapped_column(JSON)
    # Full metadata.json from the AI service (metrics, split, hyper-parameters, history).
    model_metadata: Mapped[dict | None] = mapped_column(JSON)
    log: Mapped[str | None] = mapped_column(Text)
    started_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = _now_col()
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    activated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    started_by: Mapped[User | None] = relationship(foreign_keys=[started_by_id])
    activated_by: Mapped[User | None] = relationship(foreign_keys=[activated_by_id])
