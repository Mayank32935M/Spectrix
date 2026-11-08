import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from spectrix.core.database import get_db
from spectrix.models.case import Case
from spectrix.schemas.case import CaseCreate, CaseResponse

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.post("", response_model=CaseResponse, status_code=201)
def create_case(payload: CaseCreate, db: Session = Depends(get_db)):
    existing = db.query(Case).filter(Case.case_number == payload.case_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Case number '{payload.case_number}' already exists")

    case_id = f"CASE-{uuid.uuid4().hex[:8]}"
    new_case = Case(
        case_id=case_id,
        case_number=payload.case_number,
        title=payload.title,
        description=payload.description,
        examiner_name=payload.examiner_name,
        status="open"
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return CaseResponse(
        case_id=new_case.case_id,
        case_number=new_case.case_number,
        title=new_case.title,
        description=new_case.description,
        examiner_name=new_case.examiner_name,
        status=new_case.status,
        created_at=new_case.created_at,
        updated_at=new_case.updated_at,
        evidence_count=0,
        findings_count=0
    )

@router.get("", response_model=List[CaseResponse])
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).order_by(Case.created_at.desc()).all()
    response = []
    for c in cases:
        response.append(
            CaseResponse(
                case_id=c.case_id,
                case_number=c.case_number,
                title=c.title,
                description=c.description,
                examiner_name=c.examiner_name,
                status=c.status,
                created_at=c.created_at,
                updated_at=c.updated_at,
                evidence_count=len(c.evidence_items),
                findings_count=len(c.findings)
            )
        )
    return response

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    c = db.query(Case).filter((Case.case_id == case_id) | (Case.case_number == case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse(
        case_id=c.case_id,
        case_number=c.case_number,
        title=c.title,
        description=c.description,
        examiner_name=c.examiner_name,
        status=c.status,
        created_at=c.created_at,
        updated_at=c.updated_at,
        evidence_count=len(c.evidence_items),
        findings_count=len(c.findings)
    )

