"""Tests for /api/v1/documents/* endpoints."""
import pytest
from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register_document(client, token, institution_id, valid_until=None, is_expired=False):
    headers = {"Authorization": f"Bearer {token}"}
    if valid_until is None:
        valid_until = (date.today() + timedelta(days=365)).isoformat()
    payload = {
        "institution_id": institution_id,
        "category": "lease",
        "document_name": "Lease Agreement 2024",
        "valid_until": valid_until,
        "is_expired": is_expired,
    }
    return client.post("/api/v1/documents/", json=payload, headers=headers)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_register_document(client, admin_token, institution):
    """POST /documents/ returns 201 with correct fields."""
    resp = _register_document(client, admin_token, institution.id)
    assert resp.status_code == 201
    body = resp.json()
    assert body["institution_id"] == institution.id
    assert body["category"] == "lease"
    assert body["document_name"] == "Lease Agreement 2024"


def test_renew_document(client, admin_token, institution):
    """POST /documents/{id}/renew updates valid_until and clears is_expired."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Register with past valid_until
    past_date = (date.today() - timedelta(days=30)).isoformat()
    create_resp = _register_document(client, admin_token, institution.id, valid_until=past_date, is_expired=True)
    assert create_resp.status_code == 201
    doc_id = create_resp.json()["id"]

    new_date = (date.today() + timedelta(days=365)).isoformat()
    renew = client.post(
        f"/api/v1/documents/{doc_id}/renew",
        json={"valid_until": new_date},
        headers=headers,
    )
    assert renew.status_code == 200
    body = renew.json()
    assert body["is_expired"] == False
    assert body["valid_until"] == new_date


def test_verify_document(client, admin_token, institution):
    """POST /documents/{id}/verify sets verified=True."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    create_resp = _register_document(client, admin_token, institution.id)
    assert create_resp.status_code == 201
    doc_id = create_resp.json()["id"]

    verify = client.post(
        f"/api/v1/documents/{doc_id}/verify",
        headers=headers,
    )
    assert verify.status_code == 200
    assert verify.json()["verified"] == True


def test_expired_filter(client, admin_token, institution):
    """GET /documents/?expired=true returns expired documents."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    past_date = (date.today() - timedelta(days=30)).isoformat()
    create_resp = _register_document(
        client, admin_token, institution.id, valid_until=past_date, is_expired=True
    )
    assert create_resp.status_code == 201
    doc_id = create_resp.json()["id"]

    list_resp = client.get("/api/v1/documents/?expired=true", headers=headers)
    assert list_resp.status_code == 200
    ids = [item["id"] for item in list_resp.json()]
    assert doc_id in ids
