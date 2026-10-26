# NYAYA-SETU — Project Audit Report
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard
### SIH Prototype

> **Audited:** Post-implementation state  
> **Stack:** FastAPI 0.143 · SQLAlchemy 2.1 · PostgreSQL 15 · React 18 + Vite + TypeScript · Docker Compose  
> **All data is DEMO/SYNTHETIC unless explicitly noted.**

---

## Executive Summary

The AICTE C³ prototype is a multi-bureau complaint coordination dashboard built with a FastAPI backend, PostgreSQL database, and React/TypeScript frontend. The backend is substantially complete: models, migrations, API routing, authentication, case lifecycle management, relationship detection, coordination workflow, and analytics are all implemented. Key gaps are test coverage (backend tests directory is empty), one missing analytics endpoint (`/sla-status`), one missing relationship endpoint (`/detect-all`), and the `rapidfuzz` dependency is not yet pinned in `requirements.txt`.

---

## Feature Audit Table

| Feature | Frontend | Backend | DB | Tests | **Status** | **Gaps / Notes** |
|---|---|---|---|---|---|---|
| **Auth — JWT login** | ✅ Login page, token storage | ✅ `POST /auth/login` (OAuth2 password form, bcrypt, JWT) | ✅ `users` table | ❌ MISSING | **IMPLEMENTED** | Token blacklisting not implemented (stateless logout only) |
| **Auth — signup + admin approval** | ✅ Signup form | ✅ `POST /auth/signup` (forces PENDING status, BUREAU_OFFICER role) | ✅ `AccountStatus.PENDING` | ❌ MISSING | **IMPLEMENTED** | No email notification on approval |
| **Auth — profile view/edit** | ✅ Profile page | ✅ `GET /auth/me`, `PUT /auth/me` | ✅ | ❌ MISSING | **IMPLEMENTED** | Only `full_name` and `designation` are editable |
| **RBAC — 6 roles** | ✅ Role guards on routes/buttons | ✅ `require_roles()` decorator, `UserRole` enum (SYSTEM_ADMIN, SENIOR_MANAGEMENT, BUREAU_OFFICER, REGIONAL_OFFICER, DATA_ADMIN, COORDINATION_REVIEWER) | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **RBAC — bureau-scoped visibility** | ✅ Bureau filter from JWT | ✅ `list_cases()` filters by `bureau_id` for BUREAU_OFFICER | ✅ | ❌ MISSING | **IMPLEMENTED** | Scoping verified in code; no automated test |
| **Institution 360 — registry** | ✅ Institution list + detail page | ✅ `GET /institutions/`, `GET /institutions/{id}` | ✅ `institutions`, `institution_identifiers` tables | ❌ MISSING | **IMPLEMENTED** | — |
| **Institution 360 — multi-identifier** | ✅ Identifier display | ✅ `InstitutionIdentifier` model (aicte_permanent_id, aishe_id, etc.) | ✅ | ❌ MISSING | **IMPLEMENTED** | No real-time AICTE DB sync |
| **Case registry — create** | ✅ Create case form | ✅ `POST /cases/` with institution validation and auto case number | ✅ `cases` table | ❌ MISSING | **IMPLEMENTED** | — |
| **Case registry — list + filter** | ✅ Cases list with search, filters | ✅ `GET /cases/` with `q`, `status`, `bureau_id`, `institution_id`, `priority`, `category`, `overdue` params | ✅ | ❌ MISSING | **IMPLEMENTED** | No region filter on case list endpoint |
| **Case registry — detail** | ✅ Case detail page | ✅ `GET /cases/{id}` with joined institution, bureau, officer, actions | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Status transitions — valid/guarded** | ✅ Status change UI | ✅ `POST /cases/{id}/status` with `VALID_TRANSITIONS` map, reason required | ✅ `case_actions` | ❌ MISSING | **IMPLEMENTED** | 12-status lifecycle fully encoded |
| **Timeline / action history** | ✅ Timeline tab | ✅ `GET /cases/{id}/timeline` (ordered by `created_at`) | ✅ `case_actions` with `performed_by_id`, `old_status`, `new_status` | ❌ MISSING | **IMPLEMENTED** | Document attachment references not stored |
| **Add manual action/note** | ✅ Note form | ✅ `POST /cases/{id}/actions` | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Case assignment** | ✅ Assign officer UI | ✅ `POST /cases/{id}/assign` (closes previous assignment record) | ✅ `case_assignments` | ❌ MISSING | **IMPLEMENTED** | — |
| **Transfer / escalation request** | ✅ Transfer form | ✅ `POST /cases/{id}/transfer` (creates `TransferRequest`, sets status to `TRANSFER_REQUESTED`) | ✅ `transfer_requests` | ❌ MISSING | **IMPLEMENTED** | No endpoint to accept/reject transfers |
| **Relationship matching — same-institution** | ✅ Relationship inbox | ✅ `detect_relationships()` in `matching.py` (category + word-overlap scoring) | ✅ `case_relationships` | ❌ MISSING | **IMPLEMENTED** | Uses word-overlap only; `rapidfuzz` not yet in `requirements.txt` |
| **Relationship matching — cross-bureau** | ✅ Inbox shows cross-bureau flags | ❌ `detect_cross_bureau_relationships()` NOT YET IN CODE (P0-3 roadmap item) | ✅ schema supports it | ❌ MISSING | **PARTIAL** | `rapidfuzz` not in `requirements.txt` (P0-1); function not yet written (P0-3) |
| **Bulk relationship scan (`/detect-all`)** | ✅ Button planned (P1-4) | ❌ `POST /relationships/detect-all` NOT YET IN CODE (P0-4 roadmap item) | ✅ | ❌ MISSING | **PARTIAL** | Endpoint missing; single-case `/detect/{case_id}` exists |
| **Human review workflow** | ✅ Review actions (confirm/reject/correct) | ✅ `POST /relationships/{id}/review` (saves `RelationshipReview`, updates `review_status`; explicitly never auto-merges) | ✅ `relationship_reviews` | ❌ MISSING | **IMPLEMENTED** | — |
| **Explainable alerts** | ✅ Shows reasons/score | ✅ `reasons` and `matching_evidence` JSON fields on `CaseRelationship` | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **CCP coordination — create/list** | ✅ Coordination list | ✅ `GET /coordination/`, `POST /coordination/` | ✅ `coordination_items` | ❌ MISSING | **IMPLEMENTED** | — |
| **CCP coordination — participants/tasks** | ✅ Coordination detail | ✅ Participants and tasks within coordination detail endpoints | ✅ `coordination_participants`, `coordination_tasks` | ❌ MISSING | **IMPLEMENTED** | — |
| **SLA / deadline tracking (model)** | ✅ Due date display | ✅ `due_date` on `Case`; `DeadlineRule`, `CaseDeadline` models exist | ✅ `deadline_rules`, `case_deadlines` | ❌ MISSING | **IMPLEMENTED (partial)** | No automatic deadline rule application on case creation |
| **SLA analytics endpoint** | ✅ Dashboard panel planned (P1-2) | ❌ `GET /analytics/sla-status` NOT YET IN CODE (P0-2 roadmap item) | ✅ | ❌ MISSING | **MISSING** | Endpoint not yet added; roadmap specifies exact code |
| **Dashboard analytics** | ✅ Dashboard page with charts | ✅ `GET /analytics/dashboard` (role-scoped, live DB queries) | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Case ageing analytics** | ✅ Charts component | ✅ `GET /analytics/cases/ageing` | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Case trends analytics** | ✅ Charts component | ✅ `GET /analytics/cases/trends` | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Institution breakdown analytics** | ✅ Charts component | ✅ `GET /analytics/institutions/breakdown` | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Coordination backlog analytics** | ✅ Charts component | ✅ `GET /analytics/coordination/backlog` | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **Reports — CSV export** | ✅ Export button | ✅ `GET /reports/cases/csv`, `GET /reports/coordination/csv` | ✅ | ❌ MISSING | **IMPLEMENTED** | No PDF export |
| **Reports — institution/bureau/region/status views** | ✅ Reports page | ✅ Reports endpoints with filter params | ✅ | ❌ MISSING | **IMPLEMENTED** | — |
| **CSV import (institutions/cases)** | ✅ Import UI | ✅ `POST /imports/` (preview + import pipeline, ImportJob tracking) | ✅ `import_jobs`, `import_rows` | ❌ MISSING | **IMPLEMENTED** | — |
| **Notifications — in-app** | ✅ Notification bell | ✅ `GET /notifications/`, `POST /notifications/{id}/read` | ✅ `notifications` | ❌ MISSING | **IMPLEMENTED** | No email/SMS delivery |
| **Audit log** | ✅ Audit log page | ✅ `GET /audit/`, `log_audit()` called from all mutation endpoints | ✅ `audit_events` | ❌ MISSING | **IMPLEMENTED** | — |
| **Data provenance labels** | ✅ Demo banner | ✅ `data_note: "DEMO DATA — Synthetic prototype"` in all analytics responses | ✅ `data_source`, `import_notes` fields | ❌ MISSING | **IMPLEMENTED** | — |

---

## Honest Assessment of Test Coverage

**Backend tests:** The `backend/tests/` directory exists but is empty. No pytest tests have been written or executed. All "Tests" cells above are marked ❌ MISSING.

**Frontend tests:** No Vitest or Jest configuration found. No frontend tests exist.

**Manual smoke testing:** The seed script and Docker Compose setup allow manual smoke testing of all features. No automated test has been run or verified.

---

## Critical Items Before Demo (P0)

| Item | Description | Impact |
|---|---|---|
| P0-1 | Add `rapidfuzz==3.9.7` to `requirements.txt` | Import failure at startup if cross-bureau matching is used |
| P0-2 | Add `GET /analytics/sla-status` endpoint | SLA monitoring requirement (R08) unmet |
| P0-3 | Add `detect_cross_bureau_relationships()` to `matching.py` | Cross-bureau overlap detection (R04) unmet |
| P0-4 | Add `POST /relationships/detect-all` endpoint | Administrative bulk scan not possible |

---

## Minor Gaps (Non-blocking)

- No transfer accept/reject endpoint (the requesting side exists).
- No automatic deadline rule assignment when a case is created.
- No real-time AICTE API integration (all data is synthetic seed data).
- No email delivery for notifications.
- No document/attachment file upload (references only).
- Token blacklisting on logout not implemented.
