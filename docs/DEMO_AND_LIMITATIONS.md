# NYAYA-SETU — Demo Guide and Known Limitations
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard
### SIH Prototype — Demo Walkthrough

> **IMPORTANT:** All data in this system is **DEMO/SYNTHETIC**. It is NOT official AICTE data.  
> None of the institutions, cases, complaints, officers, or statistics represent real AICTE records.  
> This prototype was built for the Smart India Hackathon evaluation only.

---

## Demo Credentials

All accounts are pre-created by `backend/seed.py`. Passwords shown below are for demo use only.

| Email | Password | Role | Bureau | Name |
|---|---|---|---|---|
| `admin@aicte.demo` | `Admin@123456` | System Admin | — | System Administrator |
| `management@aicte.demo` | `Demo@123456` | Senior Management | — | Dr. Rajesh Kumar (Director, AICTE) |
| `officer1@aicte.demo` | `Demo@123456` | Bureau Officer | Approval Bureau | Priya Sharma |
| `officer2@aicte.demo` | `Demo@123456` | Bureau Officer | Grievance Cell | Amit Verma |
| `reviewer@aicte.demo` | `Demo@123456` | Coordination Reviewer | — | Sunita Patel |
| `regional@aicte.demo` | `Demo@123456` | Regional Officer | — | Meena Gupta |
| `datamgr@aicte.demo` | `Demo@123456` | Data Admin | — | Rahul Singh |
| `officer3@aicte.demo` | `Demo@123456` | Bureau Officer | Academic Bureau | Vikram Nair |

> **Note:** The admin account uses a distinct password (`Admin@123456`). All other demo accounts use `Demo@123456`.

---

## Starting the Demo Environment

```bash
# From the project root
docker compose up --build

# Wait for all three containers to be healthy, then in a separate terminal:
cd backend
python seed.py   # Creates demo bureaus, users, institutions, cases, relationships

# Access points
# Frontend:  http://localhost:5173
# Backend API docs (Swagger UI): http://localhost:8000/api/docs
# Backend health: http://localhost:8000/health
```

---

## 14-Step Demo Walkthrough

### Step 1 — Login as System Admin

- Open `http://localhost:5173`
- Log in as `admin@aicte.demo` / `Admin@123456`
- **What to show:** JWT-based authentication; role reflected in navigation; bureau-specific tabs absent (admin sees all)

---

### Step 2 — Explore the Dashboard

- Navigate to the Dashboard page
- **What to show:**
  - Total cases, overdue cases, pending coordination, pending transfers — all sourced from live DB queries
  - Cases by status chart (Recharts bar chart)
  - Cases by bureau breakdown (admin/management only)
  - Recent trends (monthly case creation)
  - Unreviewed relationship candidates alert badge
  - SLA compliance panel (on_track / at_risk / overdue / compliance%) — requires P0-2 to be deployed
- **Emphasise:** All figures are computed in real time from PostgreSQL. There is no hardcoded data in the frontend.

---

### Step 3 — Consolidated Case Registry

- Navigate to Cases → All Cases
- **What to show:**
  - 18 synthetic cases across 5 bureaus and 15 institutions
  - Search by title or case number (`q=fee`)
  - Filter by status (`status=under_process`), bureau, priority, category
  - Overdue filter (`overdue=true`) highlights past-SLA cases
  - Each row shows bureau, institution, status badge, priority badge, due date

---

### Step 4 — Case Detail and Action Timeline

- Click on case `AICTE-C3-{year}-00001` (IIT Delhi Fee Hike)
- **What to show:**
  - Full case details: institution, bureau, assigned officer, received date, due date
  - Action timeline tab — chronological history showing who did what and when
  - Status badge showing current state
  - Add a note: type a remark and click "Add Note" — it appears instantly in the timeline
- **Emphasise:** The timeline is the complete, immutable action history required by the problem statement.

---

### Step 5 — Status Transition with Validation

- From the case detail, attempt a status change
- **What to show:**
  - The status change form only offers valid next states (no invalid transitions appear)
  - Try to skip a state (e.g., `received` → `disposed`): backend returns 422 with allowed transitions listed
  - Make a valid transition (`triaged` → `assigned`) with a reason
  - Confirm the new status and the new timeline entry

---

### Step 6 — Institution 360 View

- Navigate to Institutions
- **What to show:**
  - 15 synthetic institutions with canonical names, state, region, type
  - Search by name
  - Click on "Vellore Institute of Technology"
  - Institution detail: AICTE Permanent ID identifier, all cases linked to this institution
- **Emphasise:** Multi-identifier support (AICTE ID, AISHE ID, etc.) is the foundation of deduplication.

---

### Step 7 — AI-Assisted Relationship Detection (Same Institution)

- Navigate to Relationships → Inbox
- **What to show:**
  - VIT has three fee-related cases across two bureaus — the seed data pre-creates these as PENDING relationship candidates
  - Each candidate shows: relationship type, similarity score, human-readable reasons, algorithm version
  - Example: "Possible Duplicate — score 0.87 — Same institution (VIT), Same category (Fee Structure), Title overlap ratio: 0.72"
- **Emphasise:** These are **suggestions** requiring human review. No automatic action has been taken.

---

### Step 8 — Human Review of a Relationship Candidate

- From the Relationship Inbox, open the VIT duplicate candidate
- **What to show:**
  - Full explainability card: matching evidence JSON, algorithm name, score breakdown
  - Click "Confirm Relationship" with a rationale
  - System responds: "Review recorded. No auto-merge or auto-close was performed."
  - Status changes to `confirmed` — cases remain untouched
- **Emphasise:** The system explicitly prohibits automatic case merging or disposal. This is by design.

---

### Step 9 — Cross-Bureau Coordination (CCP)

- Navigate to Coordination
- **What to show:**
  - 5 pre-seeded coordination items in various stages (DETECTED, ACTIVE, UNDER_REVIEW, CLOSED)
  - Open CCP-2024-0001 "VIT Fee Hike — Cross-Bureau Coordination"
  - Participants: Approval Bureau + Grievance Cell — both involved in VIT fee cases
  - Task assigned to officer: "Gather relevant case documents from all bureaus"
  - Acknowledge-by and action-due-date deadlines visible
- **Emphasise:** This is the coordination workflow that prevents two bureaus issuing conflicting remediation orders.

---

### Step 10 — SLA and Overdue Monitoring

- Return to Cases, apply `overdue=true` filter
- **What to show:**
  - Amity Unauthorized Program (escalated, 30 days overdue) and SPPU Exam Irregularities appear
  - Dashboard shows `overdue_cases` count
  - SLA panel (if P0-2 deployed): on_track / at_risk / overdue / compliance %
- **Emphasise:** No case is auto-escalated — officers receive alerts and must act manually.

---

### Step 11 — Reports and CSV Export

- Navigate to Reports
- **What to show:**
  - Filter by bureau: download Approval Bureau cases as CSV
  - Filter by status: download all escalated cases
  - Filter by institution: download all VIT cases
  - The CSV opens in Excel/LibreOffice with correct columns: case_number, title, status, bureau, institution, category, received_date, due_date
- **Emphasise:** Region-wise and bureau-wise reports fulfil the AICTE problem statement's reporting requirements.

---

### Step 12 — CSV Import (Data Admin)

- Log out, log in as `datamgr@aicte.demo` / `Demo@123456`
- Navigate to Import
- **What to show:**
  - Upload a sample CSV of institutions (preview_only=true)
  - System validates each row and shows valid/error counts before committing
  - Each row shows field-level errors if present
  - Confirm import — new institutions appear in the registry

---

### Step 13 — Role-Based Access Scoping

- Log out, log in as `officer1@aicte.demo` (Approval Bureau officer)
- **What to show:**
  - Cases list shows only Approval Bureau cases — Grievance Cell cases are hidden
  - Dashboard shows only Approval Bureau statistics
  - Relationship scan button is absent (Bureau Officers cannot trigger detect-all)
  - Audit log is not accessible (Bureau Officers cannot view system-wide audit trail)
- **Emphasise:** RBAC is enforced server-side in every endpoint — it cannot be bypassed by manipulating the URL.

---

### Step 14 — Audit Log (System Admin)

- Log back in as `admin@aicte.demo`
- Navigate to Audit Log
- **What to show:**
  - Every action from Steps 4–13 is recorded: case creation, status changes, relationship review, coordination decision, login events
  - Each entry: timestamp, actor (user name), action type, resource type, resource ID, description
  - Filter by resource_type=case to see case-specific history
- **Emphasise:** The audit log is append-only and cannot be modified through the UI. It satisfies the "complete chronological action history" requirement.

---

## What Data is Synthetic

The following data was created by `backend/seed.py` for demonstration purposes only. None of it represents real AICTE activity.

| Data Category | Count | Notes |
|---|---|---|
| Bureaus | 5 | APPR, ACAD, GRVN, COMP, RSRCH — illustrative names, not official AICTE bureau structure |
| Users | 8 | Fictional officers with invented names |
| Institutions | 15 | Real institution names used for familiarity, but all complaint data is entirely fabricated |
| Cases | 18 | Completely invented complaints, dates, categories, and priorities |
| Case relationships | 6 | Pre-seeded to demonstrate the inbox without requiring manual detection |
| Coordination items | 5 | Pre-seeded to demonstrate the CCP workflow |
| Notifications | seeded per user | Synthetic notifications for demonstration |

> Real institution names (IIT Delhi, VIT, BITS Pilani, etc.) are used purely so evaluators can recognise the entities in the demo. The complaints associated with them are entirely fictional and do not reflect any actual AICTE proceeding.

---

## Known Limitations

### Technical Limitations

| # | Limitation | Impact | Mitigation |
|---|---|---|---|
| L1 | **No real AICTE API integration.** The system cannot pull live complaints from AICTE's existing intake portals (PGRC portal, AICTE grievance system). | All data must be manually entered or imported via CSV. | CSV import pipeline implemented; API integration is future work after official access is granted. |
| L2 | **PostgreSQL only — not SQLite.** The system requires a running PostgreSQL 15 instance. SQLite is not supported. | Evaluators must run via Docker Compose or have a local PostgreSQL instance. | Docker Compose setup fully configured; `docker compose up --build` is the one-step start. |
| L3 | **No email / SMS delivery.** Notifications are in-app only. Officers do not receive email or SMS when assigned a case or when a deadline is breached. | Reduces responsiveness in production use. | Email integration (SMTP/SendGrid) is planned as a post-SIH enhancement. |
| L4 | **`rapidfuzz` cross-bureau matching not yet live.** The `detect_cross_bureau_relationships()` function is defined in the roadmap (P0-3) but not yet in `matching.py`. | Cross-bureau fuzzy institution name matching is not triggerable from the UI. | Same-institution word-overlap matching is live. Cross-bureau matching will be added per P0-3. |
| L5 | **`POST /relationships/detect-all` not yet live.** The bulk scan endpoint is roadmapped (P0-4). | Admins cannot trigger a system-wide relationship scan from the UI in one click. | Per-case detection via `POST /relationships/detect/{case_id}` is live. |
| L6 | **`GET /analytics/sla-status` not yet live.** The SLA compliance analytics endpoint is roadmapped (P0-2). | The SLA panel on the Dashboard page is not yet connected to backend data. | `due_date` overdue filter on `GET /cases/` and ageing buckets on `GET /analytics/cases/ageing` provide SLA visibility. |
| L7 | **No file / document attachment storage.** Case actions can reference documents in text only. | Officers cannot upload inspection reports or correspondence directly. | Text-based document references work; binary file storage (S3/local) is future work. |
| L8 | **No transfer accept/reject endpoint.** The transfer request endpoint exists but there is no endpoint for the receiving bureau to accept or reject. | Transfer workflow is one-way in the current prototype. | Transfer request is recorded and visible; accept/reject UI is a short implementation. |
| L9 | **JWT tokens are not blacklisted on logout.** Logout is client-side only. A stolen token remains valid until expiry. | Security risk in production. | Token expiry is configurable. Production deployment should add Redis-backed token blacklisting. |
| L10 | **No automatic deadline rule application.** `DeadlineRule` and `CaseDeadline` models exist but no logic automatically sets a `due_date` on case creation based on the category-level rule. | Officers must manually set `due_date` when creating a case. | Manual `due_date` input works; automatic rule application is a short backend enhancement. |
| L11 | **No region filter on `GET /cases/`** directly. Region is stored on `Institution`, not `Case`. | Filtering cases by region requires using the institution_id filter. | Region-based institution lookup can be combined with the institution_id filter as a workaround. |
| L12 | **No date range filter on `GET /cases/`** list. The reports CSV export supports date range; the paginated list does not. | Cases list cannot be filtered by received_from / received_to. | Reports CSV endpoint supports full date range filtering. |
| L13 | **No automated tests.** `backend/tests/` is empty. | Cannot guarantee regression-free behaviour automatically. | Manual acceptance testing via seed data and the steps in TESTING_AND_ACCEPTANCE.md covers all key scenarios. Tests are being written (P2-1, P2-2). |
| L14 | **Dev server (Uvicorn --reload) in Docker.** The Docker Compose setup runs Uvicorn in development mode with hot-reload. | Not suitable for production load. | For SIH evaluation this is intentional (allows live changes). Production would use gunicorn with multiple workers behind Nginx. |

---

## Future AICTE Integration Plan

The following integrations are planned once official access is granted by AICTE. None are implemented in this prototype.

| Integration | Description | Dependency |
|---|---|---|
| **AICTE Grievance Portal API** | Pull live complaints from AICTE's existing PGRC and RB intake systems | Official API credentials from AICTE IT cell |
| **AISHE Database Sync** | Verify and enrich institution records from the All India Survey on Higher Education database | MOU with Ministry of Education |
| **AICTE Permanent ID Validation** | Real-time validation of institution AICTE IDs against official registry | AICTE data services access |
| **NIC SSO Integration** | Replace demo accounts with NIC single sign-on for AICTE officials | NIC directory integration |
| **Email / SMS Notifications** | Send deadline alerts and assignment notifications via official government messaging services | SMTP credentials or NIC messaging API |
| **Document Management** | Store and retrieve case-related documents via NIC's eSanchar or an approved DMS | Approved government document storage |
| **Audit Report Export to MIS** | Push audit logs to AICTE's central Management Information System | MIS API access |

---

## Evaluator Notes for SIH Judges

1. **Start with `admin@aicte.demo`** to see the full system view (all bureaus, audit log, user management).
2. **Then switch to `officer1@aicte.demo`** to see how bureau-scoped visibility works — the case list narrows to Approval Bureau only without any URL change needed.
3. **The Relationship Inbox** is the core innovation feature — it shows AI-detected candidates with explainability (score + reasons + algorithm evidence) waiting for human review.
4. **The Coordination module** (CCP) is the problem statement's "coordination between responsible officials" requirement — each coordination item links back to a relationship candidate and tracks which bureaus are involved, what tasks are pending, and what decision was taken.
5. All API endpoints are documented in real-time Swagger UI at `http://localhost:8000/api/docs` — useful for technical evaluation.
6. The `data_note: "DEMO DATA — Synthetic prototype"` field in every analytics response is intentional — it makes clear this is not production data.
