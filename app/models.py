import uuid
from datetime import datetime, timezone

from . import db


class File(db.Model):
    __tablename__ = "files"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    original_filename = db.Column(db.String(255), nullable=False)

    storage_path = db.Column(db.String(255), nullable=False)

    uploaded_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    expires_at = db.Column(db.DateTime, nullable=False)

    download_count = db.Column(db.Integer, default=0)
