from datetime import datetime
from pathlib import Path
from typing import List
from sqlalchemy.orm import Session
from spectrix.models.job import AnalysisJob
from spectrix.models.finding import ForensicFinding
from spectrix.models.evidence import EvidenceAsset, CustodyEvent
from spectrix.pipelines.ela import ELAPipeline
from spectrix.pipelines.metadata_exif import MetadataInspectionPipeline
from spectrix.pipelines.noise_prnu import NoisePRNUPipeline

# Registry of available analysis pipelines
PIPELINE_REGISTRY = {
    "ela_compression": ELAPipeline(),
    "metadata_inspection": MetadataInspectionPipeline(),
    "noise_analysis": NoisePRNUPipeline(),
}

def execute_analysis_job(job_id: str, db: Session):
    job = db.query(AnalysisJob).filter(AnalysisJob.job_id == job_id).first()
    if not job:
        return

    evidence = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == job.evidence_id).first()
    if not evidence:
        job.status = "failed"
        job.log_messages.append("Evidence asset not found in storage record")
        db.commit()
        return

    file_path = Path(evidence.storage_path)
    if not file_path.exists():
        job.status = "failed"
        job.log_messages.append(f"Evidence file missing on disk: {file_path}")
        db.commit()
        return

    job.status = "processing"
    job.progress_percent = 10
    job.log_messages = [f"Starting forensic examination for Evidence {evidence.evidence_id}"]
    db.commit()

    selected_pipelines = job.pipelines or list(PIPELINE_REGISTRY.keys())
    total_pipelines = len(selected_pipelines)
    emitted_findings = []

    for idx, pipe_name in enumerate(selected_pipelines, start=1):
        pipeline = PIPELINE_REGISTRY.get(pipe_name)
        if not pipeline:
            job.log_messages.append(f"Pipeline '{pipe_name}' not available in registry. Skipping.")
            continue

        try:
            job.log_messages.append(f"Executing pipeline: {pipe_name} ({idx}/{total_pipelines})")
            db.commit()

            raw_findings = pipeline.run(
                file_path=file_path,
                evidence_id=evidence.evidence_id,
                case_id=job.case_id
            )

            for f_data in raw_findings:
                finding = ForensicFinding(
                    finding_id=f_data["finding_id"],
                    case_id=job.case_id,
                    evidence_id=evidence.evidence_id,
                    modality=f_data.get("modality", "image"),
                    finding_type=f_data["finding_type"],
                    method_id=f_data["method_id"],
                    model_id=f_data.get("model_id"),
                    model_version=f_data.get("model_version"),
                    classification=f_data["classification"],
                    score=f_data.get("score"),
                    score_semantics=f_data.get("score_semantics", "heuristic_variance_percentage"),
                    calibration_status=f_data.get("calibration_status", "uncalibrated_heuristic"),
                    media_location=f_data.get("media_location", {}),
                    supporting_observations=f_data.get("supporting_observations", []),
                    explanation=f_data["explanation"],
                    limitations=f_data["limitations"],
                    review_status=f_data.get("review_status", "unreviewed"),
                )
                db.add(finding)
                emitted_findings.append(finding)

            job.progress_percent = int((idx / total_pipelines) * 90)
            db.commit()

        except Exception as e:
            job.log_messages.append(f"Pipeline '{pipe_name}' encountered error: {str(e)}")
            db.commit()

    # Record custody audit event
    custody_event = CustodyEvent(
        event_id=f"EVT-ANL-{job_id[:8]}",
        case_id=job.case_id,
        evidence_id=evidence.evidence_id,
        event_type="analyzed",
        sha256_at_event=evidence.sha256_digest,
        performed_by="SPECTRIX Analysis Engine",
        details_json={
            "job_id": job_id,
            "pipelines_executed": selected_pipelines,
            "findings_generated": len(emitted_findings)
        }
    )
    db.add(custody_event)

    job.status = "completed"
    job.progress_percent = 100
    job.completed_at = datetime.utcnow()
    job.log_messages.append(f"Analysis complete. Generated {len(emitted_findings)} forensic findings.")
    db.commit()

