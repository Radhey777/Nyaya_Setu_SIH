# NYAYA-SETU — Requirements Traceability Matrix
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard

> **Source:** AICTE SIH Problem Statement — Integrated Institution Complaint Monitoring and Status Dashboard  
> **Status codes:** PASS = fully implemented · PARTIAL = partially implemented · FAIL = not implemented · BLOCKED = cannot implement without external dependency

---

## R01–R30 Requirements Matrix

| ID | Requirement | Files / Endpoints | Status |
|---|---|---|---|
| **R01** | View institution-related complaints in one consolidated place — all bureaus visible in single dashboard | `GET /cases/` (no bureau filter = all bureaus for admin); `GET /analytics/dashboard`; `frontend/src/pages/cases/CasesListPage.tsx` | **PASS** |
| **R02** | Identify which Bureau/Cell currently handles each case | `Case.bureau_id` FK to `bureaus`; `GET /cases/` returns `bureau` nested object; Cases list page shows bureau column | **PASS** |
| **R03** | Track case status — current status visible at all times | `Case.status` (12-state enum); `GET /cases/{id}` returns status; status badge on cases list | **PASS** |
| **R04** | Track case movement — transition history recorded | `case_actions` table records every status change with `old_status`, `new_status`, `performed_by_id`, timestamp; `GET /cases/{id}/timeline` | **PASS** |
| **R05** | Track case ownership — responsible officer at all times | `Case.assigned_officer_id`; `case_assignments` table (historical); `POST /cases/{id}/assign`; assignment shown on detail page | **PASS** |
| **R06** | Track case actions and action history with responsible official, timestamp, and remarks | `case_actions` table: `performed_by_id`, `created_at`, `description`, `action_type`; `GET /cases/{id}/timeline`; `POST /cases/{id}/actions` | **PASS** |
| **R07** | Detect potential overlaps involving RB, PGRC, and other Bureaus/Cells | `detect_relationships()` in `app/services/matching.py` (same-institution matching); `detect_cross_bureau_relationships()` planned (P0-3); `case_relationships` table | **PARTIAL** — same-institution matching implemented; cross-bureau fuzzy matching (P0-3) not yet in code |
| **R08** | Link related cases and support coordination between responsible officials | `case_relationships` table; `GET /relationships/`; `coordination_items` + `coordination_participants`; `POST /coordination/` | **PASS** |
| **R09** | Monitor pending, under-process, disposed, transferred, and escalated cases | `CaseStatus` enum: RECEIVED, TRIAGED, ASSIGNED, UNDER_PROCESS, AWAITING_INFORMATION, DECISION_REVIEW, DISPOSED, TRANSFER_REQUESTED, TRANSFERRED, ESCALATED, REOPENED, CLOSED; `GET /analytics/dashboard` (`cases_by_status`) | **PASS** |
| **R10** | Generate institution-wise reports | `GET /reports/cases/csv?institution_id=...`; `GET /analytics/institutions/breakdown`; institution filter on cases list | **PASS** |
| **R11** | Generate region-wise reports | `Institution.region` field; `GET /cases/?region=...` (via institution join); reports filter | **PARTIAL** — region field exists on Institution model; direct `region` query param not on `/cases/` endpoint |
| **R12** | Generate Bureau-wise reports | `GET /reports/cases/csv?bureau_id=...`; `GET /analytics/dashboard` (`cases_by_bureau`); bureau filter on cases list | **PASS** |
| **R13** | Generate status-wise reports | `GET /reports/cases/csv?status=...`; `GET /analytics/dashboard` (`cases_by_status`) | **PASS** |
| **R14** | Monitor pending cases and cases approaching or exceeding prescribed timelines (SLA) | `Case.due_date`; `GET /analytics/cases/ageing`; overdue filter on `GET /cases/?overdue=true`; `GET /analytics/sla-status` (P0-2, not yet in code) | **PARTIAL** — due_date and overdue filter implemented; `/sla-status` endpoint missing (P0-2) |
| **R15** | Search by institution name | `GET /cases/?q=...` (searches title + case number + summary); `GET /institutions/?q=...` | **PARTIAL** — search on cases does not directly search institution name; institution list search works |
| **R16** | Search by AICTE Permanent ID | `institution_identifiers` table (`id_type="aicte_permanent_id"`); `GET /institutions/` with identifier lookup | **PARTIAL** — model supports it; no dedicated `aicte_id` query param on `/cases/` |
| **R17** | Search by Case ID / case number | `GET /cases/?q=...` searches `Case.case_number`; `GET /cases/{id}` | **PASS** |
| **R18** | Filter by Bureau/Cell | `GET /cases/?bureau_id=...`; bureau dropdown on cases list page | **PASS** |
| **R19** | Filter by region | `Institution.region`; region filter on institution list; cases list has institution_id filter | **PARTIAL** — no direct region param on `/cases/` |
| **R20** | Filter by category | `GET /cases/?category=...` (ILIKE search on `Case.category`) | **PASS** |
| **R21** | Filter by status | `GET /cases/?status=...` | **PASS** |
| **R22** | Filter by date range (received date) | `GET /cases/` supports `received_from` and `received_to` params (check reports endpoint for full date range) | **PARTIAL** — date range exists in reports CSV endpoint; `/cases/` list endpoint does not expose `received_from`/`received_to` params |
| **R23** | Maintain chronological action history with responsible official | `case_actions.performed_by_id` → `users.full_name`; timestamp `created_at`; ordered in `GET /cases/{id}/timeline` | **PASS** |
| **R24** | Action history includes remarks | `case_actions.description` field stores remarks | **PASS** |
| **R25** | Action history includes supporting-document references | `case_actions.description` can reference documents textually; no file attachment storage | **PARTIAL** — document references via text only; no binary file storage |
| **R26** | Action history includes transfer/escalation history | `CaseAction` records `transfer_requested`, `status_change` actions; `transfer_requests` table | **PASS** |
| **R27** | Use identifier matching + fuzzy matching for related complaint detection | `detect_relationships()` uses word-overlap ratio; `detect_cross_bureau_relationships()` planned with `rapidfuzz.fuzz.token_sort_ratio` (P0-3) | **PARTIAL** — baseline word-overlap implemented; rapidfuzz cross-bureau matching not yet in code |
| **R28** | Explainable alerts — system shows reasons, not just flags | `CaseRelationship.reasons` (JSON array of human-readable reasons); `CaseRelationship.matching_evidence` (JSON with algorithm details, scores, field values used); shown in relationship inbox UI | **PASS** |
| **R29** | Human review and coordinated action — AI must not auto-decide | `POST /relationships/{id}/review` explicitly states "No auto-merge or auto-close was performed"; `ReviewStatus.PENDING` default; human submits confirm/reject/correct decision | **PASS** |
| **R30** | Internal dashboard only — no public portal for students/institutions | Login required on all API endpoints (JWT `Depends(get_current_active_user)`); `POST /auth/signup` creates PENDING accounts requiring admin approval; no public complaint submission form | **PASS** |

---

## Summary Counts

| Status | Count |
|---|---|
| PASS | 19 |
| PARTIAL | 9 |
| FAIL | 0 |
| BLOCKED | 0 |

---

## PARTIAL Requirements — Remediation Notes

| ID | Gap | Remediation |
|---|---|---|
| R07 | Cross-bureau fuzzy matching not yet in `matching.py` | Implement P0-3: `detect_cross_bureau_relationships()` with rapidfuzz |
| R11 | No `region` filter directly on `/cases/` list endpoint | Add `region` query param that joins `institutions` on `state`/`region` |
| R14 | `/analytics/sla-status` endpoint missing | Implement P0-2 as specified in IMPLEMENTATION_ROADMAP.md |
| R15 | Case search does not search institution name | Add institution name ILIKE join to `/cases/?q=` handler |
| R16 | No `aicte_id` param on case search | Add AICTE ID lookup via `institution_identifiers` join |
| R19 | Region filter not on `/cases/` | Same as R11 |
| R22 | Date range params not on `/cases/` list | Add `received_from` / `received_to` query params to `list_cases()` |
| R25 | No file attachment storage | Add file upload endpoint; store path/reference in `case_actions` |
| R27 | Cross-bureau rapidfuzz matching not implemented | Implement P0-1 and P0-3 |
