from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from spectrix.core.database import Base

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    job_id = Column(String(64), primary_key=True, index=True)
    evidence_id = Column(String(64), ForeignKey("evidence_assets.evidence_id"), nullable=False, index=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=False, index=True)
    pipelines = Column(JSON, default=list)
    status = Column(String(32), default="queued")  # queued, processing, completed, failed
    progress_percent = Column(Integer, default=0)
    log_messages = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

