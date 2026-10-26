# NYAYA-SETU — Database Design
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard

> **Database:** PostgreSQL 15  
> **ORM:** SQLAlchemy 2.1  
> **Migrations:** Alembic  
> **All data in demo deployment is SYNTHETIC — not official AICTE records.**

---

## 1. Table Inventory

| Table | Description |
|---|---|
| `users` | Authorized AICTE officials with role-based access |
| `bureaus` | AICTE Bureaus and Cells (APPR, ACAD, GRVN, COMP, RSRCH, …) |
| `institutions` | Technical education institutions (canonical record) |
| `institution_identifiers` | Multi-source identifiers per institution (AICTE ID, AISHE ID, …) |
| `cases` | Core complaint/case registry |
| `case_actions` | Chronological action/event timeline for each case |
| `case_assignments` | Historical officer assignment records per case |
| `case_relationships` | AI-detected relationship candidates between cases |
| `relationship_reviews` | Human review decisions on relationship candidates |
| `coordination_items` | Cross-bureau coordination initiatives (CCP) |
| `coordination_participants` | Bureau/officer participants in each coordination item |
| `coordination_tasks` | Follow-up tasks within a coordination item |
| `transfer_requests` | Case transfer requests between bureaus/officers |
| `notifications` | In-app notification inbox per user |
| `audit_events` | Immutable audit trail of all system mutations |
| `import_jobs` | CSV import job tracking |
| `import_rows` | Row-level import validation results |
| `deadline_rules` | Configurable SLA rules (days to resolve by category) |
| `case_deadlines` | Per-case deadline records derived from rules |

---

## 2. Table Definitions

### `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK, auto-increment, indexed | — |
| `email` | String(255) | UNIQUE, NOT NULL, indexed | Login identifier |
| `full_name` | String(255) | NOT NULL | — |
| `hashed_password` | String(255) | NOT NULL | bcrypt hash |
| `role` | Enum(UserRole) | NOT NULL, default `bureau_officer` | system_admin, senior_management, bureau_officer, regional_officer, data_admin, coordination_reviewer |
| `account_status` | Enum(AccountStatus) | NOT NULL, default `pending` | pending, active, suspended, rejected |
| `bureau_id` | Integer | nullable | Not a FK (denormalised for speed; no Bureau.users relationship) |
| `region` | String(100) | nullable | For regional_officer scoping |
| `designation` | String(200) | nullable | Job title / designation |
| `is_active` | Boolean | default False | Set true on admin approval |
| `is_superuser` | Boolean | default False | Reserved; not currently used |
| `last_login` | DateTime(tz) | nullable | Updated on each login |
| `created_at` | DateTime(tz) | server_default now() | — |
| `updated_at` | DateTime(tz) | onupdate now() | — |

**Relationships:** has-many `notifications`, `audit_events`

---

### `bureaus`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `code` | String(50) | UNIQUE, NOT NULL, indexed | e.g. APPR, GRVN, ACAD |
| `name` | String(255) | NOT NULL | Full bureau name |
| `description` | Text | nullable | — |
| `head_name` | String(255) | nullable | Bureau head name |
| `head_email` | String(255) | nullable | — |
| `is_active` | Boolean | default True | — |
| `created_at` | DateTime(tz) | server_default | — |
| `updated_at` | DateTime(tz) | onupdate | — |

**Relationships:** has-many `cases`

---

### `institutions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `canonical_name` | String(500) | NOT NULL, indexed | Official full name for fuzzy matching |
| `short_name` | String(100) | nullable | — |
| `institution_type` | String(100) | nullable | Deemed University, CFTI, State Univ, … |
| `status` | Enum(InstitutionStatus) | default `active` | active, inactive, under_review, merged |
| `state` | String(100) | nullable, indexed | — |
| `district` | String(100) | nullable | — |
| `city` | String(100) | nullable | — |
| `region` | String(100) | nullable, indexed | North, South, East, West |
| `address` | Text | nullable | — |
| `pincode` | String(10) | nullable | — |
| `phone` | String(20) | nullable | — |
| `email` | String(255) | nullable | — |
| `website` | String(500) | nullable | — |
| `data_source` | String(100) | nullable | e.g. demo_seed, csv_import, aicte_api |
| `source_last_synced` | DateTime(tz) | nullable | Last external sync timestamp |
| `import_notes` | Text | nullable | Provenance notes |
| `created_at` | DateTime(tz) | server_default | — |
| `updated_at` | DateTime(tz) | onupdate | — |
| `created_by_id` | Integer | FK → users.id, nullable | — |

**Relationships:** has-many `institution_identifiers` (cascade delete), has-many `cases` (lazy dynamic)

---

### `institution_identifiers`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `institution_id` | Integer | FK → institutions.id ON DELETE CASCADE, NOT NULL | — |
| `id_type` | String(50) | NOT NULL | aicte_permanent_id, aishe_id, nic_id, etc. |
| `id_value` | String(255) | NOT NULL | The identifier value |
| `source_system` | String(100) | nullable | Origin system name |
| `is_primary` | Boolean | default False | Primary identifier for deduplication |
| `is_verified` | Boolean | default False | Human-verified flag |
| `verified_by_id` | Integer | FK → users.id, nullable | — |
| `verified_at` | DateTime(tz) | nullable | — |
| `created_at` | DateTime(tz) | server_default | — |

---

### `cases`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK, indexed | — |
| `case_number` | String(50) | UNIQUE, NOT NULL, indexed | Auto-generated: AICTE-C3-{year}-{seq} |
| `source_case_id` | String(255) | nullable, indexed | ID from originating external system |
| `source_system` | String(100) | nullable | Origin system (pgrc, rb_portal, …) |
| `institution_id` | Integer | FK → institutions.id, NOT NULL, indexed | — |
| `bureau_id` | Integer | FK → bureaus.id, nullable, indexed | Responsible bureau |
| `assigned_officer_id` | Integer | FK → users.id, nullable | Current assignee |
| `title` | String(500) | NOT NULL | — |
| `summary` | Text | nullable | — |
| `category` | String(200) | NOT NULL, indexed | Fee Structure, Faculty, Infrastructure, … |
| `sub_category` | String(200) | nullable | — |
| `status` | Enum(CaseStatus) | NOT NULL, default `received`, indexed | 12-value lifecycle enum |
| `priority` | Enum(CasePriority) | NOT NULL, default `medium` | low, medium, high, urgent |
| `complainant_name` | String(255) | nullable | — |
| `complainant_email` | String(255) | nullable | — |
| `complainant_phone` | String(20) | nullable | — |
| `received_date` | DateTime(tz) | nullable | When AICTE received the complaint |
| `due_date` | DateTime(tz) | nullable | SLA deadline |
| `disposed_date` | DateTime(tz) | nullable | Populated on DISPOSED transition |
| `last_action_date` | DateTime(tz) | nullable | Updated on every action |
| `next_action` | Text | nullable | Planned next step |
| `next_action_owner_id` | Integer | FK → users.id, nullable | — |
| `source_last_synced` | DateTime(tz) | nullable | For external system sync |
| `import_job_id` | Integer | FK → import_jobs.id, nullable | — |
| `is_active` | Boolean | default True | Soft delete flag |
| `created_at` | DateTime(tz) | server_default | — |
| `updated_at` | DateTime(tz) | onupdate | — |
| `created_by_id` | Integer | FK → users.id, nullable | — |

**`CaseStatus` enum values:** received, triaged, assigned, under_process, awaiting_information, decision_review, disposed, transfer_requested, transferred, escalated, reopened, closed

**`CasePriority` enum values:** low, medium, high, urgent

**Relationships:** has-many `case_actions` (cascade), `case_assignments` (cascade), `relationships_as_case_a` (cascade), `relationships_as_case_b`, `transfer_requests`

---

### `case_actions`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `case_id` | Integer | FK → cases.id ON DELETE CASCADE, NOT NULL, indexed | — |
| `action_type` | String(100) | NOT NULL | created, status_change, assigned, transfer_requested, note, updated |
| `description` | Text | NOT NULL | Human-readable remarks |
| `old_status` | Enum(CaseStatus) | nullable | Before transition |
| `new_status` | Enum(CaseStatus) | nullable | After transition |
| `performed_by_id` | Integer | FK → users.id, nullable | Responsible official |
| `created_at` | DateTime(tz) | server_default | Immutable timestamp |

---

### `case_assignments`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `case_id` | Integer | FK → cases.id ON DELETE CASCADE, NOT NULL, indexed | — |
| `assigned_to_id` | Integer | FK → users.id, NOT NULL | — |
| `assigned_by_id` | Integer | FK → users.id, nullable | Who made the assignment |
| `bureau_id` | Integer | FK → bureaus.id, nullable | Bureau at time of assignment |
| `notes` | Text | nullable | — |
| `is_current` | Boolean | default True | Only one current assignment per case |
| `assigned_at` | DateTime(tz) | server_default | — |
| `ended_at` | DateTime(tz) | nullable | Set when superseded by next assignment |

---

### `case_relationships`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `case_a_id` | Integer | FK → cases.id ON DELETE CASCADE, NOT NULL, indexed | Source case |
| `case_b_id` | Integer | FK → cases.id, NOT NULL, indexed | Related case |
| `relationship_type` | Enum(RelationshipType) | NOT NULL | possible_duplicate, related_complaint, same_institution_unrelated, action_conflict |
| `score` | Float | nullable | Similarity score 0.0–1.0 |
| `reasons` | JSON | nullable | Array of human-readable explanation strings |
| `matching_evidence` | JSON | nullable | Algorithm name, field values, scores used |
| `algorithm_version` | String(50) | default "v1.0" | e.g. v1.0-baseline, v1.0-baseline-cross-bureau |
| `review_status` | Enum(ReviewStatus) | default `pending`, indexed | pending, confirmed, rejected, corrected, escalated |
| `created_at` | DateTime(tz) | server_default | — |

**`RelationshipType` enum:** possible_duplicate, related_complaint, same_institution_unrelated, action_conflict  
**`ReviewStatus` enum:** pending, confirmed, rejected, corrected, escalated

**Relationships:** has-many `relationship_reviews` (cascade)

---

### `relationship_reviews`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `relationship_id` | Integer | FK → case_relationships.id ON DELETE CASCADE, NOT NULL, indexed | — |
| `reviewer_id` | Integer | FK → users.id, NOT NULL | Reviewer (must be coordination_reviewer, system_admin, or senior_management) |
| `decision` | Enum(ReviewStatus) | NOT NULL | confirmed, rejected, corrected, escalated |
| `corrected_type` | Enum(RelationshipType) | nullable | Human-corrected relationship type |
| `rationale` | Text | nullable | Review remarks |
| `reviewed_at` | DateTime(tz) | server_default | — |

---

### `coordination_items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `reference_number` | String(50) | UNIQUE, NOT NULL, indexed | e.g. CCP-2024-0001 |
| `title` | String(500) | NOT NULL | — |
| `description` | Text | nullable | — |
| `source_relationship_id` | Integer | FK → case_relationships.id, nullable | Originating AI match |
| `owner_id` | Integer | FK → users.id, nullable | — |
| `status` | Enum(CoordinationStatus) | default `detected`, indexed | detected, under_review, active, acknowledged, follow_up, closure_review, closed, dismissed, escalated |
| `decision` | Enum(CoordinationDecision) | nullable | coordinate, link_related, keep_separate, dismiss, escalate |
| `decision_rationale` | Text | nullable | — |
| `decision_by_id` | Integer | FK → users.id, nullable | — |
| `decision_at` | DateTime(tz) | nullable | — |
| `acknowledge_by` | DateTime(tz) | nullable | Acknowledgement deadline |
| `action_due_date` | DateTime(tz) | nullable | Action completion deadline |
| `closure_notes` | Text | nullable | — |
| `closed_by_id` | Integer | FK → users.id, nullable | — |
| `closed_at` | DateTime(tz) | nullable | — |
| `is_exception_closure` | Boolean | default False | — |
| `exception_reason` | Text | nullable | — |
| `created_at` | DateTime(tz) | server_default | — |
| `updated_at` | DateTime(tz) | onupdate | — |
| `created_by_id` | Integer | FK → users.id, nullable | — |

**Relationships:** has-many `coordination_participants` (cascade), `coordination_tasks` (cascade)

---

### `coordination_participants`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `coordination_item_id` | Integer | FK → coordination_items.id ON DELETE CASCADE, NOT NULL | — |
| `bureau_id` | Integer | FK → bureaus.id, nullable | Participating bureau |
| `user_id` | Integer | FK → users.id, nullable | Participating user (or bureau, not both) |
| `role_in_coordination` | String(100) | nullable | lead, reviewer, observer, participant |
| `acknowledged` | Boolean | default False | — |
| `acknowledged_at` | DateTime(tz) | nullable | — |
| `added_at` | DateTime(tz) | server_default | — |

---

### `coordination_tasks`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `coordination_item_id` | Integer | FK → coordination_items.id ON DELETE CASCADE, NOT NULL, indexed | — |
| `title` | String(500) | NOT NULL | — |
| `description` | Text | nullable | — |
| `assigned_to_id` | Integer | FK → users.id, nullable | — |
| `due_date` | DateTime(tz) | nullable | — |
| `is_completed` | Boolean | default False | — |
| `completed_at` | DateTime(tz) | nullable | — |
| `completed_by_id` | Integer | FK → users.id, nullable | — |
| `completion_notes` | Text | nullable | — |
| `created_by_id` | Integer | FK → users.id, nullable | — |
| `created_at` | DateTime(tz) | server_default | — |

---

### `transfer_requests`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `case_id` | Integer | FK → cases.id, NOT NULL, indexed | — |
| `from_bureau_id` | Integer | FK → bureaus.id, nullable | Source bureau |
| `to_bureau_id` | Integer | FK → bureaus.id, nullable | Target bureau |
| `from_officer_id` | Integer | FK → users.id, nullable | — |
| `to_officer_id` | Integer | FK → users.id, nullable | — |
| `reason` | Text | NOT NULL | — |
| `status` | Enum(TransferStatus) | default `requested` | requested, accepted, rejected, cancelled |
| `response_notes` | Text | nullable | — |
| `requested_by_id` | Integer | FK → users.id, nullable | — |
| `responded_by_id` | Integer | FK → users.id, nullable | — |
| `requested_at` | DateTime(tz) | server_default | — |
| `responded_at` | DateTime(tz) | nullable | — |

---

### `notifications`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `user_id` | Integer | FK → users.id ON DELETE CASCADE, NOT NULL, indexed | Recipient |
| `title` | String(255) | NOT NULL | — |
| `message` | Text | NOT NULL | — |
| `notification_type` | String(100) | nullable | overdue, new_relationship, transfer, case_assigned, etc. |
| `priority` | Enum(NotificationPriority) | default `medium` | low, medium, high, urgent |
| `is_read` | Boolean | default False | — |
| `read_at` | DateTime(tz) | nullable | — |
| `link_url` | String(500) | nullable | Frontend deep link |
| `related_case_id` | Integer | FK → cases.id, nullable | — |
| `related_coordination_id` | Integer | FK → coordination_items.id, nullable | — |
| `created_at` | DateTime(tz) | server_default | — |

---

### `audit_events`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `user_id` | Integer | FK → users.id, nullable, indexed | Actor (null for system events) |
| `action` | String(200) | NOT NULL, indexed | case_created, status_changed, relationship_reviewed, etc. |
| `resource_type` | String(100) | NOT NULL, indexed | case, case_relationship, coordination_item, etc. |
| `resource_id` | Integer | nullable, indexed | ID of the affected resource |
| `description` | Text | nullable | Human-readable summary |
| `old_data` | JSON | nullable | Snapshot before change |
| `new_data` | JSON | nullable | Snapshot after change |
| `ip_address` | String(50) | nullable | Client IP |
| `user_agent` | String(500) | nullable | Client user agent |
| `created_at` | DateTime(tz) | server_default | Immutable |

---

### `import_jobs`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `filename` | String(500) | NOT NULL | Uploaded file name |
| `import_type` | String(100) | NOT NULL | institutions or cases |
| `status` | Enum(ImportStatus) | default `pending` | pending, validating, preview, importing, completed, failed, rolled_back |
| `total_rows` | Integer | default 0 | — |
| `valid_rows` | Integer | default 0 | — |
| `error_rows` | Integer | default 0 | — |
| `skipped_rows` | Integer | default 0 | — |
| `imported_rows` | Integer | default 0 | — |
| `error_summary` | JSON | nullable | Summary of validation errors |
| `notes` | Text | nullable | — |
| `imported_by_id` | Integer | FK → users.id, nullable | — |
| `started_at` | DateTime(tz) | nullable | — |
| `completed_at` | DateTime(tz) | nullable | — |
| `created_at` | DateTime(tz) | server_default | — |

**Relationships:** has-many `import_rows` (cascade)

---

### `import_rows`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `job_id` | Integer | FK → import_jobs.id ON DELETE CASCADE, NOT NULL, indexed | — |
| `row_number` | Integer | NOT NULL | 1-indexed CSV row number |
| `raw_data` | JSON | nullable | Original parsed row data |
| `status` | String(50) | NOT NULL, default `pending` | pending, valid, error, skipped, imported |
| `errors` | JSON | nullable | Field-level validation errors |
| `warnings` | JSON | nullable | Non-fatal warnings |
| `created_resource_id` | Integer | nullable | ID of the created institution/case |

---

### `deadline_rules`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `name` | String(255) | NOT NULL | Rule display name |
| `applies_to` | String(100) | NOT NULL | case_category, coordination, bureau |
| `applies_to_value` | String(200) | nullable | e.g. "Fee Structure" (for case_category) |
| `days_to_resolve` | Integer | NOT NULL, default 30 | SLA days |
| `escalation_after_days` | Integer | nullable | Escalation trigger (if rule supports it) |
| `is_active` | Boolean | default True | — |
| `created_at` | DateTime(tz) | server_default | — |

---

### `case_deadlines`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | Integer | PK | — |
| `case_id` | Integer | FK → cases.id ON DELETE CASCADE, NOT NULL, indexed | — |
| `deadline_rule_id` | Integer | FK → deadline_rules.id, nullable | Originating rule |
| `due_date` | DateTime(tz) | NOT NULL | Computed deadline |
| `is_overdue` | Boolean | default False | Recalculated periodically |
| `is_extended` | Boolean | default False | — |
| `extension_reason` | Text | nullable | — |
| `extended_by_id` | Integer | FK → users.id, nullable | — |
| `extended_at` | DateTime(tz) | nullable | — |
| `created_at` | DateTime(tz) | server_default | — |

---

## 3. Entity Relationship Diagram (ASCII)

```
users
  │id, email, role, bureau_id, account_status, is_active
  │
  ├──< audit_events (user_id)
  ├──< notifications (user_id)
  ├──< case_actions (performed_by_id)
  ├──< case_assignments (assigned_to_id, assigned_by_id)
  ├──< cases (assigned_officer_id, created_by_id)
  ├──< coordination_items (owner_id, decision_by_id, closed_by_id, created_by_id)
  ├──< coordination_participants (user_id)
  ├──< coordination_tasks (assigned_to_id, completed_by_id, created_by_id)
  ├──< transfer_requests (requested_by_id, responded_by_id)
  ├──< relationship_reviews (reviewer_id)
  ├──< institution_identifiers (verified_by_id)
  ├──< institutions (created_by_id)
  └──< import_jobs (imported_by_id)

bureaus
  │id, code, name, is_active
  │
  ├──< cases (bureau_id)
  ├──< case_assignments (bureau_id)
  ├──< coordination_participants (bureau_id)
  ├──< transfer_requests (from_bureau_id, to_bureau_id)
  └── [users.bureau_id — denormalised, no FK]

institutions
  │id, canonical_name, state, region, aicte_id
  │
  ├──< institution_identifiers (institution_id) [cascade delete]
  └──< cases (institution_id)

cases
  │id, case_number, institution_id, bureau_id, status, priority
  │
  ├──< case_actions (case_id) [cascade delete]
  ├──< case_assignments (case_id) [cascade delete]
  ├──< case_relationships (case_a_id) [cascade delete]
  ├──< case_relationships (case_b_id)
  ├──< transfer_requests (case_id)
  ├──< notifications (related_case_id)
  └──< case_deadlines (case_id) [cascade delete]

case_relationships
  │id, case_a_id, case_b_id, relationship_type, score,
  │reasons, matching_evidence, algorithm_version, review_status
  │
  ├──< relationship_reviews (relationship_id) [cascade delete]
  └──<─ coordination_items (source_relationship_id)

coordination_items
  │id, reference_number, status, decision, owner_id
  │
  ├──< coordination_participants (coordination_item_id) [cascade delete]
  ├──< coordination_tasks (coordination_item_id) [cascade delete]
  └──< notifications (related_coordination_id)

import_jobs
  │id, import_type, status, filename
  │
  ├──< import_rows (job_id) [cascade delete]
  └──< cases (import_job_id)

deadline_rules
  │id, applies_to, days_to_resolve
  └──< case_deadlines (deadline_rule_id)
```

---

## 4. Key Design Decisions

**Why `bureau_id` is denormalised on `users`:** Bureau officers frequently filter data by their bureau. Keeping `bureau_id` directly on the user avoids a join on every request. The trade-off is that a user's bureau change requires updating both the user record and any active assignments.

**Why `case_relationships` is directional:** `case_a_id` carries the cascade delete; `case_b_id` does not. This prevents orphaned relationship records without deleting the "other side" case. Queries must use OR: `(case_a_id = X) OR (case_b_id = X)`.

**Why `reasons` and `matching_evidence` are JSON:** Explainability data is algorithm-dependent and must be human-readable. JSON is flexible enough to accommodate different algorithm outputs without schema migrations.

**Why `institution_identifiers` is a separate table:** A single institution may have multiple identifier types from different systems (AICTE Permanent ID, AISHE ID, NIC ID, etc.). This design supports multi-identifier matching for deduplication without adding nullable columns to the institutions table.

**Why audit_events has no FK enforcement on `resource_id`:** The audit log must survive resource deletion. Using a plain integer rather than a FK preserves historical records.
