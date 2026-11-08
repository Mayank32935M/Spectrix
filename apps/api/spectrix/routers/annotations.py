import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from spectrix.core.database import get_db
from spectrix.models.evidence import EvidenceAsset
from spectrix.models.annotation import EvidenceAnnotation
from spectrix.schemas.annotation import AnnotationCreate, AnnotationResponse

router = APIRouter(tags=["Annotations"])

@router.post("/evidence/{evidence_id}/annotations", response_model=AnnotationResponse, status_code=201)
def create_annotation(evidence_id: str, payload: AnnotationCreate, db: Session = Depends(get_db)):
    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    annotation_id = f"ANN-{uuid.uuid4().hex[:6].upper()}"
    ann = EvidenceAnnotation(
        annotation_id=annotation_id,
        case_id=evidence.case_id,
        evidence_id=evidence.evidence_id,
        x=payload.x,
        y=payload.y,
        width=payload.width,
        height=payload.height,
        label=payload.label,
        notes=payload.notes,
        created_by=payload.created_by or "Dr. E. Vance"
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    return AnnotationResponse(
        annotation_id=ann.annotation_id,
        case_id=ann.case_id,
        evidence_id=ann.evidence_id,
        x=ann.x,
        y=ann.y,
        width=ann.width,
        height=ann.height,
        label=ann.label,
        notes=ann.notes,
        created_by=ann.created_by,
        created_at=ann.created_at
    )

@router.get("/evidence/{evidence_id}/annotations", response_model=List[AnnotationResponse])
def list_annotations(evidence_id: str, db: Session = Depends(get_db)):
    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    items = db.query(EvidenceAnnotation).filter(EvidenceAnnotation.evidence_id == evidence_id).order_by(EvidenceAnnotation.created_at.asc()).all()
    return [
        AnnotationResponse(
            annotation_id=a.annotation_id,
            case_id=a.case_id,
            evidence_id=a.evidence_id,
            x=a.x,
            y=a.y,
            width=a.width,
            height=a.height,
            label=a.label,
            notes=a.notes,
            created_by=a.created_by,
            created_at=a.created_at
        )
        for a in items
    ]

@router.delete("/evidence/{evidence_id}/annotations/{annotation_id}", status_code=204)
def delete_annotation(evidence_id: str, annotation_id: str, db: Session = Depends(get_db)):
    ann = db.query(EvidenceAnnotation).filter(
        EvidenceAnnotation.evidence_id == evidence_id,
        EvidenceAnnotation.annotation_id == annotation_id
    ).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Annotation not found")

    db.delete(ann)
    db.commit()
    return None
