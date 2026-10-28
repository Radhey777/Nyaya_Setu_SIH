"""Undertaking model for compliance undertaking tracking."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class UndertakingStatus(str, enum.Enum):
    ACTIVE = "active"
    PENDING_SUBMISSION = "pending_submission"
    SUBMITTED = "submitted"
    VERIFIED = "verified"
    RETURNED = "returned"
    EXPIRED = "expired"


class Undertaking(Base):
    __tablename__ = "undertakings"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    undertaking_type = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SAEnum(UndertakingStatus), nullable=False, default=UndertakingStatus.ACTIVE, index=True)
    submission_notes = Column(Text, nullable=True)
    return_reason = Column(Text, nullable=True)
    evidence_filename = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    application = relationship("Application")
    institution = relationship("Institution")
    verified_by = relationship("User", foreign_keys=[verified_by_id])
