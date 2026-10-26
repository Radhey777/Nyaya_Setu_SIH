"""Tests for /api/v1/cases/* endpoints."""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_case(client, headers, institution_id, bureau_id=None, **extra):
    payload = {
        "title": "Test Complaint",
        "category": "Fee Refund",
        "institution_id": institution_id,
    }
    if bureau_id is not None:
        payload["bureau_id"] = bureau_id
    payload.update(extra)
    return client.post("/api/v1/cases/", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Create cases
# ---------------------------------------------------------------------------

def test_create_case_valid(client, admin_headers, institution):
    """Creating a case with a valid institution returns 201 with a case_number."""
    resp = _create_case(client, admin_headers, institution.id)
    assert resp.status_code == 201
    body = resp.json()
    assert "case_number" in body
    assert body["case_number"].startswith("AICTE-C3-")
    assert body["institution_id"] == institution.id


def test_create_case_invalid_institution(client, admin_headers):
    """Creating a case with a non-existent institution returns 404."""
    resp = _create_case(client, admin_headers, institution_id=99999)
    assert resp.status_code == 404


def test_create_case_requires_auth(client, institution):
    """Creating a case without authentication returns 401 or 403."""
    resp = _create_case(client, {}, institution.id)
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

def test_valid_status_transition(client, admin_headers, institution):
    """Transitioning RECEIVED → TRIAGED with a reason returns 200."""
    # Create the case first
    create_resp = _create_case(client, admin_headers, institution.id)
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    resp = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"new_status": "triaged", "reason": "Initial triage complete"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["old_status"] == "received"
    assert body["new_status"] == "triaged"


def test_invalid_status_transition_bad_value(client, admin_headers, institution):
    """Supplying a completely invalid status string returns 422."""
    create_resp = _create_case(client, admin_headers, institution.id)
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    resp = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"new_status": "not_a_real_status_xyz", "reason": "Testing"},
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_invalid_status_transition_skipped_step(client, admin_headers, institution):
    """Transitioning RECEIVED → DISPOSED (skipping steps) returns 422."""
    create_resp = _create_case(client, admin_headers, institution.id)
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    resp = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"new_status": "disposed", "reason": "Skipping workflow"},
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_status_change_requires_reason(client, admin_headers, institution):
    """Status change without a reason returns 422."""
    create_resp = _create_case(client, admin_headers, institution.id)
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    resp = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"new_status": "triaged", "reason": ""},
        headers=admin_headers,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List cases
# ---------------------------------------------------------------------------

def test_case_list_returns_results(client, admin_headers, institution):
    """GET /cases/ returns 200 with items list and total."""
    # Create at least one case so the list is non-empty
    _create_case(client, admin_headers, institution.id)
    resp = client.get("/api/v1/cases/", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert isinstance(body["items"], list)


def test_bureau_officer_scope(client, officer_headers):
    """Bureau officer gets 200 with items key present (scoped to own bureau)."""
    resp = client.get("/api/v1/cases/", headers=officer_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body


def test_case_list_requires_auth(client):
    """GET /cases/ without auth returns 401 or 403."""
    resp = client.get("/api/v1/cases/")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Get single case
# ---------------------------------------------------------------------------

def test_get_case_by_id(client, admin_headers, institution):
    """GET /cases/{id} returns the case detail."""
    create_resp = _create_case(client, admin_headers, institution.id)
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    resp = client.get(f"/api/v1/cases/{case_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == case_id


def test_get_case_not_found(client, admin_headers):
    """GET /cases/99999 returns 404."""
    resp = client.get("/api/v1/cases/99999", headers=admin_headers)
    assert resp.status_code == 404
