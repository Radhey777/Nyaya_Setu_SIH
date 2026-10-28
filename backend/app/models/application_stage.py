"""StageHistory model tracking application stage transitions."""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
from app.models.application import ApplicationStage


class StageHistory(Base):
    __tablename__ = "stage_history"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)
    from_stage = Column(SAEnum(ApplicationStage), nullable=True)
    to_stage = Column(SAEnum(ApplicationStage), nullable=False)
    action_type = Column(String(20), nullable=False)  # 'advance' | 'return' | 'revert'
    reason = Column(Text, nullable=True)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="stage_history")
    performed_by = relationship("User", foreign_keys=[performed_by_id])
