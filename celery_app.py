import os

from celery import Celery
from celery.schedules import crontab

from app import create_app

# 1. Spin up a Flask app context for Celery
flask_app = create_app()

# 2. Instantiate the Celery engine
celery = Celery(
    flask_app.import_name,
    broker=os.environ.get("CELERY_BROKER_URL", "redis://redis:6379/0"),
)
celery.conf.update(flask_app.config)

# 3. Tell Celery Beat to run our cleanup task at the top of every hour!
celery.conf.beat_schedule = {
    "cleanup-every-hour": {
        "task": "app.tasks.cleanup_expired_files",
        "schedule": crontab(minute=0),  # 0 minutes past the hour
    },
}

# 4. Import tasks so the worker discovers them
import app.tasks  # noqa
