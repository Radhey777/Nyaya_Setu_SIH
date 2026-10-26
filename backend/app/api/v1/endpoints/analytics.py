"""Analytics endpoints — all figures computed from DB queries."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.case import Case, CaseStatus
from app.models.coordination import CoordinationItem, CoordinationStatus
from app.models.relationship import CaseRelationship, ReviewStatus
from app.models.transfer import TransferRequest, TransferStatus
from app.models.institution import Institution
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def dashboard_stats(
    bureau_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Role-scoped dashboard statistics. All figures from live DB queries."""
    now = datetime.now(timezone.utc)

    # Base case query — scoped by role
    case_q = db.query(Case).filter(Case.is_active == True)
    if current_user.role == UserRole.BUREAU_OFFICER and current_user.bureau_id:
        case_q = case_q.filter(Case.bureau_id == current_user.bureau_id)
    elif bureau_id and current_user.role in [UserRole.SYSTEM_ADMIN, UserRole.SENIOR_MANAGEMENT, UserRole.REGIONAL_OFFICER]:
        case_q = case_q.filter(Case.bureau_id == bureau_id)

    total_cases = case_q.count()

    # Cases by status
    status_rows = (
        case_q.with_entities(Case.status, func.count(Case.id))
        .group_by(Case.status)
        .all()
    )
    cases_by_status = {row[0].value: row[1] for row in status_rows}

    # Cases by bureau (admin/management only)
    cases_by_bureau = []
    if current_user.role in [UserRole.SYSTEM_ADMIN, UserRole.SENIOR_MANAGEMENT, UserRole.REGIONAL_OFFICER]:
        bureau_rows = (
            db.query(Case.bureau_id, func.count(Case.id))
            .filter(Case.is_active == True)
            .group_by(Case.bureau_id)
            .all()
        )
        cases_by_bureau = [{"bureau_id": r[0], "count": r[1]} for r in bureau_rows]

    # Overdue cases
    overdue_count = case_q.filter(
        Case.due_date < now,
        Case.status.notin_([CaseStatus.DISPOSED, CaseStatus.CLOSED, CaseStatus.TRANSFERRED])
    ).count()

    # Unreviewed relationship candidates
    unreviewed_relationships = db.query(CaseRelationship).filter(
        CaseRelationship.review_status == ReviewStatus.PENDING
    ).count()

    # Pending coordination
    pending_coordination = db.query(CoordinationItem).filter(
        CoordinationItem.status.notin_([CoordinationStatus.CLOSED, CoordinationStatus.DISMISSED])
    ).count()

    # Overdue coordination
    overdue_coordination = db.query(CoordinationItem).filter(
        CoordinationItem.status.notin_([CoordinationStatus.CLOSED, CoordinationStatus.DISMISSED]),
        (CoordinationItem.acknowledge_by < now) | (CoordinationItem.action_due_date < now)
    ).count()

    # Pending transfers
    pending_transfers = db.query(TransferRequest).filter(
        TransferRequest.status == TransferStatus.REQUESTED
    ).count()

    # Recent cases (last 7 days)
    week_ago = now - timedelta(days=7)
    new_this_week = case_q.filter(Case.created_at >= week_ago).count()

    return {
        "total_cases": total_cases,
        "cases_by_status": cases_by_status,
        "cases_by_bureau": cases_by_bureau,
        "overdue_cases": overdue_count,
        "unreviewed_relationships": unreviewed_relationships,
        "pending_coordination": pending_coordination,
        "overdue_coordination": overdue_coordination,
        "pending_transfers": pending_transfers,
        "new_this_week": new_this_week,
        "generated_at": now.isoformat(),
        "data_note": "DEMO DATA — Synthetic prototype data. Not official AICTE records.",
        "filters_applied": {
            "bureau_id": bureau_id,
            "role_scope": current_user.role.value,
        }
    }


@router.get("/cases/ageing")
async def case_ageing(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Case ageing buckets computed from live data."""
    now = datetime.now(timezone.utc)
    active_cases = db.query(Case).filter(
        Case.is_active == True,
        Case.status.notin_([CaseStatus.DISPOSED, CaseStatus.CLOSED, CaseStatus.TRANSFERRED])
    ).all()

    buckets = {"0_7_days": 0, "8_30_days": 0, "31_90_days": 0, "over_90_days": 0}
    for c in active_cases:
        if c.received_date:
            age = (now - c.received_date.replace(tzinfo=timezone.utc) if c.received_date.tzinfo is None else now - c.received_date).days
            if age <= 7:
                buckets["0_7_days"] += 1
            elif age <= 30:
                buckets["8_30_days"] += 1
            elif age <= 90:
                buckets["31_90_days"] += 1
            else:
                buckets["over_90_days"] += 1

    return {"ageing_buckets": buckets, "generated_at": now.isoformat()}


@router.get("/cases/trends")
async def case_trends(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Monthly case creation counts for last 12 months."""
    now = datetime.now(timezone.utc)
    months = []
    for i in range(11, -1, -1):
        d = now - timedelta(days=30 * i)
        month_start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_d = now - timedelta(days=30 * (i - 1))
            month_end = next_d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            month_end = now
        count = db.query(func.count(Case.id)).filter(
            Case.created_at >= month_start, Case.created_at < month_end
        ).scalar()
        months.append({
            "month": month_start.strftime("%b %Y"),
            "count": count or 0
        })
    return {"monthly_trends": months, "generated_at": now.isoformat()}


@router.get("/institutions/breakdown")
async def institution_breakdown(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Top institutions by case count."""
    rows = (
        db.query(Institution.id, Institution.canonical_name, func.count(Case.id).label("case_count"))
        .join(Case, Case.institution_id == Institution.id, isouter=True)
        .filter(Case.is_active == True)
        .group_by(Institution.id, Institution.canonical_name)
        .order_by(func.count(Case.id).desc())
        .limit(limit)
        .all()
    )
    return {
        "breakdown": [{"institution_id": r[0], "name": r[1], "case_count": r[2]} for r in rows],
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/coordination/backlog")
async def coordination_backlog(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(CoordinationItem.status, func.count(CoordinationItem.id))
        .group_by(CoordinationItem.status)
        .all()
    )
    return {"by_status": {r[0].value: r[1] for r in rows},
            "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/sla-status")
async def sla_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Returns cases approaching deadline (due in <=7 days, not closed/disposed)
    and overdue cases, with days_remaining field.
    All figures from DB queries. Explicitly labelled DEMO DATA."""
    now = datetime.now(timezone.utc)
    approaching_deadline_threshold = now + timedelta(days=7)

    # Base query: active cases with a due_date, excluding terminal statuses
    terminal_statuses = [CaseStatus.DISPOSED, CaseStatus.CLOSED, CaseStatus.TRANSFERRED]
    base_q = (
        db.query(Case)
        .filter(
            Case.is_active == True,
            Case.due_date.isnot(None),
            Case.status.notin_(terminal_statuses),
        )
    )

    # Role-scope: bureau_officer sees only own bureau cases
    if current_user.role == UserRole.BUREAU_OFFICER and current_user.bureau_id:
        base_q = base_q.filter(Case.bureau_id == current_user.bureau_id)

    all_candidates = base_q.all()

    overdue_cases = []
    approaching_cases = []

    for c in all_candidates:
        # Normalise timezone on due_date
        due = c.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        delta_days = (due - now).days  # negative if overdue
        record = {
            "case_id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "due_date": due.isoformat(),
            "days_remaining": delta_days,
            "bureau_id": c.bureau_id,
            "institution_id": c.institution_id,
        }

        if due < now:
            overdue_cases.append(record)
        elif due <= approaching_deadline_threshold:
            approaching_cases.append(record)

    # Sort overdue by most overdue first (most negative days_remaining first)
    overdue_cases.sort(key=lambda x: x["days_remaining"])
    # Sort approaching by soonest deadline first
    approaching_cases.sort(key=lambda x: x["days_remaining"])

    return {
        "overdue_count": len(overdue_cases),
        "approaching_deadline_count": len(approaching_cases),
        "overdue_cases": overdue_cases[:50],
        "approaching_cases": approaching_cases[:50],
        "generated_at": now.isoformat(),
        "data_note": "DEMO DATA — Synthetic prototype data. Not official AICTE records.",
    }
