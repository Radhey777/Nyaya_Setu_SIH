"""DocumentRecord model for document registry and compliance tracking."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class DocumentCategory(str, enum.Enum):
    LEASE = "lease"
    NOC = "noc"
    AFFIDAVIT = "affidavit"
    INSPECTION_REPORT = "inspection_report"
    APPROVAL_LETTER = "approval_letter"
    COMPLIANCE_CERTIFICATE = "compliance_certificate"
    OTHER = "other"


class DocumentRecord(Base):
    __tablename__ = "document_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    category = Column(SAEnum(DocumentCategory), nullable=False, index=True)
    document_name = Column(String(500), nullable=False)
    issuing_authority = Column(String(300), nullable=True)
    issue_date = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=True)
    is_expired = Column(Boolean, default=False)
    renewal_pending = Column(Boolean, default=False)
    verified = Column(Boolean, default=False)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    filename = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    application = relationship("Application")
    institution = relationship("Institution")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
