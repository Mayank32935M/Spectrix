from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from spectrix.schemas.finding import FindingResponse

class JobCreateRequest(BaseModel):
    pipelines: List[str] = Field(default_factory=lambda: ["ela_compression", "metadata_inspection", "noise_analysis"])

class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    evidence_id: str
    case_id: str
    pipelines: List[str]
    status: str
    progress_percent: int
    log_messages: List[str] = []
    created_at: datetime
    completed_at: Optional[datetime] = None
    findings: List[FindingResponse] = []
