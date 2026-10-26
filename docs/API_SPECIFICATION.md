# NYAYA-SETU — API Specification
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard

> **Base URL:** `http://localhost:8000/api/v1`  
> **Interactive docs:** `http://localhost:8000/api/docs` (Swagger UI)  
> **Auth:** Bearer JWT in `Authorization` header (except `/auth/login` and `/auth/signup`)  
> **Content-Type:** `application/json` (except form-data for login and file uploads)

---

## Health (no auth)

### `GET /health` and `GET /api/v1/health`

Returns application and database status.

**Response 200:**
```json
{
  "status": "ok",
  "app": "AICTE C³",
  "env": "development",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00+00:00"
}
```

### `GET /api/v1/ready`

Readiness probe. Returns 503 if database is not reachable.

---

## Auth (`/auth`)

### `POST /auth/login`

**Auth:** None  
**Content-Type:** `application/x-www-form-urlencoded`

**Request form fields:**
```
username=admin@aicte.demo&password=Admin@123456
```

**Response 200:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user_id": 1,
  "email": "admin@aicte.demo",
  "full_name": "System Administrator",
  "role": "system_admin",
  "bureau_id": null
}
```

**Errors:**
- `401` — Incorrect email or password
- `403` — Account not active / suspended / rejected

---

### `POST /auth/signup`

**Auth:** None  
Creates a new account with `role=bureau_officer` and `account_status=pending`. Admin must approve before the user can log in.

**Request:**
```json
{
  "email": "newuser@example.com",
  "full_name": "New User",
  "password": "Secure@1234",
  "designation": "Section Officer"
}
```

**Response 201:**
```json
{
  "message": "Registration successful. Your account is pending administrator approval.",
  "user_id": 9
}
```

**Errors:**
- `400` — Email already exists
- `422` — Validation error (password < 8 chars, empty name)

---

### `GET /auth/me`

**Auth:** Required (any active role)

Returns the current user's profile.

**Response 200:** `UserProfileResponse` (id, email, full_name, role, account_status, bureau_id, region, designation, is_active, last_login, created_at)

---

### `PUT /auth/me`

**Auth:** Required

Updates `full_name` and/or `designation` only.

**Request:**
```json
{ "full_name": "New Name", "designation": "Senior Officer" }
```

**Response 200:** Updated `UserProfileResponse`

---

### `POST /auth/logout`

**Auth:** Required  
Client-side token removal only. No server-side blacklisting.

**Response 200:** `{ "message": "Logged out successfully." }`

---

## Users (`/users`)

### `GET /users/`

**Auth:** Required · **Roles:** `system_admin`, `senior_management`

List all users with optional filters.

**Query params:** `role`, `account_status`, `bureau_id`, `skip` (default 0), `limit` (default 50)

**Response 200:** Paginated list of user objects

---

### `GET /users/{user_id}`

**Auth:** Required · **Roles:** `system_admin`, `senior_management`

**Response 200:** Full user profile · **Errors:** `404`

---

### `PUT /users/{user_id}/approve`

**Auth:** Required · **Roles:** `system_admin`

Approve a pending user account. Sets `is_active=true`, `account_status=active`.

**Response 200:** `{ "message": "User approved." }`

---

### `PUT /users/{user_id}/suspend`

**Auth:** Required · **Roles:** `system_admin`

**Response 200:** `{ "message": "User suspended." }`

---

### `PUT /users/{user_id}/role`

**Auth:** Required · **Roles:** `system_admin`

**Request:** `{ "role": "coordination_reviewer" }`

**Response 200:** Updated user · **Errors:** `422` (invalid role value)

---

## Bureaus (`/bureaus`)

### `GET /bureaus/`

**Auth:** Required (any)

Returns all active bureaus.

**Response 200:**
```json
[
  { "id": 1, "code": "APPR", "name": "Approval Bureau", "description": "...", "is_active": true }
]
```

---

### `POST /bureaus/`

**Auth:** Required · **Roles:** `system_admin`

**Request:** `{ "code": "RB", "name": "Regulation Bureau", "description": "..." }`

**Response 201:** Created bureau · **Errors:** `400` (duplicate code), `422`

---

### `GET /bureaus/{bureau_id}`

**Auth:** Required · **Response 200:** Bureau detail · **Errors:** `404`

---

### `PUT /bureaus/{bureau_id}`

**Auth:** Required · **Roles:** `system_admin`

**Response 200:** Updated bureau · **Errors:** `404`, `422`

---

## Institutions (`/institutions`)

### `GET /institutions/`

**Auth:** Required (any)

**Query params:** `q` (name search), `state`, `region`, `institution_type`, `skip`, `limit`

**Response 200:** Paginated institutions with `identifiers` array

---

### `POST /institutions/`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`

**Request:** `{ "canonical_name": "...", "short_name": "...", "state": "...", "region": "...", ... }`

**Response 201:** Created institution · **Errors:** `400` (duplicate name), `422`

---

### `GET /institutions/{inst_id}`

**Auth:** Required  
Returns full institution profile including all `identifiers` (aicte_permanent_id, aishe_id, etc.) and case count.

**Response 200:** Institution detail · **Errors:** `404`

---

### `PUT /institutions/{inst_id}`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`

**Response 200:** Updated institution · **Errors:** `404`, `422`

---

### `POST /institutions/{inst_id}/identifiers`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`

Add a new identifier (AICTE Permanent ID, AISHE ID, etc.).

**Request:** `{ "id_type": "aicte_permanent_id", "id_value": "1-430050931", "source_system": "aicte_portal", "is_primary": true }`

**Response 201:** Created identifier · **Errors:** `404`

---

## Cases (`/cases`)

### `GET /cases/`

**Auth:** Required  
Bureau officers see only their bureau's cases. Admins/management see all.

**Query params:**

| Param | Type | Description |
|---|---|---|
| `q` | string | ILIKE search in title, case_number, summary |
| `status` | string | Filter by CaseStatus value |
| `bureau_id` | int | Filter by bureau |
| `institution_id` | int | Filter by institution |
| `priority` | string | Filter by priority |
| `category` | string | ILIKE search in category |
| `overdue` | bool | If true, cases past due_date still active |
| `skip` | int | Pagination offset |
| `limit` | int | Page size (max 200) |

**Response 200:**
```json
{
  "items": [ { "id": 1, "case_number": "AICTE-C3-2024-00001", "title": "...", "status": "received", "bureau": {...}, "institution": {...}, ... } ],
  "total": 18,
  "skip": 0,
  "limit": 50
}
```

---

### `POST /cases/`

**Auth:** Required (any active role)

**Request:**
```json
{
  "title": "Fee Hike Complaint",
  "summary": "...",
  "category": "Fee Structure",
  "priority": "high",
  "institution_id": 1,
  "bureau_id": 2,
  "received_date": "2024-01-01T00:00:00Z",
  "due_date": "2024-02-01T00:00:00Z"
}
```

**Response 201:** Created `CaseOut` · **Errors:** `404` (institution not found), `422`, `500`

Automatically triggers `detect_relationships()` (non-blocking).

---

### `GET /cases/{case_id}`

**Auth:** Required

Returns case with nested institution, bureau, assigned officer, and full action history.

**Response 200:** `CaseDetailOut` · **Errors:** `404`

---

### `PUT /cases/{case_id}`

**Auth:** Required

Update mutable fields: title, summary, category, sub_category, priority, bureau_id, due_date, next_action, complainant details. Creates an audit action record.

**Response 200:** Updated `CaseOut` · **Errors:** `404`, `500`

---

### `POST /cases/{case_id}/status`

**Auth:** Required

Transition case to a new status. Validates against `VALID_TRANSITIONS` map.

**Request:** `{ "new_status": "assigned", "reason": "Forwarded to Section Officer" }`

**Response 200:** `{ "message": "Status updated", "old_status": "triaged", "new_status": "assigned" }`

**Errors:**
- `422` — Invalid status value or transition not permitted
- `422` — Reason is empty

**Valid transitions:**

| From | Allowed To |
|---|---|
| received | triaged, escalated |
| triaged | assigned, escalated |
| assigned | under_process, transfer_requested, escalated |
| under_process | awaiting_information, decision_review, disposed, transfer_requested, escalated |
| awaiting_information | under_process, escalated |
| decision_review | disposed, under_process |
| disposed | reopened |
| transfer_requested | transferred, assigned |
| transferred | assigned |
| escalated | assigned, under_process |
| reopened | triaged |
| closed | reopened |

---

### `POST /cases/{case_id}/assign`

**Auth:** Required

**Request:** `{ "officer_id": 3, "notes": "Assigned due to expertise" }`

Closes previous `CaseAssignment` record and creates a new one. Sends notification to the assigned officer.

**Response 200:** `{ "message": "Case assigned successfully" }` · **Errors:** `404`

---

### `GET /cases/{case_id}/timeline`

**Auth:** Required

Returns all `CaseAction` records for the case, ordered chronologically (oldest first).

**Response 200:** Array of `CaseActionOut` (id, action_type, description, old_status, new_status, performed_by, created_at)

---

### `POST /cases/{case_id}/actions`

**Auth:** Required

Add a note or manual action to the timeline.

**Request:** `{ "description": "Contacted institution for documents", "action_type": "note" }`

**Response 200:** `{ "message": "Action recorded" }` · **Errors:** `404`

---

### `POST /cases/{case_id}/transfer`

**Auth:** Required

Request transfer of a case to another bureau or officer. Sets case status to `transfer_requested`.

**Request:** `{ "to_bureau_id": 3, "to_officer_id": 5, "reason": "Jurisdiction mismatch" }`

**Response 201:** `{ "message": "Transfer request submitted", "transfer_id": 1 }` · **Errors:** `404`

---

## Relationships (`/relationships`)

### `GET /relationships/inbox`

**Auth:** Required  
Returns only `review_status=pending` relationships, newest first.

**Query params:** `skip`, `limit`

**Response 200:** `PaginatedRelationships` (items include nested case_a and case_b briefs)

---

### `GET /relationships/`

**Auth:** Required

**Query params:** `review_status`, `relationship_type`, `case_id`, `skip`, `limit`

**Response 200:** `PaginatedRelationships`

---

### `GET /relationships/{rel_id}`

**Auth:** Required

Returns full relationship including review history.

**Response 200:** `RelationshipOut` · **Errors:** `404`

---

### `POST /relationships/{rel_id}/review`

**Auth:** Required · **Roles:** `coordination_reviewer`, `system_admin`, `senior_management`

Submit human review. **Does not automatically merge or close any case.**

**Request:**
```json
{
  "decision": "confirmed",
  "rationale": "Same institution, same category, same complainant pattern",
  "corrected_type": null
}
```

`decision` values: `confirmed`, `rejected`, `corrected`, `escalated`  
`corrected_type` values: `possible_duplicate`, `related_complaint`, `same_institution_unrelated`, `action_conflict`

**Response 200:**
```json
{
  "message": "Review recorded successfully",
  "decision": "confirmed",
  "note": "Underlying cases remain unchanged. No auto-merge or auto-close was performed."
}
```

**Errors:** `404`, `422` (invalid decision/corrected_type)

---

### `POST /relationships/detect/{case_id}`

**Auth:** Required (any active role)

Manually trigger same-institution relationship matching for a single case.

**Response 200:**
```json
{
  "message": "Detection complete",
  "candidates_found": 2,
  "service_available": true,
  "candidates": [ { "case_b_id": 6, "type": "possible_duplicate", "score": 0.87, "reasons": [...] } ]
}
```

---

### `POST /relationships/detect-all` *(P0-4 — not yet implemented)*

**Auth:** Required · **Roles:** `system_admin`, `senior_management`

Runs both `detect_relationships()` and `detect_cross_bureau_relationships()` for all active cases.

**Response 200:**
```json
{
  "message": "Detection scan complete. All candidates saved as PENDING for human review.",
  "cases_scanned": 18,
  "same_institution_candidates": 5,
  "cross_bureau_candidates": 3,
  "errors": 0,
  "note": "No cases were modified. Use GET /relationships/?review_status=pending to review."
}
```

**Errors:** `401`, `403` (non-admin/non-management role)

---

## Coordination (`/coordination`)

### `GET /coordination/`

**Auth:** Required

**Query params:** `status`, `skip`, `limit`

**Response 200:** Paginated `CoordinationItem` list

---

### `POST /coordination/`

**Auth:** Required · **Roles:** `coordination_reviewer`, `system_admin`, `senior_management`

**Request:** `{ "title": "...", "description": "...", "source_relationship_id": 1, "acknowledge_by": "...", "action_due_date": "..." }`

**Response 201:** Created coordination item

---

### `GET /coordination/{item_id}`

**Auth:** Required

Returns item with participants and tasks.

**Response 200:** Full `CoordinationItem` · **Errors:** `404`

---

### `PUT /coordination/{item_id}`

**Auth:** Required · **Roles:** `coordination_reviewer`, `system_admin`, `senior_management`

**Response 200:** Updated item · **Errors:** `404`

---

### `POST /coordination/{item_id}/decision`

**Auth:** Required · **Roles:** `coordination_reviewer`, `system_admin`, `senior_management`

**Request:** `{ "decision": "coordinate", "rationale": "Both bureaus must align on remediation timeline" }`

`decision` values: `coordinate`, `link_related`, `keep_separate`, `dismiss`, `escalate`

**Response 200:** Updated item

---

### `POST /coordination/{item_id}/participants`

**Auth:** Required · **Roles:** `coordination_reviewer`, `system_admin`

Add a bureau or user as a coordination participant.

**Request:** `{ "bureau_id": 2, "role_in_coordination": "lead" }`

**Response 201:** Created participant

---

### `POST /coordination/{item_id}/tasks`

**Auth:** Required

**Request:** `{ "title": "Collect documents from all bureaus", "assigned_to_id": 3, "due_date": "..." }`

**Response 201:** Created task

---

## Notifications (`/notifications`)

### `GET /notifications/`

**Auth:** Required (own notifications only)

**Query params:** `unread_only` (bool), `skip`, `limit`

**Response 200:** Paginated notifications (id, title, message, notification_type, priority, is_read, created_at)

---

### `GET /notifications/unread-count`

**Auth:** Required

**Response 200:** `{ "count": 5 }`

---

### `POST /notifications/{notif_id}/read`

**Auth:** Required (own notifications)

Marks notification as read.

**Response 200:** `{ "message": "Marked as read" }` · **Errors:** `404`

---

### `POST /notifications/read-all`

**Auth:** Required

Marks all of the current user's notifications as read.

**Response 200:** `{ "message": "All notifications marked as read" }`

---

## Analytics (`/analytics`)

All analytics endpoints are authenticated and role-scoped. `BUREAU_OFFICER` sees only their bureau's data.

### `GET /analytics/dashboard`

**Auth:** Required · **Query params:** `bureau_id` (admin/management only)

**Response 200:**
```json
{
  "total_cases": 18,
  "cases_by_status": { "received": 3, "under_process": 4, ... },
  "cases_by_bureau": [ { "bureau_id": 1, "count": 7 } ],
  "overdue_cases": 3,
  "unreviewed_relationships": 5,
  "pending_coordination": 4,
  "overdue_coordination": 2,
  "pending_transfers": 1,
  "new_this_week": 2,
  "generated_at": "2024-01-01T00:00:00+00:00",
  "data_note": "DEMO DATA — Synthetic prototype data. Not official AICTE records.",
  "filters_applied": { "bureau_id": null, "role_scope": "system_admin" }
}
```

---

### `GET /analytics/cases/ageing`

**Auth:** Required

**Response 200:**
```json
{
  "ageing_buckets": { "0_7_days": 3, "8_30_days": 5, "31_90_days": 7, "over_90_days": 2 },
  "generated_at": "..."
}
```

---

### `GET /analytics/cases/trends`

**Auth:** Required

Monthly case creation counts for last 12 months.

**Response 200:** `{ "monthly_trends": [ { "month": "Jan 2024", "count": 3 }, ... ] }`

---

### `GET /analytics/institutions/breakdown`

**Auth:** Required · **Query params:** `limit` (max 50, default 20)

Top institutions by case count.

**Response 200:** `{ "breakdown": [ { "institution_id": 1, "name": "IIT Delhi", "case_count": 3 } ] }`

---

### `GET /analytics/coordination/backlog`

**Auth:** Required

**Response 200:** `{ "by_status": { "detected": 1, "active": 2, "closed": 1 }, "generated_at": "..." }`

---

### `GET /analytics/sla-status` *(P0-2 — not yet implemented)*

**Auth:** Required · **Query params:** `bureau_id`

**Response 200:**
```json
{
  "on_track": 8,
  "at_risk": 3,
  "overdue": 2,
  "no_deadline_set": 5,
  "total_active": 18,
  "compliance_percentage": 61.5,
  "generated_at": "...",
  "data_note": "DEMO DATA — Synthetic prototype.",
  "filters_applied": { "bureau_id": null, "role_scope": "system_admin" }
}
```

---

## Reports (`/reports`)

### `GET /reports/cases/csv`

**Auth:** Required

Download cases as CSV.

**Query params:** `status`, `bureau_id`, `institution_id`, `category`, `priority`, `overdue`

**Response 200:** `text/csv` file download

---

### `GET /reports/coordination/csv`

**Auth:** Required

Download coordination items as CSV.

**Response 200:** `text/csv` file download

---

## Imports (`/imports`)

### `POST /imports/`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`  
**Content-Type:** `multipart/form-data`

Upload a CSV file for preview validation.

**Form fields:** `file` (CSV), `import_type` (`institutions` or `cases`), `preview_only` (bool)

**Response 200/201:** `ImportJob` object with `status=preview`, row counts, error summary

---

### `GET /imports/`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`

List all import jobs.

---

### `GET /imports/{job_id}`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`

**Response 200:** Import job detail with row-level results · **Errors:** `404`

---

### `POST /imports/{job_id}/confirm`

**Auth:** Required · **Roles:** `system_admin`, `data_admin`

Confirm and execute an import job that is in `preview` status.

**Response 200:** Updated `ImportJob` with final row counts · **Errors:** `404`, `422`

---

## Audit (`/audit`)

### `GET /audit/`

**Auth:** Required · **Roles:** `system_admin`, `senior_management`

**Query params:** `user_id`, `resource_type`, `action`, `from_date`, `to_date`, `skip`, `limit`

**Response 200:** Paginated `AuditEvent` list (id, user_id, action, resource_type, resource_id, description, ip_address, created_at)

---

## Common Error Responses

| Status | Meaning |
|---|---|
| 400 | Bad request (duplicate, business rule violation) |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 422 | Validation error (pydantic / enum value) |
| 500 | Internal server error (check logs) |

All error responses follow FastAPI's default format: `{ "detail": "..." }`
