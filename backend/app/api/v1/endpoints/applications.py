"""Application management endpoints for NYAY SETU."""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.application import Application, ApplicationType, ApplicationStage
from app.models.application_stage import StageHistory
from app.models.evc import EVCTask, EVCStatus
from app.models.undertaking import Undertaking, UndertakingStatus
from app.models.document_registry import DocumentRecord
from app.models.user import User
from app.models.institution import Institution
from app.services.audit import log_audit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["applications"])

# ─── Transition Map ───────────────────────────────────────────────────────────

VALID_APPLICATION_TRANSITIONS = {
    ApplicationStage.SUBMITTED: [ApplicationStage.SCRUTINY, ApplicationStage.WITHDRAWN],
    ApplicationStage.SCRUTINY: [
        ApplicationStage.DEFICIENCY_RAISED,
        ApplicationStage.EVC_ELIGIBLE,
        ApplicationStage.REJECTED,
        ApplicationStage.WITHDRAWN,
    ],
    ApplicationStage.DEFICIENCY_RAISED: [
        ApplicationStage.DEFICIENCY_RECTIFIED,
        ApplicationStage.WITHDRAWN,
    ],
    ApplicationStage.DEFICIENCY_RECTIFIED: [
        ApplicationStage.SCRUTINY,
        ApplicationStage.EVC_ELIGIBLE,
    ],
    ApplicationStage.EVC_ELIGIBLE: [ApplicationStage.EVC_SCHEDULED, ApplicationStage.WITHDRAWN],
    ApplicationStage.EVC_SCHEDULED: [
        ApplicationStage.EVC_COMPLETED,
        ApplicationStage.EVC_ELIGIBLE,
    ],
    ApplicationStage.EVC_COMPLETED: [ApplicationStage.SAC_SHC, ApplicationStage.REJECTED],
    ApplicationStage.SAC_SHC: [ApplicationStage.APPROVED, ApplicationStage.REJECTED],
    ApplicationStage.APPROVED: [],
    ApplicationStage.REJECTED: [],
    ApplicationStage.WITHDRAWN: [],
}

# ─── Priority Helpers ─────────────────────────────────────────────────────────


def _compute_priority_score(app: Application, now: datetime) -> int:
    score = 5
    if app.last_stage_change_at:
        lsc = app.last_stage_change_at
        if lsc.tzinfo is None:
            lsc = lsc.replace(tzinfo=timezone.utc)
        due = lsc + timedelta(days=90)
        if app.current_stage not in (ApplicationStage.APPROVED, ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN):
            if due < now:
                score += 3
            elif due < now + timedelta(days=7):
                score += 2
            elif due < now + timedelta(days=30):
                score += 1
    if app.blocks_workflow:
        score += 2
    if app.escalation_flag:
        score += 1
    return min(score, 10)


def _priority_label(score: int) -> str:
    if score >= 9:
        return "CRITICAL"
    if score >= 7:
        return "HIGH"
    if score >= 5:
        return "MEDIUM"
    return "LOW"


# ─── Schemas ──────────────────────────────────────────────────────────────────


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str
    email: str


class InstitutionBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    canonical_name: str
    state: Optional[str] = None


class StageHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: int
    from_stage: Optional[str] = None
    to_stage: str
    action_type: str
    reason: Optional[str] = None
    performed_by: Optional[UserBrief] = None
    created_at: Optional[datetime] = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_number: str
    institution_id: int
    institution: Optional[InstitutionBrief] = None
    application_type: str
    current_stage: str
    applied_year: Optional[int] = None
    region: Optional[str] = None
    state: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    assigned_officer: Optional[UserBrief] = None
    submitted_at: Optional[datetime] = None
    last_stage_change_at: Optional[datetime] = None
    blocks_workflow: bool = False
    escalation_flag: bool = False
    priority_score: int = 5
    data_note: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ApplicationDetailOut(ApplicationOut):
    stage_history: List[StageHistoryOut] = []


class CreateApplicationRequest(BaseModel):
    institution_id: int
    application_type: str
    applied_year: Optional[int] = None
    region: Optional[str] = None
    state: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    submitted_at: Optional[datetime] = None
    blocks_workflow: bool = False
    escalation_flag: bool = False


class UpdateApplicationRequest(BaseModel):
    application_type: Optional[str] = None
    applied_year: Optional[int] = None
    region: Optional[str] = None
    state: Optional[str] = None
    assigned_officer_id: Optional[int] = None
    blocks_workflow: Optional[bool] = None
    escalation_flag: Optional[bool] = None
    is_active: Optional[bool] = None


class AdvanceRequest(BaseModel):
    to_stage: str
    reason: Optional[str] = None


class ReturnRequest(BaseModel):
    to_stage: str
    reason: str


class PaginatedApplications(BaseModel):
    items: List[ApplicationOut]
    total: int
    skip: int
    limit: int


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_application_or_404(app_id: int, db: Session) -> Application:
    app = db.query(Application).filter(
        Application.id == app_id,
        Application.is_active == True,
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")
    return app


def _generate_application_number(db: Session, app_id: int) -> str:
    year = datetime.now(timezone.utc).year
    return f"NYAY-{year}-{app_id:05d}"


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/", response_model=PaginatedApplications)
async def list_applications(
    q: Optional[str] = Query(None, description="Search application_number or institution name"),
    stage: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    assigned_officer_id: Optional[int] = Query(None),
    overdue: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Application).filter(Application.is_active == True)

    if q:
        query = query.filter(
            or_(
                Application.application_number.ilike(f"%{q}%"),
                Application.institution_id.in_(
                    db.query(Institution.id).filter(
                        Institution.canonical_name.ilike(f"%{q}%")
                    )
                ),
            )
        )
    if stage:
        try:
            query = query.filter(Application.current_stage == ApplicationStage(stage))
        except ValueError:
            pass
    if type:
        try:
            query = query.filter(Application.application_type == ApplicationType(type))
        except ValueError:
            pass
    if region:
        query = query.filter(Application.region.ilike(f"%{region}%"))
    if assigned_officer_id:
        query = query.filter(Application.assigned_officer_id == assigned_officer_id)
    if overdue is True:
        overdue_threshold = datetime.now(timezone.utc) - timedelta(days=90)
        query = query.filter(
            Application.last_stage_change_at < overdue_threshold,
            Application.current_stage.notin_(
                [ApplicationStage.APPROVED, ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN]
            ),
        )

    total = query.count()
    items = (
        query.options(
            joinedload(Application.institution),
            joinedload(Application.assigned_officer),
        )
        .order_by(Application.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/", response_model=ApplicationOut, status_code=201)
async def create_application(
    payload: CreateApplicationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    inst = db.query(Institution).filter(Institution.id == payload.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    try:
        app_type = ApplicationType(payload.application_type)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid application_type: {payload.application_type}")

    try:
        application = Application(
            application_number="PENDING",  # placeholder until we have id
            institution_id=payload.institution_id,
            application_type=app_type,
            current_stage=ApplicationStage.SUBMITTED,
            applied_year=payload.applied_year,
            region=payload.region,
            state=payload.state,
            assigned_officer_id=payload.assigned_officer_id,
            submitted_at=payload.submitted_at or datetime.now(timezone.utc),
            last_stage_change_at=datetime.now(timezone.utc),
            blocks_workflow=payload.blocks_workflow,
            escalation_flag=payload.escalation_flag,
            priority_score=5,
            data_note="[DEMO DATA] Synthetic prototype record. Not official AICTE data.",
            is_active=True,
            created_by_id=current_user.id,
        )
        db.add(application)
        db.flush()  # get id

        # Set application_number now that we have the id
        application.application_number = _generate_application_number(db, application.id)

        # Initial stage history
        history = StageHistory(
            application_id=application.id,
            from_stage=None,
            to_stage=ApplicationStage.SUBMITTED,
            action_type="advance",
            reason="Application submitted",
            performed_by_id=current_user.id,
        )
        db.add(history)
        db.commit()
        db.refresh(application)

        log_audit(
            db,
            current_user.id,
            "application_created",
            "application",
            application.id,
            f"Application {application.application_number} created",
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error("Application creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create application")

    return application


@router.get("/{application_id}", response_model=ApplicationDetailOut)
async def get_application(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    application = (
        db.query(Application)
        .options(
            joinedload(Application.institution),
            joinedload(Application.assigned_officer),
            joinedload(Application.stage_history).joinedload(StageHistory.performed_by),
        )
        .filter(Application.id == application_id, Application.is_active == True)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.put("/{application_id}", response_model=ApplicationOut)
async def update_application(
    application_id: int,
    payload: UpdateApplicationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    application = _get_application_or_404(application_id, db)
    changes = []
    for field, value in payload.model_dump(exclude_none=True).items():
        old = getattr(application, field, None)
        if old != value:
            if field == "application_type" and value is not None:
                try:
                    value = ApplicationType(value)
                except ValueError:
                    raise HTTPException(status_code=422, detail=f"Invalid application_type: {value}")
            setattr(application, field, value)
            changes.append(f"{field}: {old} → {value}")
    if changes:
        try:
            db.commit()
            db.refresh(application)
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Update failed")
    return application


@router.post("/{application_id}/advance")
async def advance_application(
    application_id: int,
    payload: AdvanceRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    application = _get_application_or_404(application_id, db)

    try:
        to_stage = ApplicationStage(payload.to_stage)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid stage: {payload.to_stage}")

    allowed = VALID_APPLICATION_TRANSITIONS.get(application.current_stage, [])
    if to_stage not in allowed:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Transition {application.current_stage.value} → {to_stage.value} is not permitted. "
                f"Allowed: {[s.value for s in allowed]}"
            ),
        )

    old_stage = application.current_stage
    now = datetime.now(timezone.utc)
    application.current_stage = to_stage
    application.last_stage_change_at = now

    # Recompute priority
    application.priority_score = _compute_priority_score(application, now)

    history = StageHistory(
        application_id=application.id,
        from_stage=old_stage,
        to_stage=to_stage,
        action_type="advance",
        reason=payload.reason,
        performed_by_id=current_user.id,
    )
    db.add(history)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Stage advance failed")

    log_audit(
        db,
        current_user.id,
        "application_advanced",
        "application",
        application_id,
        f"{old_stage.value} → {to_stage.value}",
    )
    return {
        "message": "Stage advanced",
        "old_stage": old_stage.value,
        "new_stage": to_stage.value,
        "priority_score": application.priority_score,
        "priority_label": _priority_label(application.priority_score),
    }


@router.post("/{application_id}/return")
async def return_application(
    application_id: int,
    payload: ReturnRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    application = _get_application_or_404(application_id, db)

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required for return")

    try:
        to_stage = ApplicationStage(payload.to_stage)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid stage: {payload.to_stage}")

    old_stage = application.current_stage
    now = datetime.now(timezone.utc)
    application.current_stage = to_stage
    application.last_stage_change_at = now
    application.priority_score = _compute_priority_score(application, now)

    history = StageHistory(
        application_id=application.id,
        from_stage=old_stage,
        to_stage=to_stage,
        action_type="return",
        reason=payload.reason,
        performed_by_id=current_user.id,
    )
    db.add(history)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Return failed")

    log_audit(
        db,
        current_user.id,
        "application_returned",
        "application",
        application_id,
        f"{old_stage.value} → {to_stage.value}: {payload.reason}",
    )
    return {
        "message": "Application returned",
        "old_stage": old_stage.value,
        "new_stage": to_stage.value,
    }


@router.get("/{application_id}/timeline", response_model=List[StageHistoryOut])
async def get_application_timeline(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    _get_application_or_404(application_id, db)
    history = (
        db.query(StageHistory)
        .options(joinedload(StageHistory.performed_by))
        .filter(StageHistory.application_id == application_id)
        .order_by(StageHistory.created_at)
        .all()
    )
    return history


@router.get("/{application_id}/workflow-status")
async def get_workflow_status(
    application_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    application = _get_application_or_404(application_id, db)

    now = datetime.now(timezone.utc)
    score = _compute_priority_score(application, now)

    pending_evc = (
        db.query(func.count(EVCTask.id))
        .filter(
            EVCTask.application_id == application_id,
            EVCTask.status.notin_([EVCStatus.COMPLETED, EVCStatus.CANCELLED]),
        )
        .scalar()
        or 0
    )

    pending_undertakings = (
        db.query(func.count(Undertaking.id))
        .filter(
            Undertaking.application_id == application_id,
            Undertaking.status.notin_([UndertakingStatus.VERIFIED, UndertakingStatus.EXPIRED]),
        )
        .scalar()
        or 0
    )

    from datetime import date
    today = date.today()
    expired_docs = (
        db.query(func.count(DocumentRecord.id))
        .filter(
            DocumentRecord.application_id == application_id,
            or_(
                DocumentRecord.is_expired == True,
                DocumentRecord.valid_until < today,
            ),
        )
        .scalar()
        or 0
    )

    return {
        "current_stage": application.current_stage.value,
        "priority_score": score,
        "priority_label": _priority_label(score),
        "pending_evc": pending_evc,
        "pending_undertakings": pending_undertakings,
        "expired_docs": expired_docs,
    }
