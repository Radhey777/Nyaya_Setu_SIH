"""Tests for /api/v1/relationships/* endpoints."""
import pytest
from app.models.relationship import CaseRelationship, RelationshipType, ReviewStatus
from app.models.case import Case, CaseStatus, CasePriority


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_case_in_db(db, institution, admin_user, title="Case A"):
    """Directly insert a case into the DB (bypasses HTTP for fixture speed)."""
    from sqlalchemy import func
    year = 2026
    count = db.query(func.count(Case.id)).scalar() or 0
    case = Case(
        case_number=f"AICTE-C3-{year}-{count + 1:05d}",
        title=title,
        category="Fee Dispute",
        institution_id=institution.id,
        status=CaseStatus.RECEIVED,
        priority=CasePriority.MEDIUM,
        is_active=True,
        created_by_id=admin_user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return case


def _create_relationship_in_db(db, case_a, case_b):
    """Directly insert a pending relationship into the DB."""
    rel = CaseRelationship(
        case_a_id=case_a.id,
        case_b_id=case_b.id,
        relationship_type=RelationshipType.RELATED_COMPLAINT,
        score=0.75,
        review_status=ReviewStatus.PENDING,
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)
    return rel


# ---------------------------------------------------------------------------
# List relationships
# ---------------------------------------------------------------------------

def test_relationship_list(client, admin_headers, db, institution, admin_user):
    """GET /relationships/ returns 200 with items and total."""
    # Create a pair of cases and a relationship so the list isn't empty
    case_a = _create_case_in_db(db, institution, admin_user, "Relationship Test Case A")
    case_b = _create_case_in_db(db, institution, admin_user, "Relationship Test Case B")
    _create_relationship_in_db(db, case_a, case_b)

    resp = client.get("/api/v1/relationships/", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    assert isinstance(body["items"], list)


def test_relationship_list_requires_auth(client):
    """GET /relationships/ without auth returns 401 or 403."""
    resp = client.get("/api/v1/relationships/")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Detect relationships
# ---------------------------------------------------------------------------

def test_detect_trigger(client, admin_headers, db, institution, admin_user):
    """POST /relationships/detect/{case_id} with a valid case returns 200 with candidates_found."""
    case = _create_case_in_db(db, institution, admin_user, "Detect Trigger Case")
    resp = client.post(f"/api/v1/relationships/detect/{case.id}", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "candidates_found" in body


def test_detect_invalid_case(client, admin_headers):
    """POST /relationships/detect/99999 returns 404."""
    resp = client.post("/api/v1/relationships/detect/99999", headers=admin_headers)
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Review relationships
# ---------------------------------------------------------------------------

def test_review_requires_valid_decision(client, reviewer_headers, db, institution, admin_user):
    """POST /relationships/{id}/review with an invalid decision returns 422."""
    case_a = _create_case_in_db(db, institution, admin_user, "Review Invalid A")
    case_b = _create_case_in_db(db, institution, admin_user, "Review Invalid B")
    rel = _create_relationship_in_db(db, case_a, case_b)

    resp = client.post(
        f"/api/v1/relationships/{rel.id}/review",
        json={"decision": "not_a_valid_decision", "rationale": "test"},
        headers=reviewer_headers,
    )
    assert resp.status_code == 422


def test_review_valid_confirmed(client, reviewer_headers, db, institution, admin_user):
    """POST /relationships/{id}/review with decision=confirmed returns 200."""
    case_a = _create_case_in_db(db, institution, admin_user, "Review Valid A")
    case_b = _create_case_in_db(db, institution, admin_user, "Review Valid B")
    rel = _create_relationship_in_db(db, case_a, case_b)

    resp = client.post(
        f"/api/v1/relationships/{rel.id}/review",
        json={"decision": "confirmed", "rationale": "Both cases involve same institution complaint"},
        headers=reviewer_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["decision"] == "confirmed"


def test_review_valid_rejected(client, reviewer_headers, db, institution, admin_user):
    """POST /relationships/{id}/review with decision=rejected returns 200."""
    case_a = _create_case_in_db(db, institution, admin_user, "Review Reject A")
    case_b = _create_case_in_db(db, institution, admin_user, "Review Reject B")
    rel = _create_relationship_in_db(db, case_a, case_b)

    resp = client.post(
        f"/api/v1/relationships/{rel.id}/review",
        json={"decision": "rejected", "rationale": "Cases are unrelated"},
        headers=reviewer_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["decision"] == "rejected"


def test_review_requires_reviewer_role(client, officer_headers, db, institution, admin_user):
    """A bureau_officer cannot review relationships — expects 403."""
    case_a = _create_case_in_db(db, institution, admin_user, "Review Role A")
    case_b = _create_case_in_db(db, institution, admin_user, "Review Role B")
    rel = _create_relationship_in_db(db, case_a, case_b)

    resp = client.post(
        f"/api/v1/relationships/{rel.id}/review",
        json={"decision": "confirmed", "rationale": "Trying without right role"},
        headers=officer_headers,
    )
    assert resp.status_code == 403


def test_review_nonexistent_relationship(client, reviewer_headers):
    """POST /relationships/99999/review returns 404."""
    resp = client.post(
        "/api/v1/relationships/99999/review",
        json={"decision": "confirmed", "rationale": "Should not exist"},
        headers=reviewer_headers,
    )
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Review inbox
# ---------------------------------------------------------------------------

def test_review_inbox_accessible(client, admin_headers):
    """GET /relationships/inbox returns 200 with items and total."""
    resp = client.get("/api/v1/relationships/inbox", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
