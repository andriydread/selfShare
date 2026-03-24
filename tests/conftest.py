import os
import shutil

import pytest

from app import create_app, db


@pytest.fixture
def app():
    # Password for testAdmin
    os.environ["ADMIN_PASSWORD"] = "test_password"
    os.environ["JWT_SECRET"] = (
        "test_secret_and_extra_words_so_i_dont_get_warning_every_time"
    )

    # Temporary test DB
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"

    app = create_app()
    app.config.update(
        {
            "TESTING": True,
        }
    )

    # Create test DB
    with app.app_context():
        db.create_all()

        yield app

        db.drop_all()

        upload_dir = app.config.get("UPLOAD_FOLDER")
        if os.path.exists(upload_dir):
            shutil.rmtree(upload_dir)


@pytest.fixture
def client(app):
    return app.test_client()
