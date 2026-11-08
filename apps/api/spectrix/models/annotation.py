from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from spectrix.core.database import Base

class EvidenceAnnotation(Base):
    __tablename__ = "evidence_annotations"

    annotation_id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=False, index=True)
    evidence_id = Column(String(64), ForeignKey("evidence_assets.evidence_id"), nullable=False, index=True)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    label = Column(String(128), nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(String(128), default="Dr. E. Vance")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    case = relationship("Case", back_populates="annotations")
    evidence = relationship("EvidenceAsset", back_populates="annotations")
