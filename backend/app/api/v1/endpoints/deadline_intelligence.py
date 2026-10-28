"""Deadline Intelligence — unified priority action queue."""
import logging
from datetime import datetime, timezone, timedelta, date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.application import Application, ApplicationStage
from app.models.undertaking import Undertaking, UndertakingStatus
from app.models.document_registry import DocumentRecord
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/deadline-intelligence", tags=["deadline_intelligence"])

_TERMINAL_STAGES = {
    ApplicationStage.APPROVED,
    ApplicationStage.REJECTED,
    ApplicationStage.WITHDRAWN,
}

_DATA_NOTE = "[DEMO DATA] Synthetic priority queue. Not official AICTE data."


class ActionQueueItem(BaseModel):
    item_type: str
    item_id: int
    label: str
    institution_name: str
    priority_score: int
    priority_label: str
    days_remaining: int
    action_required: str
    link: str


class ActionQueueResponse(BaseModel):
    items: List[ActionQueueItem]
    total: int
    generated_at: str
    data_note: str


def _priority_label(score: int) -> str:
    if score >= 9:
        return "CRITICAL"
    if score >= 7:
        return "HIGH"
    if score >= 5:
        return "MEDIUM"
    return "LOW"


def _compute_score(days_remaining: int, blocks_workflow: bool = False, escalation_flag: bool = False) -> int:
    score = 5
    if days_remaining < 0:
        score += 3
    elif days_remaining < 7:
        score += 2
    elif days_remaining < 30:
        score += 1
    if blocks_workflow:
        score += 2
    if escalation_flag:
        score += 1
    return min(score, 10)


@router.get("/action-queue", response_model=ActionQueueResponse)
async def get_action_queue(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    today = date.today()
    items: List[ActionQueueItem] = []

    # ── 1. Applications approaching SLA (90-day limit per stage) ─────────────
    apps = (
        db.query(Application)
        .options(joinedload(Application.institution))
        .filter(
            Application.is_active == True,
            Application.current_stage.notin_(list(_TERMINAL_STAGES)),
        )
        .all()
    )
    for app in apps:
        if app.last_stage_change_at is None:
            continue
        lsc = app.last_stage_change_at
        if lsc.tzinfo is None:
            lsc = lsc.replace(tzinfo=timezone.utc)
        due = lsc + timedelta(days=90)
        days_remaining = (due - now).days
        if days_remaining >= 30:
            continue
        inst_name = app.institution.canonical_name if app.institution else "Unknown"
        score = _compute_score(days_remaining, app.blocks_workflow, app.escalation_flag)
        items.append(ActionQueueItem(
            item_type="application",
            item_id=app.id,
            label=app.application_number,
            institution_name=inst_name,
            priority_score=score,
            priority_label=_priority_label(score),
            days_remaining=days_remaining,
            action_required=(
                "Application overdue — immediate review required"
                if days_remaining < 0
                else f"Stage SLA expiring in {days_remaining} day(s)"
            ),
            link=f"/applications/{app.id}",
        ))

    # ── 2. Undertakings approaching/past due date ─────────────────────────────
    undertakings = (
        db.query(Undertaking)
        .options(joinedload(Undertaking.institution))
        .filter(
            Undertaking.status.notin_([UndertakingStatus.VERIFIED, UndertakingStatus.EXPIRED])
        )
        .all()
    )
    for ut in undertakings:
        if ut.due_date is None:
            continue
        due = ut.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        days_remaining = (due - now).days
        if days_remaining >= 30:
            continue
        inst_name = ut.institution.canonical_name if ut.institution else "Unknown"
        score = _compute_score(days_remaining)
        items.append(ActionQueueItem(
            item_type="undertaking",
            item_id=ut.id,
            label=ut.undertaking_type,
            institution_name=inst_name,
            priority_score=score,
            priority_label=_priority_label(score),
            days_remaining=days_remaining,
            action_required=(
                "Undertaking overdue — compliance action required"
                if days_remaining < 0
                else f"Undertaking due in {days_remaining} day(s)"
            ),
            link="/compliance",
        ))

    # ── 3. Documents expired or expiring within 30 days ───────────────────────
    docs = (
        db.query(DocumentRecord)
        .options(joinedload(DocumentRecord.institution))
        .all()
    )
    for doc in docs:
        if doc.is_expired:
            days_remaining = -1  # already expired
        elif doc.valid_until is not None and doc.valid_until < today + timedelta(days=30):
            days_remaining = (doc.valid_until - today).days
        else:
            continue
        inst_name = doc.institution.canonical_name if doc.institution else "Unknown"
        score = _compute_score(days_remaining)
        items.append(ActionQueueItem(
            item_type="document",
            item_id=doc.id,
            label=doc.document_name,
            institution_name=inst_name,
            priority_score=score,
            priority_label=_priority_label(score),
            days_remaining=days_remaining,
            action_required=(
                "Document expired — renewal required"
                if days_remaining < 0
                else f"Document expiring in {days_remaining} day(s)"
            ),
            link="/documents",
        ))

    # ── Sort: priority_score desc, days_remaining asc ─────────────────────────
    items.sort(key=lambda x: (-x.priority_score, x.days_remaining))

    # Apply limit
    items = items[:limit]

    return ActionQueueResponse(
        items=items,
        total=len(items),
        generated_at=now.isoformat(),
        data_note=_DATA_NOTE,
    )
