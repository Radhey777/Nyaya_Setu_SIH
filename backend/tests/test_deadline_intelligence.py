"""Tests for /api/v1/deadline-intelligence/* endpoints."""
import pytest
from datetime import datetime, timezone, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_undertaking(client, token, institution_id, due_days=-5):
    headers = {"Authorization": f"Bearer {token}"}
    due_date = (datetime.now(timezone.utc) + timedelta(days=due_days)).isoformat()
    payload = {
        "institution_id": institution_id,
        "undertaking_type": "Compliance Report",
        "description": "Submit compliance report.",
        "due_date": due_date,
    }
    return client.post("/api/v1/undertakings/", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_action_queue_returns_list(client, admin_token):
    """GET /deadline-intelligence/action-queue returns required keys."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/v1/deadline-intelligence/action-queue", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert "generated_at" in body
    assert "data_note" in body


def test_overdue_item_has_high_priority(client, admin_token, institution):
    """An overdue undertaking should appear as HIGH or CRITICAL priority."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Create undertaking due 15 days ago
    create_resp = _create_undertaking(client, admin_token, institution.id, due_days=-15)
    assert create_resp.status_code == 201

    resp = client.get("/api/v1/deadline-intelligence/action-queue", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    priority_labels = [item["priority_label"] for item in items]
    assert any(label in ("CRITICAL", "HIGH") for label in priority_labels)


def test_limit_param(client, admin_token):
    """GET /deadline-intelligence/action-queue?limit=2 returns at most 2 items."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = client.get("/api/v1/deadline-intelligence/action-queue?limit=2", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) <= 2
