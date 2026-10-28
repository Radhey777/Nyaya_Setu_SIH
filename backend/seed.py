"""
AICTE C³ — Demo Seed Script
=============================
Creates demo users, bureaus, institutions, cases, relationships,
coordination items and notifications for SIH prototype demonstration.

All data is clearly labelled as DEMO/SYNTHETIC and is NOT official AICTE data.

Usage:
    cd backend
    python seed.py
"""
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.db.session import engine, SessionLocal
from app.db.base import Base  # imports all models
from app.core.security import get_password_hash
from app.models.user import User, UserRole, AccountStatus
from app.models.bureau import Bureau
from app.models.institution import Institution, InstitutionIdentifier
from app.models.case import Case, CaseAction, CaseStatus, CasePriority
from app.models.relationship import CaseRelationship, RelationshipType, ReviewStatus
from app.models.coordination import (
    CoordinationItem, CoordinationParticipant, CoordinationTask,
    CoordinationStatus, CoordinationDecision
)
from app.models.notification import Notification, NotificationPriority
from app.models.deadline import DeadlineRule
from app.models.application import Application, ApplicationType, ApplicationStage
from app.models.application_stage import StageHistory
from app.models.evc import EVCTask, EVCStatus
from app.models.undertaking import Undertaking, UndertakingStatus
from app.models.document_registry import DocumentRecord, DocumentCategory

DEMO_NOTE = "[DEMO DATA] Synthetic record — Not official AICTE data"


def create_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created")


def seed_bureaus(db: Session):
    bureaus_data = [
        {"code": "APPR", "name": "Approval Bureau", "description": "Handles institution approval and accreditation"},
        {"code": "ACAD", "name": "Academic Bureau", "description": "Academic and curriculum related matters"},
        {"code": "GRVN", "name": "Grievance Cell", "description": "Student and faculty grievance redressal"},
        {"code": "COMP", "name": "Compliance Bureau", "description": "Regulatory compliance monitoring"},
        {"code": "RSRCH", "name": "Research Bureau", "description": "Research and innovation cell"},
    ]
    created, skipped = 0, 0
    bureaus = []
    for b in bureaus_data:
        existing = db.query(Bureau).filter(Bureau.code == b["code"]).first()
        if existing:
            bureaus.append(existing)
            skipped += 1
        else:
            bureau = Bureau(**b)
            db.add(bureau)
            db.flush()
            bureaus.append(bureau)
            created += 1
    db.commit()
    print(f"✓ Bureaus: {created} created, {skipped} skipped")
    return bureaus


def seed_users(db: Session, bureaus: list):
    users_data = [
        {"email": "admin@aicte.demo", "full_name": "System Administrator",
         "role": UserRole.SYSTEM_ADMIN, "designation": "System Administrator",
         "bureau_id": None, "password": "Admin@123456"},
        {"email": "management@aicte.demo", "full_name": "Dr. Rajesh Kumar",
         "role": UserRole.SENIOR_MANAGEMENT, "designation": "Director, AICTE",
         "bureau_id": None, "password": "Demo@123456"},
        {"email": "officer1@aicte.demo", "full_name": "Priya Sharma",
         "role": UserRole.BUREAU_OFFICER, "designation": "Section Officer",
         "bureau_id": bureaus[0].id if bureaus else None, "password": "Demo@123456"},
        {"email": "officer2@aicte.demo", "full_name": "Amit Verma",
         "role": UserRole.BUREAU_OFFICER, "designation": "Grievance Officer",
         "bureau_id": bureaus[2].id if len(bureaus) > 2 else None, "password": "Demo@123456"},
        {"email": "reviewer@aicte.demo", "full_name": "Sunita Patel",
         "role": UserRole.COORDINATION_REVIEWER, "designation": "Coordination Analyst",
         "bureau_id": None, "password": "Demo@123456"},
        {"email": "datamgr@aicte.demo", "full_name": "Rahul Singh",
         "role": UserRole.DATA_ADMIN, "designation": "Data Manager",
         "bureau_id": None, "password": "Demo@123456"},
        {"email": "regional@aicte.demo", "full_name": "Meena Gupta",
         "role": UserRole.REGIONAL_OFFICER, "designation": "Regional Officer, South",
         "bureau_id": None, "password": "Demo@123456"},
        {"email": "officer3@aicte.demo", "full_name": "Vikram Nair",
         "role": UserRole.BUREAU_OFFICER, "designation": "Technical Officer",
         "bureau_id": bureaus[1].id if len(bureaus) > 1 else None, "password": "Demo@123456"},
    ]
    created, skipped = 0, 0
    users = []
    for u in users_data:
        existing = db.query(User).filter(User.email == u["email"]).first()
        if existing:
            users.append(existing)
            skipped += 1
        else:
            password = u.pop("password")
            user = User(
                hashed_password=get_password_hash(password),
                account_status=AccountStatus.ACTIVE,
                is_active=True,
                **{k: v for k, v in u.items()}
            )
            db.add(user)
            db.flush()
            users.append(user)
            created += 1
    db.commit()
    print(f"✓ Users: {created} created, {skipped} skipped")
    return users


def seed_institutions(db: Session, admin_user):
    institutions_data = [
        {"canonical_name": "Indian Institute of Technology, Delhi", "short_name": "IIT Delhi",
         "institution_type": "Centrally Funded Technical Institute", "state": "Delhi",
         "city": "New Delhi", "region": "North", "district": "New Delhi",
         "email": "info@iitd.ac.in", "website": "https://home.iitd.ac.in",
         "aicte_id": "1-430050931"},
        {"canonical_name": "Vellore Institute of Technology", "short_name": "VIT",
         "institution_type": "Deemed University", "state": "Tamil Nadu",
         "city": "Vellore", "region": "South", "district": "Vellore",
         "email": "admissions@vit.ac.in", "website": "https://vit.ac.in",
         "aicte_id": "1-9090550"},
        {"canonical_name": "Manipal Institute of Technology", "short_name": "MIT Manipal",
         "institution_type": "Deemed University", "state": "Karnataka",
         "city": "Manipal", "region": "South", "district": "Udupi",
         "email": "admissions@manipal.edu", "website": "https://manipal.edu",
         "aicte_id": "1-450150831"},
        {"canonical_name": "Delhi Technological University", "short_name": "DTU",
         "institution_type": "State University", "state": "Delhi",
         "city": "Delhi", "region": "North", "district": "North West Delhi",
         "email": "info@dtu.ac.in", "website": "https://dtu.ac.in",
         "aicte_id": "1-7731241"},
        {"canonical_name": "PSG College of Technology", "short_name": "PSG Tech",
         "institution_type": "Private Institution", "state": "Tamil Nadu",
         "city": "Coimbatore", "region": "South", "district": "Coimbatore",
         "email": "principal@psgtech.edu", "website": "https://psgtech.edu",
         "aicte_id": "1-460234512"},
        {"canonical_name": "BITS Pilani", "short_name": "BITS Pilani",
         "institution_type": "Deemed University", "state": "Rajasthan",
         "city": "Pilani", "region": "North", "district": "Jhunjhunu",
         "email": "admissions@pilani.bits-pilani.ac.in", "website": "https://www.bits-pilani.ac.in",
         "aicte_id": "1-456178321"},
        {"canonical_name": "Amity University, Noida", "short_name": "Amity",
         "institution_type": "Private University", "state": "Uttar Pradesh",
         "city": "Noida", "region": "North", "district": "Gautam Buddha Nagar",
         "email": "info@amity.edu", "website": "https://amity.edu",
         "aicte_id": "1-334512678"},
        {"canonical_name": "Jadavpur University", "short_name": "JU",
         "institution_type": "State University", "state": "West Bengal",
         "city": "Kolkata", "region": "East", "district": "South 24 Parganas",
         "email": "info@jadavpur.edu", "website": "https://jadavpur.edu",
         "aicte_id": "1-8890012"},
        {"canonical_name": "NIT Trichy", "short_name": "NIT Trichy",
         "institution_type": "National Institute of Technology", "state": "Tamil Nadu",
         "city": "Tiruchirappalli", "region": "South", "district": "Tiruchirappalli",
         "email": "director@nitt.edu", "website": "https://nitt.edu",
         "aicte_id": "1-9010290"},
        {"canonical_name": "SRM Institute of Science and Technology", "short_name": "SRM IST",
         "institution_type": "Deemed University", "state": "Tamil Nadu",
         "city": "Chennai", "region": "South", "district": "Kancheepuram",
         "email": "admissions@srmist.edu.in", "website": "https://srmist.edu.in",
         "aicte_id": "1-445678901"},
        {"canonical_name": "Thapar Institute of Engineering and Technology", "short_name": "TIET",
         "institution_type": "Deemed University", "state": "Punjab",
         "city": "Patiala", "region": "North", "district": "Patiala",
         "email": "admission@thapar.edu", "website": "https://thapar.edu",
         "aicte_id": "1-4567890"},
        {"canonical_name": "Indian Institute of Information Technology, Allahabad",
         "short_name": "IIITA", "institution_type": "IIIT",
         "state": "Uttar Pradesh", "city": "Prayagraj", "region": "North",
         "district": "Prayagraj", "email": "admissions@iiita.ac.in",
         "website": "https://iiita.ac.in", "aicte_id": "1-5678901"},
        {"canonical_name": "Chandigarh University", "short_name": "CU",
         "institution_type": "Private University", "state": "Punjab",
         "city": "Chandigarh", "region": "North", "district": "Mohali",
         "email": "admissions@cuchd.in", "website": "https://cuchd.in",
         "aicte_id": "1-6789012"},
        {"canonical_name": "Savitribai Phule Pune University", "short_name": "SPPU",
         "institution_type": "State University", "state": "Maharashtra",
         "city": "Pune", "region": "West", "district": "Pune",
         "email": "info@unipune.ac.in", "website": "https://unipune.ac.in",
         "aicte_id": "1-7890123"},
        {"canonical_name": "RV College of Engineering", "short_name": "RVCE",
         "institution_type": "Private Institution", "state": "Karnataka",
         "city": "Bengaluru", "region": "South", "district": "Bengaluru Urban",
         "email": "principal@rvce.edu.in", "website": "https://rvce.edu.in",
         "aicte_id": "1-8901234"},
    ]

    created, skipped = 0, 0
    institutions = []
    for data in institutions_data:
        aicte_id = data.pop("aicte_id")
        existing = db.query(Institution).filter(Institution.canonical_name == data["canonical_name"]).first()
        if existing:
            institutions.append(existing)
            skipped += 1
            continue
        inst = Institution(
            **data,
            data_source="demo_seed",
            import_notes=DEMO_NOTE,
            source_last_synced=datetime.now(timezone.utc),
            created_by_id=admin_user.id,
        )
        db.add(inst)
        db.flush()
        # Add AICTE identifier
        ident = InstitutionIdentifier(
            institution_id=inst.id,
            id_type="aicte_permanent_id",
            id_value=aicte_id,
            source_system="aicte_demo",
            is_primary=True,
            is_verified=True,
        )
        db.add(ident)
        db.flush()
        institutions.append(inst)
        created += 1
    db.commit()
    print(f"✓ Institutions: {created} created, {skipped} skipped")
    return institutions


def seed_cases(db: Session, institutions: list, bureaus: list, users: list):
    now = datetime.now(timezone.utc)
    officer1 = next((u for u in users if u.email == "officer1@aicte.demo"), users[0])
    officer2 = next((u for u in users if u.email == "officer2@aicte.demo"), users[0])
    officer3 = next((u for u in users if u.email == "officer3@aicte.demo"), users[0])
    bureau_appr = next((b for b in bureaus if b.code == "APPR"), bureaus[0])
    bureau_grvn = next((b for b in bureaus if b.code == "GRVN"), bureaus[0])
    bureau_acad = next((b for b in bureaus if b.code == "ACAD"), bureaus[0])
    bureau_comp = next((b for b in bureaus if b.code == "COMP"), bureaus[0])

    cases_data = [
        # Approval Bureau cases
        {"title": "Fee Hike Complaint — IIT Delhi CSE Department", "category": "Fee Structure",
         "summary": "Students allege unauthorized fee hike of 40% without prior notice for B.Tech CSE 2024 batch.",
         "status": CaseStatus.UNDER_PROCESS, "priority": CasePriority.HIGH,
         "institution": institutions[0], "bureau": bureau_appr, "officer": officer1,
         "days_ago": 45, "due_days": 15},
        {"title": "Infrastructure Non-Compliance — VIT Main Campus", "category": "Infrastructure",
         "summary": "Complaint regarding inadequate laboratory equipment and overcrowded hostels.",
         "status": CaseStatus.ASSIGNED, "priority": CasePriority.MEDIUM,
         "institution": institutions[1], "bureau": bureau_comp, "officer": officer1,
         "days_ago": 30, "due_days": 30},
        {"title": "Faculty Qualification Issues — Manipal IT Dept", "category": "Faculty",
         "summary": "Several faculty members lack required qualifications per AICTE norms.",
         "status": CaseStatus.DECISION_REVIEW, "priority": CasePriority.HIGH,
         "institution": institutions[2], "bureau": bureau_acad, "officer": officer3,
         "days_ago": 60, "due_days": -5},
        {"title": "Placement Data Misrepresentation — DTU", "category": "Placement",
         "summary": "Institution claimed 95% placement rate; actual rate appears to be 62%.",
         "status": CaseStatus.TRIAGED, "priority": CasePriority.HIGH,
         "institution": institutions[3], "bureau": bureau_appr, "officer": None,
         "days_ago": 10, "due_days": 50},
        {"title": "Student Grievance — PSG Tech Hostel", "category": "Hostel",
         "summary": "Multiple complaints about unhygienic hostel conditions and inadequate mess facilities.",
         "status": CaseStatus.UNDER_PROCESS, "priority": CasePriority.MEDIUM,
         "institution": institutions[4], "bureau": bureau_grvn, "officer": officer2,
         "days_ago": 20, "due_days": 10},
        {"title": "Fee Hike without Approval — VIT", "category": "Fee Structure",
         "summary": "VIT has reportedly increased fees for 2024-25 batch without AICTE approval.",
         "status": CaseStatus.RECEIVED, "priority": CasePriority.HIGH,
         "institution": institutions[1], "bureau": bureau_appr, "officer": None,
         "days_ago": 5, "due_days": 55},
        {"title": "BITS Pilani — Academic Calendar Non-Compliance", "category": "Academic",
         "summary": "Academic calendar does not meet minimum contact hours as prescribed.",
         "status": CaseStatus.ASSIGNED, "priority": CasePriority.LOW,
         "institution": institutions[5], "bureau": bureau_acad, "officer": officer3,
         "days_ago": 15, "due_days": 45},
        {"title": "Amity University — Unauthorized Program Offering", "category": "Program Approval",
         "summary": "Running MBA program without AICTE approval/recognition.",
         "status": CaseStatus.ESCALATED, "priority": CasePriority.URGENT,
         "institution": institutions[6], "bureau": bureau_appr, "officer": officer1,
         "days_ago": 90, "due_days": -30},
        {"title": "Jadavpur University — Research Grant Misuse", "category": "Financial",
         "summary": "Alleged misappropriation of AICTE research development grant funds.",
         "status": CaseStatus.UNDER_PROCESS, "priority": CasePriority.HIGH,
         "institution": institutions[7], "bureau": bureau_comp, "officer": officer1,
         "days_ago": 35, "due_days": 5},
        {"title": "NIT Trichy — Admission Irregularities", "category": "Admission",
         "summary": "Complaint about management quota admissions exceeding permissible limits.",
         "status": CaseStatus.DISPOSED, "priority": CasePriority.MEDIUM,
         "institution": institutions[8], "bureau": bureau_appr, "officer": officer1,
         "days_ago": 120, "due_days": None},
        {"title": "SRM IST — Infrastructure Audit Pending", "category": "Infrastructure",
         "summary": "Inspection team report indicates non-compliance in fire safety measures.",
         "status": CaseStatus.AWAITING_INFORMATION, "priority": CasePriority.MEDIUM,
         "institution": institutions[9], "bureau": bureau_comp, "officer": officer3,
         "days_ago": 25, "due_days": 35},
        {"title": "Thapar — Fee Structure Unauthorized Hike", "category": "Fee Structure",
         "summary": "B.Tech fee increased by 35% allegedly without regulatory approval.",
         "status": CaseStatus.TRIAGED, "priority": CasePriority.HIGH,
         "institution": institutions[10], "bureau": bureau_appr, "officer": None,
         "days_ago": 8, "due_days": 52},
        {"title": "IIITA — Faculty Shortage Critical", "category": "Faculty",
         "summary": "Student-faculty ratio far exceeds AICTE prescribed norms in CS dept.",
         "status": CaseStatus.ASSIGNED, "priority": CasePriority.MEDIUM,
         "institution": institutions[11], "bureau": bureau_acad, "officer": officer3,
         "days_ago": 18, "due_days": 42},
        {"title": "Chandigarh Univ — Placement Fraud Allegation", "category": "Placement",
         "summary": "Manipulated placement statistics; students claim fictitious placements recorded.",
         "status": CaseStatus.UNDER_PROCESS, "priority": CasePriority.HIGH,
         "institution": institutions[12], "bureau": bureau_appr, "officer": officer1,
         "days_ago": 40, "due_days": 20},
        {"title": "SPPU — Examination Irregularities", "category": "Examination",
         "summary": "Multiple complaints about question paper leaks in end-semester examinations.",
         "status": CaseStatus.ESCALATED, "priority": CasePriority.URGENT,
         "institution": institutions[13], "bureau": bureau_acad, "officer": officer3,
         "days_ago": 55, "due_days": -10},
        {"title": "RVCE — Infrastructure Non-Compliance Labs", "category": "Infrastructure",
         "summary": "Laboratory facilities do not meet AICTE norms for ECE department.",
         "status": CaseStatus.RECEIVED, "priority": CasePriority.LOW,
         "institution": institutions[14], "bureau": bureau_comp, "officer": None,
         "days_ago": 3, "due_days": 57},
        # Additional cases for relationship detection
        {"title": "VIT Fee Increase — Student Petition", "category": "Fee Structure",
         "summary": "Mass petition from VIT students against arbitrary fee hike in 2024.",
         "status": CaseStatus.RECEIVED, "priority": CasePriority.HIGH,
         "institution": institutions[1], "bureau": bureau_grvn, "officer": officer2,
         "days_ago": 6, "due_days": 54},
        {"title": "IIT Delhi Hostel Fee Complaint", "category": "Fee Structure",
         "summary": "Students complain about unauthorized increase in hostel fees at IIT Delhi.",
         "status": CaseStatus.TRIAGED, "priority": CasePriority.MEDIUM,
         "institution": institutions[0], "bureau": bureau_grvn, "officer": officer2,
         "days_ago": 40, "due_days": 20},
    ]

    year = now.year
    created, skipped = 0, 0
    cases = []
    admin_user = next((u for u in users if u.email == "admin@aicte.demo"), users[0])

    for idx, data in enumerate(cases_data):
        case_num = f"AICTE-C3-{year}-{idx + 1:05d}"
        existing = db.query(Case).filter(Case.case_number == case_num).first()
        if existing:
            cases.append(existing)
            skipped += 1
            continue

        institution = data["institution"]
        bureau = data["bureau"]
        officer = data.get("officer")
        days_ago = data["days_ago"]
        due_days = data.get("due_days")

        received = now - timedelta(days=days_ago)
        due = now + timedelta(days=due_days) if due_days is not None else None

        case = Case(
            case_number=case_num,
            title=data["title"],
            summary=data["summary"],
            category=data["category"],
            status=data["status"],
            priority=data["priority"],
            institution_id=institution.id,
            bureau_id=bureau.id,
            assigned_officer_id=officer.id if officer else None,
            received_date=received,
            due_date=due,
            created_by_id=admin_user.id,
            last_action_date=received + timedelta(days=2),
        )
        db.add(case)
        db.flush()

        # Add creation action
        action = CaseAction(
            case_id=case.id,
            action_type="created",
            description=f"Case created — {DEMO_NOTE}",
            new_status=CaseStatus.RECEIVED,
            performed_by_id=admin_user.id,
            created_at=received,
        )
        db.add(action)

        # Add a follow-up action if status advanced
        if data["status"] not in [CaseStatus.RECEIVED, CaseStatus.TRIAGED]:
            status_action = CaseAction(
                case_id=case.id,
                action_type="status_change",
                description=f"Status updated to {data['status'].value}",
                old_status=CaseStatus.RECEIVED,
                new_status=data["status"],
                performed_by_id=officer.id if officer else admin_user.id,
                created_at=received + timedelta(days=3),
            )
            db.add(status_action)

        db.flush()
        cases.append(case)
        created += 1

    db.commit()
    print(f"✓ Cases: {created} created, {skipped} skipped")
    return cases


def seed_relationships(db: Session, cases: list):
    """Create sample relationship candidates (some auto-detected, shown as pending review)."""
    if len(cases) < 6:
        print("⚠ Not enough cases for relationships")
        return

    relationships_data = [
        # VIT fee cases — likely duplicates
        {"case_a": cases[1], "case_b": cases[5],
         "rel_type": RelationshipType.POSSIBLE_DUPLICATE, "score": 0.87,
         "reasons": ["Same institution (VIT)", "Same category (Fee Structure)", "High title similarity"],
         "review_status": ReviewStatus.PENDING},
        # VIT fee case and VIT fee petition — related
        {"case_a": cases[5], "case_b": cases[16],
         "rel_type": RelationshipType.RELATED_COMPLAINT, "score": 0.72,
         "reasons": ["Same institution (VIT)", "Same category (Fee Structure)", "Related issue"],
         "review_status": ReviewStatus.PENDING},
        # IIT Delhi cases — same institution, different categories
        {"case_a": cases[0], "case_b": cases[17],
         "rel_type": RelationshipType.SAME_INSTITUTION_UNRELATED, "score": 0.15,
         "reasons": ["Same institution (IIT Delhi)", "Different categories"],
         "review_status": ReviewStatus.CONFIRMED},
        # Amity unauthorized + BITS non-compliance — potential action conflict
        {"case_a": cases[6], "case_b": cases[7],
         "rel_type": RelationshipType.ACTION_CONFLICT, "score": 0.55,
         "reasons": ["Similar regulatory violations in North region", "Possible conflicting remediation orders"],
         "review_status": ReviewStatus.PENDING},
        # DTU placement + Chandigarh placement — related
        {"case_a": cases[3], "case_b": cases[13],
         "rel_type": RelationshipType.RELATED_COMPLAINT, "score": 0.65,
         "reasons": ["Same category (Placement)", "Similar allegations of misrepresentation"],
         "review_status": ReviewStatus.PENDING},
        # IIT Delhi fee + IIT Delhi hostel fee — same institution
        {"case_a": cases[0], "case_b": cases[17],
         "rel_type": RelationshipType.RELATED_COMPLAINT, "score": 0.62,
         "reasons": ["Same institution", "Both fee-related"],
         "review_status": ReviewStatus.REJECTED},
    ]

    created, skipped = 0, 0
    for data in relationships_data:
        ca, cb = data["case_a"], data["case_b"]
        existing = db.query(CaseRelationship).filter(
            ((CaseRelationship.case_a_id == ca.id) & (CaseRelationship.case_b_id == cb.id)) |
            ((CaseRelationship.case_a_id == cb.id) & (CaseRelationship.case_b_id == ca.id))
        ).first()
        if existing:
            skipped += 1
            continue
        rel = CaseRelationship(
            case_a_id=ca.id,
            case_b_id=cb.id,
            relationship_type=data["rel_type"],
            score=data["score"],
            reasons=data["reasons"],
            matching_evidence={"algorithm": "baseline_v1", "demo": True},
            algorithm_version="v1.0-baseline",
            review_status=data["review_status"],
        )
        db.add(rel)
        created += 1

    db.commit()
    print(f"✓ Relationships: {created} created, {skipped} skipped")


def seed_coordination(db: Session, cases: list, users: list, bureaus: list):
    if len(cases) < 3:
        print("⚠ Not enough cases for coordination")
        return

    reviewer = next((u for u in users if u.email == "reviewer@aicte.demo"), users[0])
    admin = next((u for u in users if u.email == "admin@aicte.demo"), users[0])
    officer1 = next((u for u in users if u.email == "officer1@aicte.demo"), users[0])
    officer2 = next((u for u in users if u.email == "officer2@aicte.demo"), users[0])
    now = datetime.now(timezone.utc)

    coord_data = [
        {"ref": "CCP-2024-0001", "title": "VIT Fee Hike — Cross-Bureau Coordination",
         "description": "Approval Bureau and Grievance Cell must coordinate on VIT fee hike complaints.",
         "status": CoordinationStatus.ACTIVE, "decision": CoordinationDecision.COORDINATE,
         "owner": reviewer, "acknowledge_by": now + timedelta(days=3),
         "due": now + timedelta(days=10)},
        {"ref": "CCP-2024-0002", "title": "Amity Unauthorized Program — Multi-Bureau Review",
         "description": "Compliance and Approval Bureau joint review needed for unauthorized MBA program.",
         "status": CoordinationStatus.UNDER_REVIEW, "decision": None,
         "owner": reviewer, "acknowledge_by": now - timedelta(days=2),
         "due": now - timedelta(days=5)},
        {"ref": "CCP-2024-0003", "title": "SPPU Exam Irregularities — Academic and Grievance",
         "description": "Coordinate between Academic Bureau and Grievance Cell for exam paper leak investigation.",
         "status": CoordinationStatus.DETECTED, "decision": None,
         "owner": admin, "acknowledge_by": now + timedelta(days=7),
         "due": now + timedelta(days=21)},
        {"ref": "CCP-2024-0004", "title": "Placement Data Misrepresentation — DTU & CU",
         "description": "Related placement fraud complaints at DTU and Chandigarh University require coordinated action.",
         "status": CoordinationStatus.CLOSED, "decision": CoordinationDecision.COORDINATE,
         "owner": reviewer, "acknowledge_by": now - timedelta(days=30),
         "due": now - timedelta(days=20)},
        {"ref": "CCP-2024-0005", "title": "North Region Infrastructure Compliance Review",
         "description": "Multiple infrastructure complaints from North region; coordinate inspection schedule.",
         "status": CoordinationStatus.FOLLOW_UP, "decision": CoordinationDecision.COORDINATE,
         "owner": officer1, "acknowledge_by": now + timedelta(days=5),
         "due": now + timedelta(days=15)},
    ]

    created, skipped = 0, 0
    coord_items = []
    for data in coord_data:
        existing = db.query(CoordinationItem).filter(
            CoordinationItem.reference_number == data["ref"]
        ).first()
        if existing:
            coord_items.append(existing)
            skipped += 1
            continue

        item = CoordinationItem(
            reference_number=data["ref"],
            title=data["title"],
            description=data["description"],
            status=data["status"],
            decision=data["decision"],
            owner_id=data["owner"].id,
            acknowledge_by=data["acknowledge_by"],
            action_due_date=data["due"],
            created_by_id=admin.id,
        )
        if data["status"] == CoordinationStatus.CLOSED:
            item.closed_by_id = reviewer.id
            item.closed_at = now - timedelta(days=5)
            item.closure_notes = "Coordination completed. Both bureaus took independent action on their respective cases."

        db.add(item)
        db.flush()

        # Add participants
        if len(bureaus) >= 2:
            for bureau in bureaus[:2]:
                p = CoordinationParticipant(
                    coordination_item_id=item.id, bureau_id=bureau.id, role_in_coordination="participant",
                    acknowledged=data["status"] in [CoordinationStatus.CLOSED, CoordinationStatus.ACTIVE],
                    acknowledged_at=now - timedelta(days=10) if data["status"] == CoordinationStatus.CLOSED else None,
                )
                db.add(p)
            p2 = CoordinationParticipant(
                coordination_item_id=item.id, user_id=officer1.id, role_in_coordination="lead",
                acknowledged=True, acknowledged_at=now - timedelta(days=12)
            )
            db.add(p2)

        # Add a task
        task = CoordinationTask(
            coordination_item_id=item.id,
            title="Gather relevant case documents from all bureaus",
            description="Collect case files, communications, and inspection reports",
            assigned_to_id=officer1.id,
            due_date=data["due"] - timedelta(days=5) if data["due"] else None,
            is_completed=data["status"] == CoordinationStatus.CLOSED,
            completed_at=now - timedelta(days=7) if data["status"] == CoordinationStatus.CLOSED else None,
            completed_by_id=officer1.id if data["status"] == CoordinationStatus.CLOSED else None,
            created_by_id=admin.id,
        )
        db.add(task)
        coord_items.append(item)
        created += 1

    db.commit()
    print(f"✓ Coordination items: {created} created, {skipped} skipped")


def seed_notifications(db: Session, users: list, cases: list):
    officer1 = next((u for u in users if u.email == "officer1@aicte.demo"), users[0])
    officer2 = next((u for u in users if u.email == "officer2@aicte.demo"), users[0])

    notifications = [
        Notification(user_id=officer1.id, title="New Case Assigned",
                     message="Case AICTE-C3-2024-00001 has been assigned to you.",
                     notification_type="case_assigned", priority=NotificationPriority.MEDIUM, is_read=False),
        Notification(user_id=officer1.id, title="Overdue Case Alert",
                     message="Case related to Amity University is 30 days overdue.",
                     notification_type="overdue", priority=NotificationPriority.HIGH, is_read=False),
        Notification(user_id=officer2.id, title="Coordination Acknowledgement Required",
                     message="CCP-2024-0002 requires your acknowledgement by tomorrow.",
                     notification_type="coordination", priority=NotificationPriority.URGENT, is_read=False),
        Notification(user_id=officer1.id, title="New Relationship Candidate Detected",
                     message="AI system detected a possible duplicate between two VIT fee cases.",
                     notification_type="relationship", priority=NotificationPriority.MEDIUM, is_read=True),
    ]

    created = 0
    for n in notifications:
        existing = db.query(Notification).filter(
            Notification.user_id == n.user_id, Notification.title == n.title
        ).first()
        if not existing:
            db.add(n)
            created += 1
    db.commit()
    print(f"✓ Notifications: {created} created")


def seed_deadline_rules(db: Session):
    rules = [
        {"name": "Standard Case Resolution", "applies_to": "all", "days_to_resolve": 60, "escalation_after_days": 45},
        {"name": "Urgent Case Resolution", "applies_to": "priority", "applies_to_value": "urgent", "days_to_resolve": 15, "escalation_after_days": 10},
        {"name": "Fee Structure Cases", "applies_to": "category", "applies_to_value": "Fee Structure", "days_to_resolve": 30, "escalation_after_days": 20},
        {"name": "Coordination Acknowledgement", "applies_to": "coordination", "days_to_resolve": 7, "escalation_after_days": 5},
    ]
    created = 0
    for r in rules:
        existing = db.query(DeadlineRule).filter(DeadlineRule.name == r["name"]).first()
        if not existing:
            db.add(DeadlineRule(**r))
            created += 1
    db.commit()
    print(f"✓ Deadline rules: {created} created")


def seed_applications(db: Session, institutions: list, users: list):
    """Seed 15 Application records plus related EVC, Undertaking, and Document records."""
    now = datetime.now(timezone.utc)
    admin_user = next((u for u in users if u.email == "admin@aicte.demo"), users[0])
    officer1 = next((u for u in users if u.email == "officer1@aicte.demo"), users[0])

    # Map institution short_name → object for convenience
    inst_map = {inst.short_name: inst for inst in institutions}

    apps_data = [
        # (short_name, app_number_suffix, type, stage, region)
        ("IIT Delhi",  "NYAY-2024-00101", ApplicationType.NEW_INSTITUTION,   ApplicationStage.SCRUTINY,            "North"),
        ("VIT",        "NYAY-2024-00102", ApplicationType.PROGRAM_APPROVAL,  ApplicationStage.EVC_SCHEDULED,       "South"),
        ("MIT Manipal","NYAY-2024-00103", ApplicationType.INTAKE_INCREASE,   ApplicationStage.EVC_COMPLETED,       "South"),
        ("DTU",        "NYAY-2024-00104", ApplicationType.RENEWAL,           ApplicationStage.SAC_SHC,             "North"),
        ("PSG Tech",   "NYAY-2024-00105", ApplicationType.PROGRAM_CLOSURE,   ApplicationStage.APPROVED,            "South"),
        ("BITS Pilani","NYAY-2024-00106", ApplicationType.CONVERSION,        ApplicationStage.DEFICIENCY_RAISED,   "North"),
        ("Amity",      "NYAY-2024-00107", ApplicationType.NEW_INSTITUTION,   ApplicationStage.DEFICIENCY_RECTIFIED,"North"),
        ("JU",         "NYAY-2024-00108", ApplicationType.PROGRAM_APPROVAL,  ApplicationStage.EVC_ELIGIBLE,        "East"),
        ("NIT Trichy", "NYAY-2024-00109", ApplicationType.INTAKE_INCREASE,   ApplicationStage.SUBMITTED,           "South"),
        ("SRM IST",    "NYAY-2024-00110", ApplicationType.NEW_INSTITUTION,   ApplicationStage.REJECTED,            "South"),
        ("TIET",       "NYAY-2024-00111", ApplicationType.PROGRAM_APPROVAL,  ApplicationStage.SCRUTINY,            "North"),
        ("IIITA",      "NYAY-2024-00112", ApplicationType.RENEWAL,           ApplicationStage.EVC_ELIGIBLE,        "North"),
        ("CU",         "NYAY-2024-00113", ApplicationType.INTAKE_INCREASE,   ApplicationStage.SAC_SHC,             "North"),
        ("SPPU",       "NYAY-2024-00114", ApplicationType.CONVERSION,        ApplicationStage.APPROVED,            "West"),
        ("RVCE",       "NYAY-2024-00115", ApplicationType.PROGRAM_APPROVAL,  ApplicationStage.SCRUTINY,            "South"),
    ]

    created_apps = 0
    skipped_apps = 0
    created_evc = 0
    created_ut = 0
    created_doc = 0
    app_objects = {}

    for (short_name, app_num, app_type, stage, region) in apps_data:
        inst = inst_map.get(short_name)
        if inst is None:
            continue
        existing = db.query(Application).filter(Application.application_number == app_num).first()
        if existing:
            app_objects[short_name] = existing
            skipped_apps += 1
            continue

        app = Application(
            application_number=app_num,
            institution_id=inst.id,
            application_type=app_type,
            current_stage=stage,
            applied_year=2024,
            region=region,
            state=inst.state,
            assigned_officer_id=officer1.id,
            submitted_at=now - timedelta(days=30),
            last_stage_change_at=now - timedelta(days=10),
            blocks_workflow=False,
            escalation_flag=False,
            priority_score=5,
            data_note="[DEMO DATA] Synthetic record — Not official AICTE data.",
            is_active=True,
            created_by_id=admin_user.id,
        )
        db.add(app)
        db.flush()

        # Initial stage history
        db.add(StageHistory(
            application_id=app.id,
            from_stage=None,
            to_stage=ApplicationStage.SUBMITTED,
            action_type="advance",
            reason="Application submitted",
            performed_by_id=admin_user.id,
        ))
        if stage != ApplicationStage.SUBMITTED:
            db.add(StageHistory(
                application_id=app.id,
                from_stage=ApplicationStage.SUBMITTED,
                to_stage=stage,
                action_type="advance",
                reason="Stage advanced during seeding",
                performed_by_id=admin_user.id,
            ))
        db.flush()
        app_objects[short_name] = app
        created_apps += 1

    db.commit()
    print(f"✓ Applications: {created_apps} created, {skipped_apps} skipped")

    # ── EVC Tasks ─────────────────────────────────────────────────────────────
    evc_specs = [
        # (short_name, status, scheduled_days_from_now, completed)
        ("VIT",        EVCStatus.SCHEDULED,  7,    False),
        ("MIT Manipal",EVCStatus.COMPLETED,  -7,   True),
        ("JU",         EVCStatus.PENDING,    None, False),
        ("NIT Trichy", EVCStatus.PENDING,    None, False),
        ("TIET",       EVCStatus.PENDING,    None, False),
    ]
    for (short_name, evc_status, days, completed) in evc_specs:
        app_obj = app_objects.get(short_name)
        inst = inst_map.get(short_name)
        if app_obj is None or inst is None:
            continue
        existing_evc = db.query(EVCTask).filter(EVCTask.application_id == app_obj.id).first()
        if existing_evc:
            continue
        scheduled = now + timedelta(days=days) if days is not None else None
        evc = EVCTask(
            application_id=app_obj.id,
            institution_id=inst.id,
            status=evc_status,
            scheduled_date=scheduled,
            completed_date=now if completed else None,
            outcome="Satisfactory" if completed else None,
        )
        db.add(evc)
        created_evc += 1
    db.commit()
    print(f"✓ EVC Tasks: {created_evc} created")

    # ── Undertakings ──────────────────────────────────────────────────────────
    ut_specs = [
        # (short_name, type, due_days, status)
        ("TIET",      "Faculty Qualification Compliance",  -10, UndertakingStatus.ACTIVE),
        ("SPPU",      "Placement Report Submission",        14, UndertakingStatus.SUBMITTED),
        ("IIT Delhi", "Infrastructure Certification",       30, UndertakingStatus.ACTIVE),
        ("DTU",       "Annual Compliance Declaration",      45, UndertakingStatus.ACTIVE),
        ("CU",        "Fee Structure Approval Undertaking",  7, UndertakingStatus.ACTIVE),
        ("BITS Pilani","Deficiency Rectification Undertaking",-5, UndertakingStatus.RETURNED),
        ("Amity",     "Program Offering Compliance",        20, UndertakingStatus.ACTIVE),
        ("RVCE",      "Laboratory Compliance Certification",60, UndertakingStatus.ACTIVE),
    ]
    for (short_name, ut_type, due_days, ut_status) in ut_specs:
        app_obj = app_objects.get(short_name)
        inst = inst_map.get(short_name)
        if inst is None:
            continue
        existing_ut = db.query(Undertaking).filter(
            Undertaking.institution_id == inst.id,
            Undertaking.undertaking_type == ut_type,
        ).first()
        if existing_ut:
            continue
        ut = Undertaking(
            application_id=app_obj.id if app_obj else None,
            institution_id=inst.id,
            undertaking_type=ut_type,
            description=f"Compliance undertaking: {ut_type}",
            due_date=now + timedelta(days=due_days),
            status=ut_status,
            submitted_at=now - timedelta(days=2) if ut_status == UndertakingStatus.SUBMITTED else None,
        )
        db.add(ut)
        created_ut += 1
    db.commit()
    print(f"✓ Undertakings: {created_ut} created")

    # ── Document Records ──────────────────────────────────────────────────────
    doc_specs = [
        # (short_name, category, doc_name, valid_days, is_expired)
        ("IIITA",      DocumentCategory.LEASE,                  "Campus Lease Agreement",         15,  False),
        ("CU",         DocumentCategory.NOC,                    "State NOC Certificate",         -30,  True),
        ("IIT Delhi",  DocumentCategory.APPROVAL_LETTER,        "AICTE Approval Letter 2024",    180,  False),
        ("VIT",        DocumentCategory.INSPECTION_REPORT,      "Annual Inspection Report",       90,  False),
        ("SPPU",       DocumentCategory.COMPLIANCE_CERTIFICATE, "Compliance Certificate 2024",    -5,  True),
        ("DTU",        DocumentCategory.AFFIDAVIT,              "Anti-Ragging Affidavit",         60,  False),
    ]
    from datetime import date as _date
    today = _date.today()
    for (short_name, cat, doc_name, valid_days, is_expired) in doc_specs:
        app_obj = app_objects.get(short_name)
        inst = inst_map.get(short_name)
        if inst is None:
            continue
        existing_doc = db.query(DocumentRecord).filter(
            DocumentRecord.institution_id == inst.id,
            DocumentRecord.document_name == doc_name,
        ).first()
        if existing_doc:
            continue
        valid_until = today + timedelta(days=valid_days)
        doc = DocumentRecord(
            application_id=app_obj.id if app_obj else None,
            institution_id=inst.id,
            category=cat,
            document_name=doc_name,
            valid_until=valid_until,
            is_expired=is_expired,
            renewal_pending=is_expired,
        )
        db.add(doc)
        created_doc += 1
    db.commit()
    print(f"✓ Documents: {created_doc} created")


def main():
    print("\n" + "="*60)
    print("AICTE C³ — Demo Seed Script")
    print("⚠️  ALL DATA IS SYNTHETIC — NOT OFFICIAL AICTE RECORDS")
    print("="*60 + "\n")

    create_tables()

    db = SessionLocal()
    try:
        bureaus = seed_bureaus(db)
        users = seed_users(db, bureaus)

        admin_user = next((u for u in users if u.email == "admin@aicte.demo"), users[0])
        institutions = seed_institutions(db, admin_user)
        cases = seed_cases(db, institutions, bureaus, users)
        seed_relationships(db, cases)
        seed_coordination(db, cases, users, bureaus)
        seed_notifications(db, users, cases)
        seed_deadline_rules(db)
        seed_applications(db, institutions, users)

        print("\n" + "="*60)
        print("✅ Seed complete!")
        print("\nDemo accounts (all at localhost:5173):")
        print("  admin@aicte.demo      / Admin@123456  (System Admin)")
        print("  management@aicte.demo / Demo@123456   (Senior Management)")
        print("  officer1@aicte.demo   / Demo@123456   (Bureau Officer)")
        print("  officer2@aicte.demo   / Demo@123456   (Grievance Officer)")
        print("  reviewer@aicte.demo   / Demo@123456   (Coordination Reviewer)")
        print("  datamgr@aicte.demo    / Demo@123456   (Data Admin)")
        print("  regional@aicte.demo   / Demo@123456   (Regional Officer)")
        print("\n⚠️  DEMO CREDENTIALS — Change before any real deployment")
        print("="*60 + "\n")
    except Exception as e:
        print(f"\n❌ Seed failed: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
