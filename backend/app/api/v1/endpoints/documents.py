"""Document registry endpoints for compliance document tracking."""
import logging
from datetime import datetime, date, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_active_user
from app.db.session import get_db
from app.models.document_registry import DocumentRecord, DocumentCategory
from app.models.user import User
from app.services.audit import log_audit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


# ─── Schemas ──────────────────────────────────────────────────────────────────


class DocumentRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    application_id: Optional[int] = None
    institution_id: int
    category: str
    document_name: str
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    valid_until: Optional[date] = None
    is_expired: bool = False
    renewal_pending: bool = False
    verified: bool = False
    verified_by_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    filename: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RegisterDocumentRequest(BaseModel):
    institution_id: int
    application_id: Optional[int] = None
    category: str
    document_name: str
    issuing_authority: Optional[str] = None
    issue_date: Optional[date] = None
    valid_until: Optional[date] = None
    is_expired: bool = False
    renewal_pending: bool = False
    filename: Optional[str] = None
    notes: Optional[str] = None


class RenewRequest(BaseModel):
    valid_until: date


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _get_document_or_404(doc_id: int, db: Session) -> DocumentRecord:
    doc = db.query(DocumentRecord).filter(DocumentRecord.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return doc


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/", response_model=List[DocumentRecordOut])
async def list_documents(
    category: Optional[str] = Query(None),
    institution_id: Optional[int] = Query(None),
    application_id: Optional[int] = Query(None),
    expired: Optional[bool] = Query(None),
    renewal_pending: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(DocumentRecord)

    if category:
        try:
            query = query.filter(DocumentRecord.category == DocumentCategory(category))
        except ValueError:
            pass
    if institution_id:
        query = query.filter(DocumentRecord.institution_id == institution_id)
    if application_id:
        query = query.filter(DocumentRecord.application_id == application_id)
    if expired is True:
        query = query.filter(DocumentRecord.is_expired == True)
    if renewal_pending is True:
        query = query.filter(DocumentRecord.renewal_pending == True)

    return (
        query.options(joinedload(DocumentRecord.institution))
        .order_by(DocumentRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=DocumentRecordOut, status_code=201)
async def register_document(
    payload: RegisterDocumentRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        cat = DocumentCategory(payload.category)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid category: {payload.category}")

    doc = DocumentRecord(
        institution_id=payload.institution_id,
        application_id=payload.application_id,
        category=cat,
        document_name=payload.document_name,
        issuing_authority=payload.issuing_authority,
        issue_date=payload.issue_date,
        valid_until=payload.valid_until,
        is_expired=payload.is_expired,
        renewal_pending=payload.renewal_pending,
        filename=payload.filename,
        notes=payload.notes,
    )
    db.add(doc)
    try:
        db.commit()
        db.refresh(doc)
    except Exception as e:
        db.rollback()
        logger.error("Document registration failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to register document")
    return doc


@router.get("/{doc_id}", response_model=DocumentRecordOut)
async def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return _get_document_or_404(doc_id, db)


@router.post("/{doc_id}/renew", response_model=DocumentRecordOut)
async def renew_document(
    doc_id: int,
    payload: RenewRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    doc = _get_document_or_404(doc_id, db)
    doc.valid_until = payload.valid_until
    doc.is_expired = False
    doc.renewal_pending = False
    try:
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to renew document")
    log_audit(
        db,
        current_user.id,
        "document_renewed",
        "document_record",
        doc_id,
        f"Document {doc_id} renewed until {payload.valid_until}",
    )
    return doc


@router.post("/{doc_id}/verify", response_model=DocumentRecordOut)
async def verify_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    doc = _get_document_or_404(doc_id, db)
    doc.verified = True
    doc.verified_by_id = current_user.id
    doc.verified_at = datetime.now(timezone.utc)
    try:
        db.commit()
        db.refresh(doc)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to verify document")
    log_audit(
        db,
        current_user.id,
        "document_verified",
        "document_record",
        doc_id,
        f"Document {doc_id} verified by {current_user.id}",
    )
    return doc
