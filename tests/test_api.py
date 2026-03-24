import io

from app import db
from app.models import File


# BAD LOGIN test
def test_login_failure(client):
    payload = {"password": "wrong_password"}

    response = client.post("/api/v1/login", json=payload)

    assert response.status_code == 401
    assert "error" in response.get_json()


# GOOD LOGIN test
def test_login_success(client):
    payload = {"password": "test_password"}

    response = client.post("/api/v1/login", json=payload)

    assert response.status_code == 200
    assert "token" in response.get_json()


# Assess dashboard without JWT token test
def test_protected_route_without_token(client):
    response = client.get("/api/v1/files")

    assert response.status_code == 401
    assert response.get_json()["error"] == "Missing Authorization header"


# Upload file test
def test_upload_file_success(client, app):
    login_response = client.post("/api/v1/login", json={"password": "test_password"})
    token = login_response.get_json()["token"]

    data = {
        "file": (io.BytesIO(b"Upload test file"), "test_upload.txt"),
        "description": "Upload test file",
    }

    response = client.post(
        "/api/v1/files",
        data=data,
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    assert "file_id" in response.get_json()

    with app.app_context():
        saved_file = db.session.get(File, response.get_json()["file_id"])
        assert saved_file is not None
        assert saved_file.original_filename == "test_upload.txt"
        assert saved_file.description == "Upload test file"


# Delete file test
def test_delete_file_success(client, app):
    login_response = client.post("/api/v1/login", json={"password": "test_password"})
    token = login_response.get_json()["token"]

    upload_response = client.post(
        "/api/v1/files",
        data={"file": (io.BytesIO(b"Delete test file"), "test_delete.txt")},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )
    file_id = upload_response.get_json()["file_id"]

    delete_response = client.delete(
        f"/api/v1/files/{file_id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert delete_response.status_code == 200

    with app.app_context():
        deleted_file = db.session.get(File, file_id)
        assert deleted_file is None
