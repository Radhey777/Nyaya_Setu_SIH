# NYAYA-SETU — Testing and Acceptance Criteria
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard

> **Test runner:** pytest 9.1 + pytest-asyncio 1.4 (backend) · Vitest (frontend — not yet configured)  
> **Status note:** No automated tests have been executed yet. All "Actual Result" entries are PENDING until tests are run against a seeded database.  
> **Prerequisites for integration tests:** `docker compose up -d db && cd backend && alembic upgrade head && python seed.py`

---

## Acceptance Test Scenarios

### AT-01 — Login with valid credentials

| Field | Value |
|---|---|
| **ID** | AT-01 |
| **Scenario** | System Admin logs in with correct credentials |
| **Category** | Authentication |
| **Setup** | Seed data present; admin account active |
| **Action** | POST `/api/v1/auth/login` with `username=admin@aicte.demo` and `password=Admin@123456` |
| **Expected Result** | HTTP 200; response contains `access_token`, `token_type=bearer`, `role=system_admin`, `bureau_id=null` |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-02 — Login with invalid password

| Field | Value |
|---|---|
| **ID** | AT-02 |
| **Scenario** | Login attempt with wrong password returns 401 (generic error — prevents user enumeration) |
| **Category** | Authentication |
| **Setup** | Seed data present |
| **Action** | POST `/api/v1/auth/login` with `username=admin@aicte.demo` and `password=WrongPass!` |
| **Expected Result** | HTTP 401; `detail` = "Incorrect email or password" (same message regardless of whether email exists) |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-03 — Case creation by authenticated officer

| Field | Value |
|---|---|
| **ID** | AT-03 |
| **Scenario** | A bureau officer creates a new case; case number is auto-generated and initial status is `received` |
| **Category** | Case lifecycle |
| **Setup** | Logged in as `officer1@aicte.demo`; at least one institution exists in DB |
| **Action** | POST `/api/v1/cases/` with `{ "title": "Fee Hike Test", "category": "Fee Structure", "institution_id": 1, "priority": "high" }` |
| **Expected Result** | HTTP 201; `case_number` matches pattern `AICTE-C3-{year}-{n}`; `status = received`; response includes nested institution object |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-04 — Valid status transition

| Field | Value |
|---|---|
| **ID** | AT-04 |
| **Scenario** | Status transitions from `received` → `triaged` with a mandatory reason |
| **Category** | Case lifecycle |
| **Setup** | A case in `received` status exists (e.g., from AT-03) |
| **Action** | POST `/api/v1/cases/{case_id}/status` with `{ "new_status": "triaged", "reason": "Initial review completed" }` |
| **Expected Result** | HTTP 200; `old_status=received`, `new_status=triaged`; a corresponding `CaseAction` record created in DB |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-05 — Invalid status transition rejected

| Field | Value |
|---|---|
| **ID** | AT-05 |
| **Scenario** | Attempting a forbidden status transition is rejected with an informative 422 error |
| **Category** | Case lifecycle |
| **Setup** | A case in `received` status |
| **Action** | POST `/api/v1/cases/{case_id}/status` with `{ "new_status": "disposed", "reason": "Jumping ahead" }` |
| **Expected Result** | HTTP 422; error message lists allowed next statuses (triaged, escalated) and does not include disposed |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-06 — Relationship detection triggers on case creation

| Field | Value |
|---|---|
| **ID** | AT-06 |
| **Scenario** | Creating a case at an institution that already has a case with the same category triggers relationship detection |
| **Category** | Relationship matching |
| **Setup** | VIT institution (id matches seed data) has two existing `Fee Structure` cases |
| **Action** | POST `/api/v1/cases/` with a new Fee Structure case for VIT |
| **Expected Result** | HTTP 201; a `CaseRelationship` record with `review_status=pending` and `relationship_type` of `possible_duplicate` or `related_complaint` is created for the new case |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-07 — Human review of a relationship candidate

| Field | Value |
|---|---|
| **ID** | AT-07 |
| **Scenario** | A coordination reviewer confirms a pending relationship candidate; underlying cases are NOT modified |
| **Category** | Human review workflow |
| **Setup** | A `CaseRelationship` with `review_status=pending` exists; logged in as `reviewer@aicte.demo` |
| **Action** | POST `/api/v1/relationships/{rel_id}/review` with `{ "decision": "confirmed", "rationale": "Same complainant pattern" }` |
| **Expected Result** | HTTP 200; response includes `note` confirming no auto-merge; `CaseRelationship.review_status` updated to `confirmed`; both cases retain their original status unchanged; a `RelationshipReview` record is created |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-08 — CSV export of cases

| Field | Value |
|---|---|
| **ID** | AT-08 |
| **Scenario** | System admin downloads all cases as CSV |
| **Category** | Reports / export |
| **Setup** | At least 5 cases in DB; logged in as `admin@aicte.demo` |
| **Action** | GET `/api/v1/reports/cases/csv` |
| **Expected Result** | HTTP 200; `Content-Type: text/csv`; response body is a valid CSV with header row containing at minimum: case_number, title, status, bureau, institution, category, received_date, due_date |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-09 — Coordination item creation

| Field | Value |
|---|---|
| **ID** | AT-09 |
| **Scenario** | A coordination reviewer creates a cross-bureau coordination item from a confirmed relationship |
| **Category** | CCP coordination workflow |
| **Setup** | A confirmed `CaseRelationship` exists; logged in as `reviewer@aicte.demo` |
| **Action** | POST `/api/v1/coordination/` with `{ "title": "VIT Fee Cross-Bureau Coordination", "source_relationship_id": {rel_id}, "action_due_date": "2025-03-01T00:00:00Z" }` |
| **Expected Result** | HTTP 201; `reference_number` auto-generated (CCP-{year}-{seq}); `status=detected`; `created_by_id` matches reviewer's user ID |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-10 — Audit log visibility

| Field | Value |
|---|---|
| **ID** | AT-10 |
| **Scenario** | Every mutation (case creation, status change, review decision) appears in the audit log visible to system admin |
| **Category** | Audit trail |
| **Setup** | AT-03, AT-04, AT-07 have been run; logged in as `admin@aicte.demo` |
| **Action** | GET `/api/v1/audit/?resource_type=case` |
| **Expected Result** | HTTP 200; response contains audit events with `action=case_created`, `action=status_changed`; each event has `user_id`, `resource_id`, `created_at` |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-11 — In-app notification on case assignment

| Field | Value |
|---|---|
| **ID** | AT-11 |
| **Scenario** | When a case is assigned to an officer, that officer receives an in-app notification |
| **Category** | Notifications |
| **Setup** | A case exists; logged in as `admin@aicte.demo` |
| **Action** | POST `/api/v1/cases/{case_id}/assign` with `{ "officer_id": {officer1_id} }`; then GET `/api/v1/notifications/` as officer1 |
| **Expected Result** | Notification list contains an entry with `notification_type=case_assigned` and `title="Case Assigned"` referencing the case number |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-12 — Pending account cannot log in

| Field | Value |
|---|---|
| **ID** | AT-12 |
| **Scenario** | A self-registered account with `account_status=pending` is rejected at login with a clear message |
| **Category** | User approval flow |
| **Setup** | Register a new user via POST `/auth/signup`; do not approve the account |
| **Action** | POST `/api/v1/auth/login` with the new user's credentials |
| **Expected Result** | HTTP 403; `detail` contains "not active" or "pending" language; access token is NOT issued |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-13 — SLA overdue detection

| Field | Value |
|---|---|
| **ID** | AT-13 |
| **Scenario** | Overdue cases (past `due_date`, still active) appear in the overdue filter and the dashboard overdue count |
| **Category** | SLA monitoring |
| **Setup** | Seed data includes cases with `due_date` in the past (e.g., Amity Unauthorized Program, SPPU Exam Irregularities) |
| **Action** | GET `/api/v1/cases/?overdue=true` AND GET `/api/v1/analytics/dashboard` |
| **Expected Result** | `GET /cases/?overdue=true` returns at least 2 cases; `dashboard.overdue_cases` count is ≥ 2 |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-14 — Bureau-scoped visibility

| Field | Value |
|---|---|
| **ID** | AT-14 |
| **Scenario** | A bureau officer logged in as `officer1@aicte.demo` (Approval Bureau) can only see cases belonging to the Approval Bureau |
| **Category** | RBAC / data scoping |
| **Setup** | Seed data has cases in multiple bureaus |
| **Action** | GET `/api/v1/cases/` as `officer1@aicte.demo`; also GET `/api/v1/cases/?bureau_id={grievance_bureau_id}` |
| **Expected Result** | All returned cases have `bureau.code = "APPR"`; the bureau_id filter for a different bureau has no effect (scoping is enforced server-side regardless of query params) |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

### AT-15 — CSV import preview

| Field | Value |
|---|---|
| **ID** | AT-15 |
| **Scenario** | Uploading a valid CSV for cases creates an import job in `preview` status with row validation results before committing |
| **Category** | CSV import |
| **Setup** | Logged in as `admin@aicte.demo`; a test CSV file with valid and invalid rows prepared |
| **Action** | POST `/api/v1/imports/` (multipart) with `file`, `import_type=cases`, `preview_only=true` |
| **Expected Result** | HTTP 200/201; `ImportJob.status = preview`; `valid_rows` and `error_rows` counts are accurate; no new cases have been committed to the database |
| **Actual Result** | PENDING |
| **Status** | PENDING |

---

## Test Coverage Summary

| Category | Total Scenarios | PASS | FAIL | PENDING |
|---|---|---|---|---|
| Authentication | 3 (AT-01, AT-02, AT-12) | 0 | 0 | 3 |
| Case lifecycle | 3 (AT-03, AT-04, AT-05) | 0 | 0 | 3 |
| Relationship matching | 2 (AT-06, AT-07) | 0 | 0 | 2 |
| Reports / export | 1 (AT-08) | 0 | 0 | 1 |
| Coordination workflow | 1 (AT-09) | 0 | 0 | 1 |
| Audit trail | 1 (AT-10) | 0 | 0 | 1 |
| Notifications | 1 (AT-11) | 0 | 0 | 1 |
| SLA monitoring | 1 (AT-13) | 0 | 0 | 1 |
| RBAC / data scoping | 1 (AT-14) | 0 | 0 | 1 |
| CSV import | 1 (AT-15) | 0 | 0 | 1 |
| **Total** | **15** | **0** | **0** | **15** |

---

## How to Run Backend Tests

```bash
# Prerequisites
cd "d:\SIH NEW PROJECT"
docker compose up -d db
cd backend
pip install -r requirements.txt
alembic upgrade head
python seed.py

# Unit tests (no DB required)
python -m pytest tests/test_matching.py -v -m "not integration"

# Integration tests (DB required)
python -m pytest tests/ -v

# Single scenario smoke test
python -m pytest tests/test_analytics.py::test_dashboard_authenticated -v
```

## Known Testing Limitations

1. **No automated tests exist yet.** `backend/tests/` is empty. All 15 acceptance test scenarios above are manual or pending automated implementation (see P2-1 and P2-2 in IMPLEMENTATION_ROADMAP.md).
2. **No frontend test framework** configured. No Vitest or Jest tests exist.
3. **Integration tests require a running PostgreSQL instance** with seed data. They cannot run in a CI environment without Docker.
4. **No load/performance tests** have been planned for this prototype phase.
5. **Manual smoke testing** of the full UI flow was used to validate feature correctness during development.
