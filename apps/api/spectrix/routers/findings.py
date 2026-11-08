from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from spectrix.core.database import get_db
from spectrix.models.case import Case
from spectrix.models.finding import ForensicFinding
from spectrix.schemas.finding import FindingResponse, FindingReviewRequest

router = APIRouter(tags=["Findings"])

@router.get("/cases/{case_id}/findings", response_model=List[FindingResponse])
def list_findings(case_id: str, evidence_id: Optional[str] = None, db: Session = Depends(get_db)):
    case = db.query(Case).filter((Case.case_id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = db.query(ForensicFinding).filter(ForensicFinding.case_id == case.case_id)
    if evidence_id:
        query = query.filter(ForensicFinding.evidence_id == evidence_id)

    findings = query.order_by(ForensicFinding.created_at.desc()).all()
    return [
        FindingResponse(
            schema_version=f.schema_version,
            finding_id=f.finding_id,
            case_id=f.case_id,
            evidence_id=f.evidence_id,
            modality=f.modality,
            finding_type=f.finding_type,
            method_id=f.method_id,
            model_id=f.model_id,
            model_version=f.model_version,
            classification=f.classification,
            score=f.score,
            score_semantics=f.score_semantics,
            calibration_status=f.calibration_status,
            media_location=f.media_location or {},
            supporting_observations=f.supporting_observations or [],
            explanation=f.explanation,
            limitations=f.limitations,
            review_status=f.review_status,
            analyst_notes=f.analyst_notes,
            created_at=f.created_at
        )
        for f in findings
    ]

@router.get("/findings/{finding_id}", response_model=FindingResponse)
def get_finding(finding_id: str, db: Session = Depends(get_db)):
    f = db.query(ForensicFinding).filter(ForensicFinding.finding_id == finding_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    return FindingResponse(
        schema_version=f.schema_version,
        finding_id=f.finding_id,
        case_id=f.case_id,
        evidence_id=f.evidence_id,
        modality=f.modality,
        finding_type=f.finding_type,
        method_id=f.method_id,
        model_id=f.model_id,
        model_version=f.model_version,
        classification=f.classification,
        score=f.score,
        score_semantics=f.score_semantics,
        calibration_status=f.calibration_status,
        media_location=f.media_location or {},
        supporting_observations=f.supporting_observations or [],
        explanation=f.explanation,
        limitations=f.limitations,
        review_status=f.review_status,
        analyst_notes=f.analyst_notes,
        created_at=f.created_at
    )

@router.patch("/findings/{finding_id}/review", response_model=FindingResponse)
def review_finding(finding_id: str, payload: FindingReviewRequest, db: Session = Depends(get_db)):
    f = db.query(ForensicFinding).filter(ForensicFinding.finding_id == finding_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    f.review_status = payload.review_status
    if payload.analyst_notes:
        f.analyst_notes = payload.analyst_notes
    db.commit()
    db.refresh(f)

    return FindingResponse(
        schema_version=f.schema_version,
        finding_id=f.finding_id,
        case_id=f.case_id,
        evidence_id=f.evidence_id,
        modality=f.modality,
        finding_type=f.finding_type,
        method_id=f.method_id,
        model_id=f.model_id,
        model_version=f.model_version,
        classification=f.classification,
        score=f.score,
        score_semantics=f.score_semantics,
        calibration_status=f.calibration_status,
        media_location=f.media_location or {},
        supporting_observations=f.supporting_observations or [],
        explanation=f.explanation,
        limitations=f.limitations,
        review_status=f.review_status,
        analyst_notes=f.analyst_notes,
        created_at=f.created_at
    )

