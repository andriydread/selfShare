import os
from datetime import datetime, timezone

from celery import shared_task

from . import create_app, db
from .models import File


@shared_task
def cleanup_expired_files():
    app = create_app()
    with app.app_context():
        now = datetime.now(timezone.utc)
        expired_files = File.query.filter(File.expires_at < now).all()
        for expired_file in expired_files:
            try:
                os.remove(expired_file.storage_path)
            except FileNotFoundError:
                pass

            db.session.delete(expired_file)

        db.session.commit()
