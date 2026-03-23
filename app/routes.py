import os
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, Response, current_app, jsonify, request
from werkzeug.utils import secure_filename

from . import db
from .models import File

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")


def require_jwt(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Missing Authorization header"}), 401

        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return jsonify({"error": "Invalid Authorization header format"}), 401

        try:
            # We use the secret password from our .env file to verify the signature
            secret = os.environ.get("JWT_SECRET", "super_secret_fallback")
            jwt.decode(token, secret, algorithms=["HS256"])

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated


@api_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if data.get("password") == os.environ.get("ADMIN_PASSWORD"):
        token = jwt.encode(
            {"user": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
            os.environ.get("JWT_SECRET"),
            algorithm="HS256",
        )
        return jsonify({"token": token}), 200
    else:
        return jsonify({"error": "Unauthorized"}), 401


@api_bp.route("/files", methods=["POST"])
@require_jwt
def upload_file():

    if "file" in request.files:
        uploaded_file = request.files["file"]

        if uploaded_file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        file_id = str(uuid.uuid4())
        save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], file_id)
        uploaded_file.save(save_path)
        expires = datetime.now(timezone.utc) + timedelta(hours=24)

        new_file = File(
            id=file_id,
            original_filename=secure_filename(uploaded_file.filename),
            storage_path=save_path,
            expires_at=expires,
        )
        db.session.add(new_file)
        db.session.commit()

        return jsonify({"success": "File saved", "file_id": file_id}), 201

    else:
        return jsonify({"error": "No file provided"}), 400


@api_bp.route("/files/<file_id>", methods=["GET"])
def download_file(file_id):
    file_record = db.session.get(File, file_id)
    if not file_record:
        return jsonify({"error": "No file provided"}), 404

    def generate():
        with open(file_record.storage_path, "rb") as f:
            while True:
                chunk = f.read(4096)
                if not chunk:
                    break
                else:
                    yield chunk

    response = Response(generate(), mimetype="application/octet-stream")
    response.headers["Content-Disposition"] = (
        f"attachment; filename={file_record.original_filename}"
    )
    return response
