"""Tests for /api/v1/imports/* endpoints."""
import io
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_csv_file(content: str, filename: str = "test.csv"):
    """Return a dict suitable for multipart file upload."""
    return {"file": (filename, io.BytesIO(content.encode("utf-8")), "text/csv")}


VALID_INSTITUTION_CSV = "canonical_name,state,institution_type\nAlpha Engineering College,Maharashtra,college\n"
VALID_CASE_CSV = "title,category,institution_id\n"  # institution_id filled dynamically


# ---------------------------------------------------------------------------
# List import jobs
# ---------------------------------------------------------------------------

def test_imports_list(client, admin_headers):
    """GET /imports/ returns 200 with a list (may be empty)."""
    resp = client.get("/api/v1/imports/", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_preview_or_list_accessible(client, admin_headers):
    """GET /imports/ with admin auth returns 200."""
    resp = client.get("/api/v1/imports/", headers=admin_headers)
    assert resp.status_code == 200


def test_imports_requires_auth(client):
    """GET /imports/ without auth returns 401 or 403."""
    resp = client.get("/api/v1/imports/")
    assert resp.status_code in (401, 403)


def test_imports_requires_admin_not_officer(client, officer_headers):
    """A plain bureau_officer cannot access /imports/ — expects 403."""
    resp = client.get("/api/v1/imports/", headers=officer_headers)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Institution CSV preview
# ---------------------------------------------------------------------------

def test_institution_preview_valid_csv(client, admin_headers):
    """POST /imports/institutions/preview with a valid CSV returns 200 with job_id."""
    resp = client.post(
        "/api/v1/imports/institutions/preview",
        files=_make_csv_file(VALID_INSTITUTION_CSV),
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "job_id" in body
    assert "valid_rows" in body
    assert body["valid_rows"] >= 1


def test_institution_preview_not_csv(client, admin_headers):
    """Uploading a non-CSV file returns 422."""
    files = {"file": ("data.txt", io.BytesIO(b"some text data"), "text/plain")}
    resp = client.post(
        "/api/v1/imports/institutions/preview",
        files=files,
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_institution_preview_empty_csv(client, admin_headers):
    """Uploading an empty CSV returns 422."""
    resp = client.post(
        "/api/v1/imports/institutions/preview",
        files=_make_csv_file("", "empty.csv"),
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_institution_preview_missing_name(client, admin_headers):
    """A CSV row missing canonical_name is flagged as an error row."""
    csv_content = "canonical_name,state\n,Maharashtra\n"
    resp = client.post(
        "/api/v1/imports/institutions/preview",
        files=_make_csv_file(csv_content),
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    # The row with empty canonical_name should be flagged
    assert body["error_rows"] >= 1


def test_institution_preview_requires_auth(client):
    """Institution preview without auth returns 401 or 403."""
    resp = client.post(
        "/api/v1/imports/institutions/preview",
        files=_make_csv_file(VALID_INSTITUTION_CSV),
    )
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Cases CSV preview
# ---------------------------------------------------------------------------

def test_case_preview_valid_csv(client, admin_headers, institution):
    """POST /imports/cases/preview with a valid CSV returns 200 with job_id."""
    csv_content = f"title,category,institution_id\nTest Case Title,Fee Dispute,{institution.id}\n"
    resp = client.post(
        "/api/v1/imports/cases/preview",
        files=_make_csv_file(csv_content),
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "job_id" in body
    assert body["valid_rows"] >= 1


def test_case_preview_invalid_institution(client, admin_headers):
    """A case row with a non-existent institution_id is flagged as an error row."""
    csv_content = "title,category,institution_id\nOrphan Case,Grievance,99999\n"
    resp = client.post(
        "/api/v1/imports/cases/preview",
        files=_make_csv_file(csv_content),
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["error_rows"] >= 1


# ---------------------------------------------------------------------------
# Institution CSV commit
# ---------------------------------------------------------------------------

def test_institution_commit_after_preview(client, admin_headers):
    """Preview then commit an institution CSV job — returns imported count."""
    # Step 1: preview
    csv_content = "canonical_name,state\nCommit Test College,Rajasthan\n"
    preview_resp = client.post(
        "/api/v1/imports/institutions/preview",
        files=_make_csv_file(csv_content),
        headers=admin_headers,
    )
    assert preview_resp.status_code == 200
    job_id = preview_resp.json()["job_id"]

    # Step 2: commit
    commit_resp = client.post(
        f"/api/v1/imports/institutions/commit/{job_id}",
        headers=admin_headers,
    )
    assert commit_resp.status_code == 200
    body = commit_resp.json()
    assert "imported" in body
    assert body["imported"] >= 1


def test_commit_nonexistent_job(client, admin_headers):
    """Committing a non-existent job returns 404."""
    resp = client.post(
        "/api/v1/imports/institutions/commit/99999",
        headers=admin_headers,
    )
    assert resp.status_code == 404
