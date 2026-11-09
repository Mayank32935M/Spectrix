from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class MediaLocationSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    bounding_box: Optional[Any] = None
    temporal_range: Optional[Dict[str, Any]] = None
    frequency_range: Optional[Dict[str, Any]] = None

class FindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="allow")

    schema_version: str = "1.0.0"
    finding_id: str
    case_id: str
    evidence_id: str
    modality: str
    finding_type: str
    method_id: str
    model_id: Optional[str] = None
    model_version: Optional[str] = None
    classification: str
    score: Optional[float] = None
    score_semantics: str
    calibration_status: str
    media_location: Dict[str, Any] = Field(default_factory=dict)
    supporting_observations: List[str] = []
    explanation: str
    limitations: str
    review_status: str = "unreviewed"
    analyst_notes: Optional[str] = None
    created_at: datetime

class FindingReviewRequest(BaseModel):
    review_status: str  # analyst_corroborated, analyst_dismissed
    analyst_notes: Optional[str] = None
