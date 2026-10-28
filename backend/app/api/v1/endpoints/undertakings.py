"""Undertaking management endpoints for compliance tracking."""
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.undertaking import Undertaking, UndertakingStatus
from app.models.user import User, UserRole
from app.services.audit import log_audit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/undertakings", tags=["undertakings"])

# Roles allowed to verify undertakings
_OFFICER_ROLES = {
    UserRole.BUREAU_OFFICER,
    UserRole.SYSTEM_ADMIN,
    UserRole.SENIOR_MANAGEMENT,
    UserRole.REGIONAL_OFFICER,
}


# ─── Schemas ──────────────────────────────────────────────────────────────────


class UndertakingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: Optional[int] = None
    institution_id: int
    undertaking_type: str
    description: str
    due_date: datetime
    submitted_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by_id: Optional[int] = None
    status: str
    submission_notes: Optional[str] = None
    return_reason: Optional[str] = None
    evidence_filename: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CreateUndertakingRequest(BaseModel):
    institution_id: int
    application_id: Optional[int] = None
    undertaking_type: str
    description: str
    due_date: datetime
    submission_notes: Optional[str] = None


class SubmitRequest(BaseModel):
    notes: Optional[str] = None


class ReturnRequest(BaseModel):
    reason: str


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_undertaking_or_404(undertaking_id: int, db: Session) -> Undertaking:
    ut = db.query(Undertaking).filter(Undertaking.id == undertaking_id).first()
    if not ut:
        raise HTTPException(status_code=404, detail=f"Undertaking {undertaking_id} not found")
    return ut


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/", response_model=List[UndertakingOut])
async def list_undertakings(
    status: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    application_id: Optional[int] = Query(None),
    overdue: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Undertaking)

    if status:
        try:
            query = query.filter(Undertaking.status == UndertakingStatus(status))
        except ValueError:
            pass
    if institution_id:
        query = query.filter(Undertaking.institution_id == institution_id)
    if application_id:
        query = query.filter(Undertaking.application_id == application_id)
    if overdue is True:
        now = datetime.now(timezone.utc)
        query = query.filter(
            Undertaking.due_date < now,
            Undertaking.status.notin_([UndertakingStatus.VERIFIED, UndertakingStatus.EXPIRED]),
        )

    return (
        query.options(joinedload(Undertaking.institution))
        .order_by(Undertaking.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=UndertakingOut, status_code=201)
async def create_undertaking(
    payload: CreateUndertakingRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ut = Undertaking(
        institution_id=payload.institution_id,
        application_id=payload.application_id,
        undertaking_type=payload.undertaking_type,
        description=payload.description,
        due_date=payload.due_date,
        status=UndertakingStatus.ACTIVE,
        submission_notes=payload.submission_notes,
    )
    db.add(ut)
    try:
        db.commit()
        db.refresh(ut)
    except Exception as e:
        db.rollback()
        logger.error("Undertaking creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create undertaking")
    return ut


@router.get("/{undertaking_id}", response_model=UndertakingOut)
async def get_undertaking(
    undertaking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return _get_undertaking_or_404(undertaking_id, db)


@router.post("/{undertaking_id}/submit", response_model=UndertakingOut)
async def submit_undertaking(
    undertaking_id: int,
    payload: SubmitRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    ut = _get_undertaking_or_404(undertaking_id, db)
    ut.submitted_at = datetime.now(timezone.utc)
    ut.status = UndertakingStatus.SUBMITTED
    if payload.notes:
        ut.submission_notes = payload.notes
    try:
        db.commit()
        db.refresh(ut)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to submit undertaking")
    log_audit(
        db,
        current_user.id,
        "undertaking_submitted",
        "undertaking",
        undertaking_id,
        f"Undertaking {undertaking_id} submitted",
    )
    return ut


@router.post("/{undertaking_id}/verify", response_model=UndertakingOut)
async def verify_undertaking(
    undertaking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in _OFFICER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient privileges to verify undertakings")
    ut = _get_undertaking_or_404(undertaking_id, db)
    ut.verified_at = datetime.now(timezone.utc)
    ut.verified_by_id = current_user.id
    ut.status = UndertakingStatus.VERIFIED
    try:
        db.commit()
        db.refresh(ut)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to verify undertaking")
    log_audit(
        db,
        current_user.id,
        "undertaking_verified",
        "undertaking",
        undertaking_id,
        f"Undertaking {undertaking_id} verified by {current_user.id}",
    )
    return ut


@router.post("/{undertaking_id}/return", response_model=UndertakingOut)
async def return_undertaking(
    undertaking_id: int,
    payload: ReturnRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=422, detail="Reason is required for return")
    ut = _get_undertaking_or_404(undertaking_id, db)
    ut.return_reason = payload.reason
    ut.status = UndertakingStatus.RETURNED
    try:
        db.commit()
        db.refresh(ut)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to return undertaking")
    log_audit(
        db,
        current_user.id,
        "undertaking_returned",
        "undertaking",
        undertaking_id,
        f"Undertaking {undertaking_id} returned: {payload.reason}",
    )
    return ut
