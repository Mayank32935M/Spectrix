from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from spectrix.core.database import Base

class EvidenceAssessment(Base):
    __tablename__ = "evidence_assessments"

    assessment_id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=False, index=True)
    evidence_id = Column(String(64), ForeignKey("evidence_assets.evidence_id"), nullable=False, index=True)
    assessment_version = Column(Integer, default=1, nullable=False)
    
    # 5 Canonical Evidence-Level Verdict Categories:
    # AUTHENTICITY_SUPPORTED, LIKELY_MANIPULATED, LIKELY_AI_GENERATED, SUSPICIOUS_INCONCLUSIVE, INSUFFICIENT_ANALYSIS
    verdict = Column(String(64), nullable=False)

    # Independent Dimensions
    ai_generation_assessment = Column(String(64), nullable=False)  # SYNTHETIC_SUPPORTED, SYNTHETIC_NOT_DETECTED, SUSPICIOUS_SYNTHETIC, UNEXAMINED
    manipulation_assessment = Column(String(64), nullable=False)   # MANIPULATION_DETECTED, MANIPULATION_NOT_DETECTED, SUSPICIOUS_MANIPULATION, UNEXAMINED
    authenticity_assessment = Column(String(64), nullable=False) # AUTHENTICITY_SUPPORTED_WITH_LIMITATIONS, AUTHENTICITY_UNDERMINED, INCONCLUSIVE, UNVERIFIABLE

    # Corroboration & Methodology Traceability
    supporting_findings = Column(JSON, default=list)  # list of finding records/IDs
    conflicting_findings = Column(JSON, default=list)  # list of contradictory/inconsistent finding records/IDs
    examinations_performed = Column(JSON, default=list) # list of pipeline names completed
    unavailable_or_failed_examinations = Column(JSON, default=list) # list of required pipeline names skipped or failed

    # Human-Readable Reasoning & Caveats
    explanation = Column(Text, nullable=False)
    limitations = Column(JSON, default=list)

    # Fusion Policy
    fusion_policy_id = Column(String(64), default="spectrix-fusion-v1")
    fusion_policy_version = Column(String(32), default="1.0.0")
    model_method_references = Column(JSON, default=list)

    # Lifecycle Status: active, superseded
    status = Column(String(32), default="active", index=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="assessments")
    evidence = relationship("EvidenceAsset", back_populates="assessments")
