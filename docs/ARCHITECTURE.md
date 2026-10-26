# NYAYA-SETU — Architecture Document
## AICTE C³ Integrated Institution Complaint Monitoring Dashboard

---

## 1. Stack Overview

| Layer | Technology | Version |
|---|---|---|
| **Backend framework** | FastAPI | 0.143 |
| **ORM** | SQLAlchemy | 2.1 |
| **Database** | PostgreSQL | 15 (Alpine) |
| **Migrations** | Alembic | — |
| **Auth** | JWT (python-jose / passlib bcrypt) | — |
| **Frontend framework** | React | 18.3.1 |
| **Frontend language** | TypeScript | 5.7.2 |
| **Frontend build** | Vite | 6.0.7 |
| **CSS** | Tailwind CSS | 3.4.17 |
| **HTTP client** | Axios | 1.7.9 |
| **Data fetching** | TanStack React Query | 5.62.0 |
| **Charts** | Recharts | 2.13.3 |
| **Form handling** | react-hook-form + zod | 7.54 / 3.23 |
| **Containerisation** | Docker Compose | 3.9 |
| **Test runner** | pytest + pytest-asyncio | (to be verified) |

---

## 2. High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE                                │
│                                                                       │
│  ┌──────────────────┐    HTTP/REST     ┌───────────────────────────┐ │
│  │                  │  (port 8000)     │                           │ │
│  │  FRONTEND        │◄────────────────►│  BACKEND                  │ │
│  │  React 18 + Vite │  JSON API        │  FastAPI + Uvicorn        │ │
│  │  TypeScript      │  /api/v1/...     │                           │ │
│  │  Tailwind CSS    │                  │  ┌─────────────────────┐  │ │
│  │  (port 5173)     │                  │  │ API Router          │  │ │
│  │                  │                  │  │ /auth /users        │  │ │
│  │  Contexts:       │                  │  │ /bureaus /insts     │  │ │
│  │  • AuthContext   │                  │  │ /cases /relations   │  │ │
│  │  • QueryClient   │                  │  │ /coordination       │  │ │
│  │                  │                  │  │ /analytics /reports │  │ │
│  │  Pages:          │                  │  │ /imports /audit     │  │ │
│  │  • Dashboard     │                  │  └──────────┬──────────┘  │ │
│  │  • Cases         │                  │             │             │ │
│  │  • Institutions  │                  │  ┌──────────▼──────────┐  │ │
│  │  • Relationships │                  │  │ Services            │  │ │
│  │  • Coordination  │                  │  │ • matching.py       │  │ │
│  │  • Reports       │                  │  │ • audit.py          │  │ │
│  │  • Audit         │                  │  │ • notification.py   │  │ │
│  │  • Settings      │                  │  └──────────┬──────────┘  │ │
│  │                  │                  │             │             │ │
│  └──────────────────┘                  │  ┌──────────▼──────────┐  │ │
│                                         │  │ SQLAlchemy ORM      │  │ │
│                                         │  │ Models & Sessions   │  │ │
│                                         │  └──────────┬──────────┘  │ │
│                                         └─────────────│─────────────┘ │
│                                                        │ port 5432     │
│                                         ┌─────────────▼─────────────┐ │
│                                         │  PostgreSQL 15            │ │
│                                         │  aicte_c3 database        │ │
│                                         │                           │ │
│                                         │  Volume: postgres_data    │ │
│                                         └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication Flow

```
Browser                     Frontend                   Backend
   │                            │                          │
   │  1. POST /auth/login        │                          │
   │  (email + password form)    │                          │
   │────────────────────────────►│                          │
   │                             │  OAuth2PasswordRequestForm│
   │                             │─────────────────────────►│
   │                             │                          │  verify_password()
   │                             │                          │  (bcrypt)
   │                             │                          │
   │                             │  200 { access_token,     │
   │                             │        token_type,       │
   │                             │        role, bureau_id } │
   │                             │◄─────────────────────────│
   │  Store token in memory      │                          │
   │  (AuthContext)              │                          │
   │                             │                          │
   │  2. Subsequent API calls    │                          │
   │  Authorization: Bearer <jwt>│                          │
   │────────────────────────────►│                          │
   │                             │  Axios interceptor adds  │
   │                             │  Authorization header    │
   │                             │─────────────────────────►│
   │                             │                          │  Depends(get_current_active_user)
   │                             │                          │  decode JWT → user_id → DB lookup
   │                             │                          │  check is_active, account_status
   │                             │  200 response data       │
   │                             │◄─────────────────────────│
   │                             │                          │
   │  3. Unauthorized call       │                          │
   │────────────────────────────►│                          │
   │                             │─────────────────────────►│
   │                             │                          │  401 Unauthorized
   │                             │◄─────────────────────────│
   │  Redirect to /login         │                          │
   │◄────────────────────────────│                          │
```

**Token characteristics:**
- Algorithm: HS256
- Expiry: configurable via `ACCESS_TOKEN_EXPIRE_MINUTES` env var
- Payload: `sub` = user ID string
- No refresh token (stateless; client must re-login on expiry)
- Logout is client-side only (no server-side token blacklist)

---

## 4. Backend Module Structure

```
backend/
├── app/
│   ├── main.py                    # FastAPI app, CORS, health endpoints, router mount
│   ├── core/
│   │   ├── config.py              # Settings (env vars via pydantic-settings)
│   │   └── security.py            # JWT creation, password hashing, role guards
│   ├── db/
│   │   ├── base.py                # SQLAlchemy Base + model imports
│   │   └── session.py             # Engine, SessionLocal, get_db dependency
│   ├── models/
│   │   ├── user.py                # User, UserRole, AccountStatus
│   │   ├── bureau.py              # Bureau
│   │   ├── institution.py         # Institution, InstitutionIdentifier
│   │   ├── case.py                # Case, CaseAction, CaseAssignment, CaseStatus, CasePriority
│   │   ├── relationship.py        # CaseRelationship, RelationshipReview, RelationshipType, ReviewStatus
│   │   ├── coordination.py        # CoordinationItem, CoordinationParticipant, CoordinationTask
│   │   ├── transfer.py            # TransferRequest, TransferStatus
│   │   ├── deadline.py            # DeadlineRule, CaseDeadline
│   │   ├── notification.py        # Notification, NotificationPriority
│   │   ├── audit.py               # AuditEvent
│   │   └── import_job.py          # ImportJob, ImportRow
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # Aggregates all endpoint routers under /api/v1
│   │       └── endpoints/
│   │           ├── auth.py        # /auth/*
│   │           ├── users.py       # /users/*
│   │           ├── bureaus.py     # /bureaus/*
│   │           ├── institutions.py# /institutions/*
│   │           ├── cases.py       # /cases/*
│   │           ├── relationships.py # /relationships/*
│   │           ├── coordination.py  # /coordination/*
│   │           ├── notifications.py # /notifications/*
│   │           ├── analytics.py   # /analytics/*
│   │           ├── reports.py     # /reports/*
│   │           ├── imports.py     # /imports/*
│   │           └── audit.py       # /audit/*
│   └── services/
│       ├── matching.py            # detect_relationships(), word-overlap scoring
│       ├── audit.py               # log_audit() helper
│       └── notification.py        # create_notification() helper
├── alembic/                       # DB migration scripts
├── tests/                         # pytest test suite (EMPTY — to be written)
├── seed.py                        # Demo data seeder
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Backend container
└── .env                           # Environment variables (not committed)
```

---

## 5. Frontend Module Structure

```
frontend/src/
├── main.tsx                       # React root, QueryClientProvider, BrowserRouter
├── App.tsx                        # Route definitions, auth guards
├── api/                           # Axios API client functions
│   ├── auth.ts
│   ├── cases.ts
│   ├── institutions.ts
│   ├── relationships.ts
│   ├── coordination.ts
│   ├── analytics.ts
│   ├── reports.ts
│   ├── notifications.ts
│   └── audit.ts
├── contexts/
│   └── AuthContext.tsx            # JWT storage, user state, login/logout
├── components/                    # Shared UI components
│   ├── Layout.tsx
│   ├── Card.tsx
│   ├── StatCard.tsx
│   ├── Badge.tsx
│   └── ...
└── pages/
    ├── auth/                      # Login, Signup
    ├── dashboard/                 # DashboardPage.tsx
    ├── cases/                     # CasesListPage, CaseDetailPage, CreateCasePage,
    │                              # RelationshipInboxPage
    ├── institutions/              # InstitutionListPage, InstitutionDetailPage
    ├── coordination/              # CoordinationListPage, CoordinationDetailPage
    ├── reports/                   # ReportsPage
    ├── audit/                     # AuditLogPage
    └── settings/                  # UsersPage, BureausPage
```

---

## 6. Data Flow — Case Creation with Relationship Detection

```
User fills Create Case form
        │
        ▼
POST /api/v1/cases/
        │
        ▼
Institution existence check (404 if not found)
        │
        ▼
Case row inserted (case_number auto-generated)
        │
        ▼
CaseAction("created") row inserted
        │
        ▼
DB commit
        │
        ▼
detect_relationships(case, db)  ← non-blocking, errors are warnings
        │
        ├─ Query siblings at same institution
        ├─ For each sibling:
        │    ├─ Check idempotency (skip if CaseRelationship already exists)
        │    ├─ Score: category_match (+0.3) + title_overlap * 0.7
        │    ├─ Classify: > 0.8 → POSSIBLE_DUPLICATE
        │    │            0.5–0.8 → RELATED_COMPLAINT
        │    │            < 0.5 → SAME_INSTITUTION_UNRELATED
        │    └─ Insert CaseRelationship(review_status=PENDING)
        │
        ▼
log_audit(case_created)
        │
        ▼
Return CaseOut JSON to frontend
        │
        ▼
Frontend invalidates React Query cache → list refreshes
```

---

## 7. Deployment Topology (Docker Compose)

```
Host machine
├── port 5173 ──► frontend container (aicte_c3_frontend)
│                  Node 20 + Vite dev server
│                  volume: ./frontend → /app
│
├── port 8000 ──► backend container (aicte_c3_backend)
│                  Python 3.11 + Uvicorn --reload
│                  env_file: ./backend/.env
│                  DATABASE_URL: postgresql://aicte_user:***@db:5432/aicte_c3
│                  volume: ./backend → /app (hot reload)
│                  depends_on: db (healthcheck)
│
└── port 5432 ──► db container (aicte_c3_db)
                   postgres:15-alpine
                   volume: postgres_data (named, persistent)
                   healthcheck: pg_isready
```

**Note:** This topology is for development/demo. A production deployment would place Nginx as a reverse proxy in front of both services, use gunicorn workers instead of --reload, and not mount source volumes.

---

## 8. Role-Based Access Control Summary

| Role | Scope | Key Permissions |
|---|---|---|
| `system_admin` | All bureaus, all data | Full CRUD; user approval; detect-all; audit log |
| `senior_management` | All bureaus, read-heavy | View all; run detect-all; approve coordination decisions |
| `bureau_officer` | Own bureau only | CRUD on own bureau's cases; request transfers |
| `regional_officer` | Read across bureaus | View all; filter by region; no mutations |
| `coordination_reviewer` | Relationships + coordination | Review relationship candidates; manage coordination items |
| `data_admin` | Import pipeline | Upload CSV; manage import jobs |

---

## 9. Relationship Detection Architecture

```
matching.py
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  detect_relationships(case, db)                             │
│  ─ Scope: cases at SAME institution                         │
│  ─ Algorithm: category_match (0.3) + word_overlap_ratio     │
│  ─ Threshold: >0.8 = POSSIBLE_DUPLICATE                     │
│                0.5–0.8 = RELATED_COMPLAINT                  │
│                <0.5 = SAME_INSTITUTION_UNRELATED            │
│  ─ Triggered: on case creation, on POST /detect/{case_id}   │
│                                                              │
│  detect_cross_bureau_relationships(case, db)  [P0-3 PENDING]│
│  ─ Scope: cases in DIFFERENT bureaus                        │
│  ─ Algorithm: rapidfuzz.fuzz.token_sort_ratio on            │
│               Institution.canonical_name                    │
│  ─ Threshold: 85/100 fuzzy score                           │
│  ─ Triggered: on POST /relationships/detect-all [P0-4]      │
│                                                              │
│  All results → CaseRelationship(review_status=PENDING)      │
│  Human review required via POST /relationships/{id}/review  │
│  No case is modified automatically                          │
└──────────────────────────────────────────────────────────────┘
```
