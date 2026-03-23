import os

import dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app():
    dotenv.load_dotenv()

    app = Flask(__name__, static_folder="../frontend", static_url_path="/")

    app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), "uploads")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")

    db.init_app(app)
    with app.app_context():
        from . import models  # noqa

        db.create_all()

    from .routes import api_bp

    app.register_blueprint(api_bp)
    return app
