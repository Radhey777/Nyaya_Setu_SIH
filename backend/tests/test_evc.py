"""Tests for /api/v1/evc/* endpoints."""
import pytest
from datetime import datetime, timezone, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_application(client, token, institution_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "institution_id": institution_id,
        "application_type": "program_approval",
        "region": "South",
        "applied_year": 2024,
    }
    resp = client.post("/api/v1/applications/", json=payload, headers=headers)
    assert resp.status_code == 201
    return resp.json()["id"]


def _create_evc(client, token, application_id, institution_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "application_id": application_id,
        "institution_id": institution_id,
    }
    resp = client.post("/api/v1/evc/", json=payload, headers=headers)
    return resp


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_create_evc_task(client, admin_token, institution):
    """POST /evc/ returns 201 with status=pending."""
    app_id = _create_application(client, admin_token, institution.id)
    resp = _create_evc(client, admin_token, app_id, institution.id)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "pending"
    assert body["application_id"] == app_id
    assert body["institution_id"] == institution.id


def test_schedule_evc(client, admin_token, institution):
    """POST /evc/{id}/schedule sets status=scheduled."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    app_id = _create_application(client, admin_token, institution.id)
    evc_resp = _create_evc(client, admin_token, app_id, institution.id)
    assert evc_resp.status_code == 201
    evc_id = evc_resp.json()["id"]

    scheduled_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    sched = client.post(
        f"/api/v1/evc/{evc_id}/schedule",
        json={"scheduled_date": scheduled_date},
        headers=headers,
    )
    assert sched.status_code == 200
    assert sched.json()["status"] == "scheduled"


def test_complete_evc(client, admin_token, institution):
    """POST /evc/{id}/complete sets status=completed."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    app_id = _create_application(client, admin_token, institution.id)
    evc_resp = _create_evc(client, admin_token, app_id, institution.id)
    assert evc_resp.status_code == 201
    evc_id = evc_resp.json()["id"]

    # Schedule first
    scheduled_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    client.post(
        f"/api/v1/evc/{evc_id}/schedule",
        json={"scheduled_date": scheduled_date},
        headers=headers,
    )

    # Complete
    completed_date = datetime.now(timezone.utc).isoformat()
    complete = client.post(
        f"/api/v1/evc/{evc_id}/complete",
        json={
            "completed_date": completed_date,
            "outcome": "Satisfactory",
            "visit_report_summary": "All facilities in order.",
        },
        headers=headers,
    )
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"


def test_reschedule_evc_requires_reason(client, admin_token, institution):
    """POST /evc/{id}/reschedule without reason returns 422."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    app_id = _create_application(client, admin_token, institution.id)
    evc_resp = _create_evc(client, admin_token, app_id, institution.id)
    assert evc_resp.status_code == 201
    evc_id = evc_resp.json()["id"]

    scheduled_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    client.post(
        f"/api/v1/evc/{evc_id}/schedule",
        json={"scheduled_date": scheduled_date},
        headers=headers,
    )

    new_date = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    resp = client.post(
        f"/api/v1/evc/{evc_id}/reschedule",
        json={"new_scheduled_date": new_date, "reason": ""},
        headers=headers,
    )
    assert resp.status_code == 422


def test_reschedule_preserves_original_date(client, admin_token, institution):
    """Reschedule sets rescheduled_from == original scheduled_date."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    app_id = _create_application(client, admin_token, institution.id)
    evc_resp = _create_evc(client, admin_token, app_id, institution.id)
    assert evc_resp.status_code == 201
    evc_id = evc_resp.json()["id"]

    original_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    sched = client.post(
        f"/api/v1/evc/{evc_id}/schedule",
        json={"scheduled_date": original_date},
        headers=headers,
    )
    assert sched.status_code == 200
    returned_scheduled = sched.json()["scheduled_date"]

    new_date = (datetime.now(timezone.utc) + timedelta(days=21)).isoformat()
    resch = client.post(
        f"/api/v1/evc/{evc_id}/reschedule",
        json={"new_scheduled_date": new_date, "reason": "Expert unavailable"},
        headers=headers,
    )
    assert resch.status_code == 200
    body = resch.json()
    assert body["status"] == "rescheduled"
    # rescheduled_from should match the original scheduled_date
    assert body["rescheduled_from"] is not None
