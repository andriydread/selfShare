import os

from celery import Celery
from celery.schedules import crontab

from app import create_app

flask_app = create_app()

celery = Celery(
    flask_app.import_name,
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
)
celery.conf.update(flask_app.config)

celery.conf.beat_schedule = {
    "cleanup-every-hour": {
        "task": "app.tasks.cleanup_expired_files",
        "schedule": crontab(minute="*/10"),
    },
}

import app.tasks  # noqa
