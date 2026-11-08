from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

class EvidenceAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assessment_id: str
    case_id: str
    evidence_id: str
    assessment_version: int
    verdict: str
    ai_generation_assessment: str
    manipulation_assessment: str
    authenticity_assessment: str
    supporting_findings: List[Dict[str, Any]] = []
    conflicting_findings: List[Dict[str, Any]] = []
    examinations_performed: List[str] = []
    unavailable_or_failed_examinations: List[str] = []
    explanation: str
    limitations: List[str] = []
    fusion_policy_id: str
    fusion_policy_version: str
    model_method_references: List[str] = []
    status: str
    generated_at: datetime

class CaseAssessmentResponse(BaseModel):
    case_id: str
    case_number: str
    title: str
    examiner_name: str
    total_evidence_assets: int
    assessed_assets_count: int
    verdict_summary: Dict[str, int]
    overall_case_conclusion: str
    summary_statement: str
    corroborating_evidence: List[Dict[str, Any]] = []
    conflicting_evidence: List[Dict[str, Any]] = []
    individual_assessments: List[Dict[str, Any]] = []
    provisional_disclaimer: str
