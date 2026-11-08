from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AnnotationCreate(BaseModel):
    x: int
    y: int
    width: Optional[int] = None
    height: Optional[int] = None
    label: str
    notes: Optional[str] = None
    created_by: Optional[str] = "Dr. E. Vance"

class AnnotationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    annotation_id: str
    case_id: str
    evidence_id: str
    x: int
    y: int
    width: Optional[int] = None
    height: Optional[int] = None
    label: str
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
