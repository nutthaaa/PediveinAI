from __future__ import annotations

import hashlib
import io
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image as PILImage
from PIL import UnidentifiedImageError

from ..config import get_settings
from ..models import Image

ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png"}


async def read_upload(upload: UploadFile) -> tuple[bytes, str]:
    content_type = (upload.content_type or "").lower()
    if content_type == "image/jpg":
        content_type = "image/jpeg"
    if content_type not in ALLOWED:
        raise HTTPException(415, detail="รองรับเฉพาะไฟล์ JPG หรือ PNG")
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, detail="ไฟล์ภาพมีขนาดใหญ่เกินกำหนด")
    if not data:
        raise HTTPException(422, detail="ไฟล์ภาพว่าง")
    return data, content_type


def save_image(
    data: bytes,
    content_type: str,
    *,
    kind: str,
    iv_site_id: int | None,
    uploaded_by_id: int | None,
) -> Image:
    try:
        with PILImage.open(io.BytesIO(data)) as opened:
            opened.verify()
        with PILImage.open(io.BytesIO(data)) as opened:
            width, height = opened.size
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(422, detail="ไม่สามารถเปิดไฟล์ภาพได้") from exc

    root = get_settings().upload_dir
    relative = Path(datetime.now(UTC).strftime("%Y/%m")) / f"{uuid.uuid4().hex}{ALLOWED[content_type]}"
    destination = root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return Image(
        iv_site_id=iv_site_id,
        kind=kind,
        storage_path=str(relative),
        content_type=content_type,
        sha256=hashlib.sha256(data).hexdigest(),
        size_bytes=len(data),
        width=width,
        height=height,
        uploaded_by_id=uploaded_by_id,
    )


def absolute_path(image: Image) -> Path:
    root = get_settings().upload_dir.resolve()
    path = (root / image.storage_path).resolve()
    if not path.is_relative_to(root):
        raise HTTPException(404, detail="Image not found")
    return path
