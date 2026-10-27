"""Application model with approval-workflow stage tracking."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class ApplicationType(str, enum.Enum):
    NEW_INSTITUTION = "new_institution"
    PROGRAM_APPROVAL = "program_approval"
    INTAKE_INCREASE = "intake_increase"
    PROGRAM_CLOSURE = "program_closure"
    CONVERSION = "conversion"
    RENEWAL = "renewal"


class ApplicationStage(str, enum.Enum):
    SUBMITTED = "submitted"
    SCRUTINY = "scrutiny"
    DEFICIENCY_RAISED = "deficiency_raised"
    DEFICIENCY_RECTIFIED = "deficiency_rectified"
    EVC_ELIGIBLE = "evc_eligible"
    EVC_SCHEDULED = "evc_scheduled"
    EVC_COMPLETED = "evc_completed"
    SAC_SHC = "sac_shc"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(50), unique=True, nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    application_type = Column(SAEnum(ApplicationType), nullable=False, index=True)
    current_stage = Column(SAEnum(ApplicationStage), nullable=False, default=ApplicationStage.SUBMITTED, index=True)
    applied_year = Column(Integer, nullable=True)
    region = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True, index=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    last_stage_change_at = Column(DateTime(timezone=True), nullable=True)
    blocks_workflow = Column(Boolean, default=False)
    escalation_flag = Column(Boolean, default=False)
    priority_score = Column(Integer, default=5)
    data_note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    institution = relationship("Institution", back_populates="applications")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    stage_history = relationship("StageHistory", back_populates="application", order_by="StageHistory.created_at", cascade="all, delete-orphan")
