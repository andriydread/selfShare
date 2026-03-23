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
            # Fallback prevents 500 crashes if .env is missing
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

    return jsonify({"error": "Unauthorized"}), 401


@api_bp.route("/files", methods=["GET"])
@require_jwt
def view_files():
    all_files = File.query.all()
    list_of_files = [
        {
            "id": x.id,
            "original_filename": x.original_filename,
            "download_count": x.download_count,
            "expires_at": x.expires_at.isoformat() if x.expires_at else None,
            "description": x.description,
        }
        for x in all_files
    ]
    return jsonify(list_of_files), 200


@api_bp.route("/files", methods=["POST"])
@require_jwt
def upload_file():
    # Guard Clauses: Return early if invalid, prevents deep nesting
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    file_id = str(uuid.uuid4())
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], file_id)
    uploaded_file.save(save_path)

    hours_str = request.form.get("expires_in_hours")
    expires = None

    if hours_str:
        try:
            hours = int(hours_str)
            if hours <= 0:
                return jsonify({"error": "Hours must be greater than 0"}), 400
            expires = datetime.now(timezone.utc) + timedelta(hours=hours)
        except ValueError:
            # Catch ValueError because HTTP form data is always a string
            return jsonify({"error": "expires_in_hours must be a valid integer"}), 400

    new_file = File(
        id=file_id,
        description=request.form.get("description"),
        original_filename=secure_filename(uploaded_file.filename),
        storage_path=save_path,
        expires_at=expires,
    )
    db.session.add(new_file)
    db.session.commit()

    return jsonify({"success": "File saved", "file_id": file_id}), 201


@api_bp.route("/files/<file_id>", methods=["GET"])
def download_file(file_id):
    file_record = db.session.get(File, file_id)
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    def generate():
        with open(file_record.storage_path, "rb") as f:
            while True:
                chunk = f.read(4096)
                if not chunk:
                    break
                yield chunk

    response = Response(generate(), mimetype="application/octet-stream")
    # Wrap filename in quotes in case it contains spaces
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{file_record.original_filename}"'
    )
    return response


@api_bp.route("/files/<file_id>", methods=["PATCH"])
@require_jwt
def edit_file(file_id):
    file_record = db.session.get(File, file_id)
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    data = request.get_json()
    if "description" in data:
        file_record.description = data["description"]

    if "expires_in_hours" in data:
        hours = data["expires_in_hours"]
        if isinstance(hours, int) and hours > 0:
            file_record.expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        elif hours is None:
            file_record.expires_at = None
        else:
            return jsonify({"error": "Invalid hours"}), 400

    db.session.commit()
    return jsonify({"success": "File updated successfully"}), 200


@api_bp.route("/files/<file_id>", methods=["DELETE"])
@require_jwt
def delete_file(file_id):
    file_record = db.session.get(File, file_id)
    if not file_record:
        return jsonify({"error": "File not found"}), 404

    try:
        os.remove(file_record.storage_path)
    except FileNotFoundError:
        pass

    db.session.delete(file_record)
    db.session.commit()

    return jsonify({"success": "File was deleted"}), 200
