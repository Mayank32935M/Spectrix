import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from spectrix.core.database import get_db
from spectrix.models.job import AnalysisJob
from spectrix.models.evidence import EvidenceAsset
from spectrix.schemas.job import JobCreateRequest, JobResponse
from spectrix.schemas.finding import FindingResponse
from spectrix.pipelines.runner import execute_analysis_job

router = APIRouter(tags=["Jobs"])

@router.post("/evidence/{evidence_id}/analyze", response_model=JobResponse, status_code=202)
def trigger_analysis_job(
    evidence_id: str,
    payload: JobCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    job_id = f"JOB-{uuid.uuid4().hex[:8]}"
    job = AnalysisJob(
        job_id=job_id,
        evidence_id=evidence.evidence_id,
        case_id=evidence.case_id,
        pipelines=payload.pipelines,
        status="queued",
        progress_percent=0,
        log_messages=["Job queued by examiner request"]
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(execute_analysis_job, job.job_id, db)

    return JobResponse(
        job_id=job.job_id,
        evidence_id=job.evidence_id,
        case_id=job.case_id,
        pipelines=job.pipelines,
        status=job.status,
        progress_percent=job.progress_percent,
        log_messages=job.log_messages,
        created_at=job.created_at,
        findings=[]
    )

@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(AnalysisJob).filter(AnalysisJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")

    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == job.evidence_id).first()
    findings = evidence.findings if evidence else []

    findings_response = [
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

    return JobResponse(
        job_id=job.job_id,
        evidence_id=job.evidence_id,
        case_id=job.case_id,
        pipelines=job.pipelines,
        status=job.status,
        progress_percent=job.progress_percent,
        log_messages=job.log_messages,
        created_at=job.created_at,
        completed_at=job.completed_at,
        findings=findings_response
    )

