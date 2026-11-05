"""Permanent deletion of a whole patient case or of one AI analysis (admin only, audited by the caller).

Rows are removed from the database and the image files are returned so the caller can delete them
from disk after the transaction commits. Nothing can be restored afterwards; only the audit log remains.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from ..models import AiAnalysis, Image, InspectionRound, IvSite, Notification, Patient, Review
from . import storage


def _image_in_use(db: Session, image_id: int) -> bool:
    return any(
        db.scalar(select(model.id).where(column == image_id).limit(1)) is not None
        for model, column in (
            (AiAnalysis, AiAnalysis.image_id),
            (InspectionRound, InspectionRound.image_id),
            (IvSite, IvSite.baseline_image_id),
        )
    )


def delete_analysis(db: Session, analysis: AiAnalysis) -> list[Path]:
    """Delete one analysis, its reviews and photo; a round it completed goes back to pending."""
    image = analysis.image
    round_ = analysis.round
    db.execute(delete(Notification).where(Notification.analysis_id == analysis.id))
    for review in list(analysis.reviews):
        db.delete(review)
    if round_ is not None and round_.image_id == analysis.image_id:
        other = db.scalar(
            select(AiAnalysis)
            .where(AiAnalysis.round_id == round_.id, AiAnalysis.id != analysis.id, AiAnalysis.prediction_issued.is_(True))
            .order_by(AiAnalysis.id.desc())
            .limit(1)
        )
        round_.image_id = other.image_id if other else None
        if other is None and round_.status == "completed":
            round_.status = "pending"
            round_.completed_at = None
            round_.performed_by_id = None
    db.delete(analysis)
    db.flush()
    files: list[Path] = []
    if image is not None and not _image_in_use(db, image.id):
        files.append(storage.absolute_path(image))
        db.delete(image)
        db.flush()
    return files


def delete_patient(db: Session, patient: Patient) -> tuple[list[Path], dict[str, int]]:
    """Delete the patient with every IV site, round, photo, analysis, review and notification."""
    site_ids = list(db.scalars(select(IvSite.id).where(IvSite.patient_id == patient.id)))
    analysis_ids = list(db.scalars(select(AiAnalysis.id).where(AiAnalysis.iv_site_id.in_(site_ids))))
    round_ids = list(db.scalars(select(InspectionRound.id).where(InspectionRound.iv_site_id.in_(site_ids))))
    images = list(db.scalars(select(Image).where(Image.iv_site_id.in_(site_ids))))
    files = [storage.absolute_path(image) for image in images]
    counts = {"sites": len(site_ids), "analyses": len(analysis_ids), "images": len(images)}

    db.execute(
        delete(Notification).where(
            or_(
                Notification.patient_id == patient.id,
                Notification.analysis_id.in_(analysis_ids),
                Notification.round_id.in_(round_ids),
            )
        )
    )
    db.execute(delete(Review).where(Review.analysis_id.in_(analysis_ids)))
    db.execute(delete(AiAnalysis).where(AiAnalysis.id.in_(analysis_ids)))
    # Break the image <-> site/round references before deleting either side.
    db.execute(update(IvSite).where(IvSite.id.in_(site_ids)).values(baseline_image_id=None))
    db.execute(update(InspectionRound).where(InspectionRound.id.in_(round_ids)).values(image_id=None))
    db.execute(delete(InspectionRound).where(InspectionRound.id.in_(round_ids)))
    db.execute(delete(Image).where(Image.id.in_([image.id for image in images])))
    db.execute(delete(IvSite).where(IvSite.id.in_(site_ids)))
    db.execute(delete(Patient).where(Patient.id == patient.id))
    db.expire_all()
    return files, counts


def remove_files(files: list[Path]) -> None:
    for path in files:
        path.unlink(missing_ok=True)
