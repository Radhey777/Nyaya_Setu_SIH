"""EVC (Expert Visiting Committee) management endpoints."""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.evc import EVCTask, EVCStatus
from app.models.application import Application, ApplicationStage
from app.models.application_stage import StageHistory
from app.models.user import User
from app.services.audit import log_audit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/evc", tags=["evc"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class EVCTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    institution_id: int
    status: str
    scheduled_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    expert_names: Optional[list] = None
    visit_report_summary: Optional[str] = None
    outcome: Optional[str] = None
    rescheduled_from: Optional[datetime] = None
    rescheduled_reason: Optional[str] = None
    assigned_coordinator_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CreateEVCTaskRequest(BaseModel):
    application_id: int
    institution_id: int
    expert_names: Optional[list] = None
    assigned_coordinator_id: Optional[int] = None


class ScheduleRequest(BaseModel):
    scheduled_date: datetime


class CompleteRequest(BaseModel):
    completed_date: datetime
    outcome: str
    visit_report_summary: Optional[str] = None


class RescheduleRequest(BaseModel):
    new_scheduled_date: datetime
    reason: str


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_evc_or_404(task_id: int, db: Session) -> EVCTask:
    task = db.query(EVCTask).filter(EVCTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"EVC task {task_id} not found")
    return task


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/", response_model=List[EVCTaskOut])
async def list_evc_tasks(
    status: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    application_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(EVCTask)

    if status:
        try:
            query = query.filter(EVCTask.status == EVCStatus(status))
        except ValueError:
            pass
    if institution_id:
        query = query.filter(EVCTask.institution_id == institution_id)
    if application_id:
        query = query.filter(EVCTask.application_id == application_id)

    return (
        query.options(
            joinedload(EVCTask.application),
            joinedload(EVCTask.institution),
        )
        .order_by(EVCTask.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=EVCTaskOut, status_code=201)
async def create_evc_task(
    payload: CreateEVCTaskRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    task = EVCTask(
        application_id=payload.application_id,
        institution_id=payload.institution_id,
        status=EVCStatus.PENDING,
        expert_names=payload.expert_names,
        assigned_coordinator_id=payload.assigned_coordinator_id,
    )
    db.add(task)
    try:
        db.commit()
        db.refresh(task)
    except Exception as e:
        db.rollback()
        logger.error("EVC task creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create EVC task")
    return task


@router.get("/{task_id}", response_model=EVCTaskOut)
async def get_evc_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return _get_evc_or_404(task_id, db)


@router.post("/{task_id}/schedule", response_model=EVCTaskOut)
async def schedule_evc(
    task_id: int,
    payload: ScheduleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    task = _get_evc_or_404(task_id, db)
    task.scheduled_date = payload.scheduled_date
    task.status = EVCStatus.SCHEDULED
    try:
        db.commit()
        db.refresh(task)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to schedule EVC")
    log_audit(
        db,
        current_user.id,
        "evc_scheduled",
        "evc_task",
        task_id,
        f"EVC task {task_id} scheduled for {payload.scheduled_date}",
    )
    return task


@router.post("/{task_id}/complete", response_model=EVCTaskOut)
async def complete_evc(
    task_id: int,
    payload: CompleteRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    task = _get_evc_or_404(task_id, db)
    task.completed_date = payload.completed_date
    task.outcome = payload.outcome
    task.visit_report_summary = payload.visit_report_summary
    task.status = EVCStatus.COMPLETED

    # Advance linked application stage if applicable
    if task.application_id:
        application = db.query(Application).filter(
            Application.id == task.application_id
        ).first()
        if application and application.current_stage == ApplicationStage.EVC_SCHEDULED:
            old_stage = application.current_stage
            application.current_stage = ApplicationStage.EVC_COMPLETED
            application.last_stage_change_at = datetime.now(timezone.utc)
            history = StageHistory(
                application_id=application.id,
                from_stage=old_stage,
                to_stage=ApplicationStage.EVC_COMPLETED,
                action_type="advance",
                reason="EVC visit completed",
                performed_by_id=current_user.id,
            )
            db.add(history)

    try:
        db.commit()
        db.refresh(task)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to complete EVC")
    log_audit(
        db,
        current_user.id,
        "evc_completed",
        "evc_task",
        task_id,
        f"EVC task {task_id} completed with outcome: {payload.outcome}",
    )
    return task


@router.post("/{task_id}/reschedule", response_model=EVCTaskOut)
async def reschedule_evc(
    task_id: int,
    payload: RescheduleRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required for reschedule")

    task = _get_evc_or_404(task_id, db)
    task.rescheduled_from = task.scheduled_date
    task.scheduled_date = payload.new_scheduled_date
    task.rescheduled_reason = payload.reason
    task.status = EVCStatus.RESCHEDULED
    try:
        db.commit()
        db.refresh(task)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to reschedule EVC")
    log_audit(
        db,
        current_user.id,
        "evc_rescheduled",
        "evc_task",
        task_id,
        f"EVC task {task_id} rescheduled to {payload.new_scheduled_date}: {payload.reason}",
    )
    return task
