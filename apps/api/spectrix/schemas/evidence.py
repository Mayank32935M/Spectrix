from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    evidence_id: str
    case_id: str
    filename: str
    filesize_bytes: int
    mime_type: str
    modality: str
    sha256_digest: str
    registered_at: datetime
    storage_path: str
    is_original: bool
    derived_from_id: Optional[str] = None
    derivation_method: Optional[str] = None
    metadata: Dict[str, Any] = {}
    custody_chain_length: int = 1
    preview_url: Optional[str] = None

class IntegrityVerificationResponse(BaseModel):
    evidence_id: str
    registered_sha256: str
    current_sha256: str
    integrity_status: str  # MATCH or MISMATCH
    verified_at: datetime
    notice: str = "File integrity only — does not establish content authenticity or provenance"
