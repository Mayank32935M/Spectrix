from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from spectrix.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    case_id = Column(String(64), primary_key=True, index=True)
    case_number = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    examiner_name = Column(String(128), default="Forensic Analyst")
    status = Column(String(32), default="open")  # open, active, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    evidence_items = relationship("EvidenceAsset", back_populates="case", cascade="all, delete-orphan")
    findings = relationship("ForensicFinding", back_populates="case", cascade="all, delete-orphan")
    annotations = relationship("EvidenceAnnotation", back_populates="case", cascade="all, delete-orphan")
    assessments = relationship("EvidenceAssessment", back_populates="case", cascade="all, delete-orphan")

