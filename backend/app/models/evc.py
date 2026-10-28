"""EVCTask model for Expert Visiting Committee scheduling."""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class EVCStatus(str, enum.Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class EVCTask(Base):
    __tablename__ = "evc_tasks"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    status = Column(SAEnum(EVCStatus), nullable=False, default=EVCStatus.PENDING, index=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    completed_date = Column(DateTime(timezone=True), nullable=True)
    expert_names = Column(JSON, nullable=True)
    visit_report_summary = Column(Text, nullable=True)
    outcome = Column(String(100), nullable=True)
    rescheduled_from = Column(DateTime(timezone=True), nullable=True)
    rescheduled_reason = Column(Text, nullable=True)
    assigned_coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    application = relationship("Application")
    institution = relationship("Institution")
    assigned_coordinator = relationship("User", foreign_keys=[assigned_coordinator_id])
