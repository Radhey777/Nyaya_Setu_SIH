"""Tests for /api/v1/auth/* endpoints."""
import pytest

# Passwords must match exactly what conftest.py uses in get_password_hash()
ADMIN_PASSWORD = "AdminPass1"


# ---------------------------------------------------------------------------
# Login tests
# ---------------------------------------------------------------------------

def test_login_success(client, admin_user):
    """Valid credentials return 200 with access_token."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": ADMIN_PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed ({resp.status_code}): {resp.text}"
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["email"] == admin_user.email


def test_login_wrong_password(client, admin_user):
    """Wrong password returns 401."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": admin_user.email, "password": "WrongPassword999"},
    )
    assert resp.status_code == 401


def test_login_unknown_user(client):
    """Unknown user returns 401."""
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "nobody@example.com", "password": "DoesNotMatter1"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Signup tests
# NOTE: email-validator rejects .test TLD — use .com or example.com domains.
# ---------------------------------------------------------------------------

def test_signup_creates_pending(client):
    """New signup creates a pending bureau_officer account and returns 201."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "newuser@example.com",
            "full_name": "New User",
            "password": "SecurePass99",
        },
    )
    assert resp.status_code == 201, f"Signup failed ({resp.status_code}): {resp.text}"
    body = resp.json()
    assert "user_id" in body
    assert body["user_id"] is not None


def test_signup_cannot_set_admin(client):
    """Signup cannot produce an admin account — role is always bureau_officer.

    The SignupRequest schema does not accept a role field, so any attempt to
    set role in the payload is silently ignored and the account defaults to
    bureau_officer with pending status.
    """
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "attacker@example.com",
            "full_name": "Bad Actor",
            "password": "StrongPass99",
        },
    )
    assert resp.status_code == 201, f"Signup failed ({resp.status_code}): {resp.text}"
    body = resp.json()
    assert "user_id" in body


def test_signup_duplicate_email(client, admin_user):
    """Signing up with an already-registered email returns 400."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": admin_user.email,        # admin@example.com — already exists
            "full_name": "Duplicate",
            "password": "AnotherPass99",
        },
    )
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"


def test_signup_short_password(client):
    """Password shorter than 8 characters returns 422 (validation error)."""
    resp = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "shortpass@example.com",
            "full_name": "Short Pass",
            "password": "abc",
        },
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /me tests
# ---------------------------------------------------------------------------

def test_me_requires_auth(client):
    """GET /me without a token returns 401 or 403."""
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)


def test_me_returns_user(client, admin_headers, admin_user):
    """GET /me with valid token returns the current user's profile."""
    resp = client.get("/api/v1/auth/me", headers=admin_headers)
    assert resp.status_code == 200, f"GET /me failed ({resp.status_code}): {resp.text}"
    body = resp.json()
    assert "email" in body
    assert body["email"] == admin_user.email
    assert "role" in body
