from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from spectrix.core.database import Base

class ForensicFinding(Base):
    __tablename__ = "findings"

    finding_id = Column(String(64), primary_key=True, index=True)
    schema_version = Column(String(16), default="1.0.0")
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=False, index=True)
    evidence_id = Column(String(64), ForeignKey("evidence_assets.evidence_id"), nullable=False, index=True)
    modality = Column(String(32), nullable=False)
    finding_type = Column(String(64), nullable=False)
    method_id = Column(String(64), nullable=False)
    model_id = Column(String(64), nullable=True)
    model_version = Column(String(32), nullable=True)
    classification = Column(String(32), nullable=False)  # anomaly, investigative_lead, heuristic_warning, baseline_match
    score = Column(Float, nullable=True)
    score_semantics = Column(String(64), default="heuristic_variance_percentage")
    calibration_status = Column(String(32), default="uncalibrated_heuristic")
    media_location = Column(JSON, default=dict)
    supporting_observations = Column(JSON, default=list)
    explanation = Column(Text, nullable=False)
    limitations = Column(Text, nullable=False)
    review_status = Column(String(32), default="unreviewed")  # unreviewed, analyst_corroborated, analyst_dismissed
    analyst_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="findings")
    evidence = relationship("EvidenceAsset", back_populates="findings")

