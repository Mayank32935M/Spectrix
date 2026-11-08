from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from spectrix.core.database import get_db
from spectrix.models.evidence import EvidenceAsset
from spectrix.models.finding import ForensicFinding
from spectrix.models.job import AnalysisJob
from spectrix.models.assessment import EvidenceAssessment
from spectrix.assessment.engine import VerdictEngine
from spectrix.schemas.assessment import EvidenceAssessmentResponse, CaseAssessmentResponse

router = APIRouter(tags=["Forensic Assessments & Verdicts"])

@router.get("/evidence/{evidence_id}/assessment", response_model=EvidenceAssessmentResponse)
def get_evidence_assessment(evidence_id: str, db: Session = Depends(get_db)):
    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    # Look for active assessment
    assessment = db.query(EvidenceAssessment).filter(
        EvidenceAssessment.evidence_id == evidence_id,
        EvidenceAssessment.status == "active"
    ).first()

    # If no assessment exists yet, evaluate on the fly
    if not assessment:
        findings = db.query(ForensicFinding).filter(ForensicFinding.evidence_id == evidence_id).all()
        jobs = db.query(AnalysisJob).filter(AnalysisJob.evidence_id == evidence_id).all()
        assessment = VerdictEngine.evaluate_evidence(evidence, findings, jobs, db)

    return assessment

@router.post("/evidence/{evidence_id}/assessment", response_model=EvidenceAssessmentResponse)
def reevaluate_evidence_assessment(evidence_id: str, db: Session = Depends(get_db)):
    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    findings = db.query(ForensicFinding).filter(ForensicFinding.evidence_id == evidence_id).all()
    jobs = db.query(AnalysisJob).filter(AnalysisJob.evidence_id == evidence_id).all()

    assessment = VerdictEngine.evaluate_evidence(evidence, findings, jobs, db)
    return assessment

@router.get("/evidence/{evidence_id}/assessment/history", response_model=List[EvidenceAssessmentResponse])
def get_assessment_history(evidence_id: str, db: Session = Depends(get_db)):
    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    history = db.query(EvidenceAssessment).filter(
        EvidenceAssessment.evidence_id == evidence_id
    ).order_by(EvidenceAssessment.assessment_version.desc()).all()

    return history

@router.get("/cases/{case_id}/assessment", response_model=CaseAssessmentResponse)
def get_case_assessment(case_id: str, db: Session = Depends(get_db)):
    try:
        case_assessment = VerdictEngine.evaluate_case(case_id, db)
        return case_assessment
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

