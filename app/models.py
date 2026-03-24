import uuid

from . import db


class File(db.Model):
    __tablename__ = "files"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_filename = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    storage_path = db.Column(db.String(255), nullable=False)
