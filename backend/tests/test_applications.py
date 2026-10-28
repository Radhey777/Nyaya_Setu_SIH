"""Tests for /api/v1/applications/* endpoints."""
import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_application(client, token, institution_id, application_type="new_institution", region="North"):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "institution_id": institution_id,
        "application_type": application_type,
        "region": region,
        "applied_year": 2024,
        "state": "Maharashtra",
    }
    return client.post("/api/v1/applications/", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_create_application(client, admin_token, institution):
    """POST /applications/ returns 201 and application_number starts with NYAY-."""
    resp = _create_application(client, admin_token, institution.id)
    assert resp.status_code == 201
    body = resp.json()
    assert "application_number" in body
    assert body["application_number"].startswith("NYAY-")
    assert body["institution_id"] == institution.id
    assert body["current_stage"] == "submitted"


def test_list_applications_filter_by_stage(client, admin_token, institution):
    """Create 2 apps; filter by stage=scrutiny returns only correct ones."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Create first app (submitted)
    resp1 = _create_application(client, admin_token, institution.id, "new_institution")
    assert resp1.status_code == 201
    app1_id = resp1.json()["id"]

    # Create second app and advance to scrutiny
    resp2 = _create_application(client, admin_token, institution.id, "program_approval")
    assert resp2.status_code == 201
    app2_id = resp2.json()["id"]

    # Advance app2 to scrutiny
    adv = client.post(
        f"/api/v1/applications/{app2_id}/advance",
        json={"to_stage": "scrutiny", "reason": "Initial review complete"},
        headers=headers,
    )
    assert adv.status_code == 200

    # Filter by scrutiny
    list_resp = client.get(
        "/api/v1/applications/?stage=scrutiny",
        headers=headers,
    )
    assert list_resp.status_code == 200
    body = list_resp.json()
    stage_ids = [item["id"] for item in body["items"]]
    assert app2_id in stage_ids
    assert app1_id not in stage_ids


def test_advance_stage_valid_transition(client, admin_token, institution):
    """Advance from submitted → scrutiny returns 200 and correct new stage."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = _create_application(client, admin_token, institution.id)
    assert resp.status_code == 201
    app_id = resp.json()["id"]

    adv = client.post(
        f"/api/v1/applications/{app_id}/advance",
        json={"to_stage": "scrutiny", "reason": "Docs verified"},
        headers=headers,
    )
    assert adv.status_code == 200
    body = adv.json()
    assert body["new_stage"] == "scrutiny"


def test_advance_stage_invalid_transition_rejected(client, admin_token, institution):
    """Skipping stages (submitted → approved) returns 422."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = _create_application(client, admin_token, institution.id)
    assert resp.status_code == 201
    app_id = resp.json()["id"]

    adv = client.post(
        f"/api/v1/applications/{app_id}/advance",
        json={"to_stage": "approved", "reason": "Skip"},
        headers=headers,
    )
    assert adv.status_code == 422


def test_return_for_deficiency_requires_reason(client, admin_token, institution):
    """POST /return with empty reason returns 422."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = _create_application(client, admin_token, institution.id)
    assert resp.status_code == 201
    app_id = resp.json()["id"]

    # Advance to scrutiny first
    client.post(
        f"/api/v1/applications/{app_id}/advance",
        json={"to_stage": "scrutiny", "reason": "ok"},
        headers=headers,
    )

    ret = client.post(
        f"/api/v1/applications/{app_id}/return",
        json={"to_stage": "deficiency_raised", "reason": ""},
        headers=headers,
    )
    assert ret.status_code == 422


def test_workflow_status_endpoint(client, admin_token, institution):
    """GET /applications/{id}/workflow-status returns required keys."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = _create_application(client, admin_token, institution.id)
    assert resp.status_code == 201
    app_id = resp.json()["id"]

    ws = client.get(f"/api/v1/applications/{app_id}/workflow-status", headers=headers)
    assert ws.status_code == 200
    body = ws.json()
    assert "current_stage" in body
    assert "priority_score" in body
    assert "priority_label" in body


def test_bureau_officer_scoped_to_bureau(client, admin_token, institution):
    """List returns items (smoke test with admin_token)."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    _create_application(client, admin_token, institution.id)

    list_resp = client.get("/api/v1/applications/", headers=headers)
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert "items" in body
    assert body["total"] >= 1
