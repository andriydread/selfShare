from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__, url_prefix="/api/v1")


@api_bp.route("/files", methods=["POST"])
def upload_file():
    return jsonify({"message": "Upload endpoint hit!"}), 201
