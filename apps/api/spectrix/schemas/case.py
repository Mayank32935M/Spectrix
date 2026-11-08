from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class CaseCreate(BaseModel):
    case_number: str = Field(..., json_schema_extra={"example": "SPX-2026-0142"})
    title: str = Field(..., json_schema_extra={"example": "Synthetic Media Inquiry"})
    description: Optional[str] = None
    examiner_name: str = Field("Dr. E. Vance")

class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    case_id: str
    case_number: str
    title: str
    description: Optional[str] = None
    examiner_name: str
    status: str
    created_at: datetime
    updated_at: datetime
    evidence_count: int = 0
    findings_count: int = 0
