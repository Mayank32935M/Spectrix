from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from spectrix.core.database import Base

class EvidenceAsset(Base):
    __tablename__ = "evidence_assets"

    evidence_id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    filesize_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(128), nullable=False)
    modality = Column(String(32), nullable=False)  # image, video, audio, document
    sha256_digest = Column(String(64), nullable=False, index=True)
    registered_at = Column(DateTime, default=datetime.utcnow)
    storage_path = Column(Text, nullable=False)
    is_original = Column(Boolean, default=True)
    derived_from_id = Column(String(64), ForeignKey("evidence_assets.evidence_id"), nullable=True)
    derivation_method = Column(String(64), nullable=True)
    metadata_json = Column(JSON, default=dict)

    # Relationships
    case = relationship("Case", back_populates="evidence_items")
    findings = relationship("ForensicFinding", back_populates="evidence", cascade="all, delete-orphan")
    custody_events = relationship("CustodyEvent", back_populates="evidence", cascade="all, delete-orphan")

class CustodyEvent(Base):
    __tablename__ = "custody_events"

    event_id = Column(String(64), primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.case_id"), nullable=False)
    evidence_id = Column(String(64), ForeignKey("evidence_assets.evidence_id"), nullable=False)
    event_type = Column(String(32), nullable=False)  # ingested, verified, analyzed, derived, exported
    sha256_at_event = Column(String(64), nullable=False)
    performed_by = Column(String(128), default="System")
    timestamp = Column(DateTime, default=datetime.utcnow)
    details_json = Column(JSON, default=dict)

    evidence = relationship("EvidenceAsset", back_populates="custody_events")

