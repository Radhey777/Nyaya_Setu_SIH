"""Tests for /api/v1/undertakings/* endpoints."""
import pytest
from datetime import datetime, timezone, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_undertaking(client, token, institution_id, due_days=30):
    headers = {"Authorization": f"Bearer {token}"}
    due_date = (datetime.now(timezone.utc) + timedelta(days=due_days)).isoformat()
    payload = {
        "institution_id": institution_id,
        "undertaking_type": "Faculty Compliance",
        "description": "Ensure all faculty qualifications are verified.",
        "due_date": due_date,
    }
    return client.post("/api/v1/undertakings/", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_create_undertaking(client, admin_token, institution):
    """POST /undertakings/ returns 201."""
    resp = _create_undertaking(client, admin_token, institution.id)
    assert resp.status_code == 201
    body = resp.json()
    assert body["institution_id"] == institution.id
    assert body["status"] == "active"
    assert body["undertaking_type"] == "Faculty Compliance"


def test_submit_undertaking(client, admin_token, institution):
    """POST /undertakings/{id}/submit sets status=submitted and submitted_at."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_resp = _create_undertaking(client, admin_token, institution.id)
    assert create_resp.status_code == 201
    ut_id = create_resp.json()["id"]

    submit = client.post(
        f"/api/v1/undertakings/{ut_id}/submit",
        json={"notes": "Submitted with all documents"},
        headers=headers,
    )
    assert submit.status_code == 200
    body = submit.json()
    assert body["status"] == "submitted"
    assert body["submitted_at"] is not None


def test_verify_undertaking(client, admin_token, institution):
    """POST /undertakings/{id}/verify sets status=verified."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_resp = _create_undertaking(client, admin_token, institution.id)
    assert create_resp.status_code == 201
    ut_id = create_resp.json()["id"]

    # Submit first
    client.post(
        f"/api/v1/undertakings/{ut_id}/submit",
        json={"notes": ""},
        headers=headers,
    )

    # Verify
    verify = client.post(
        f"/api/v1/undertakings/{ut_id}/verify",
        headers=headers,
    )
    assert verify.status_code == 200
    assert verify.json()["status"] == "verified"


def test_return_undertaking_requires_reason(client, admin_token, institution):
    """POST /undertakings/{id}/return with empty reason returns 422."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_resp = _create_undertaking(client, admin_token, institution.id)
    assert create_resp.status_code == 201
    ut_id = create_resp.json()["id"]

    ret = client.post(
        f"/api/v1/undertakings/{ut_id}/return",
        json={"reason": ""},
        headers=headers,
    )
    assert ret.status_code == 422


def test_overdue_filter(client, admin_token, institution):
    """GET /undertakings/?overdue=true returns undertakings with past due_date."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Create an overdue undertaking (due 10 days ago)
    create_resp = _create_undertaking(client, admin_token, institution.id, due_days=-10)
    assert create_resp.status_code == 201
    ut_id = create_resp.json()["id"]

    list_resp = client.get("/api/v1/undertakings/?overdue=true", headers=headers)
    assert list_resp.status_code == 200
    ids = [item["id"] for item in list_resp.json()]
    assert ut_id in ids
