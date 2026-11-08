import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from PIL import Image

from spectrix.core.database import get_db
from spectrix.core.storage import vault
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset, CustodyEvent
from spectrix.models.job import AnalysisJob
from spectrix.schemas.evidence import EvidenceResponse, IntegrityVerificationResponse
from spectrix.pipelines.runner import execute_analysis_job

router = APIRouter(tags=["Evidence"])

@router.post("/cases/{case_id}/evidence", response_model=EvidenceResponse, status_code=201)
async def upload_evidence(
    case_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    precomputed_sha256: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter((Case.case_id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence_id = f"SPX-EV-{uuid.uuid4().hex[:6].upper()}"

    # Save to immutable vault and compute SHA-256
    file_path, computed_sha256, filesize = await vault.save_upload(file, evidence_id)

    # Optional client digest match check
    if precomputed_sha256 and precomputed_sha256.lower() != computed_sha256.lower():
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"SHA-256 digest mismatch. Client: {precomputed_sha256}, Computed: {computed_sha256}"
        )

    # Detect modality and extract basic media metadata
    filename_lower = file.filename.lower() if file.filename else ""
    if filename_lower.endswith((".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp")):
        modality = "image"
    elif filename_lower.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm")):
        modality = "video"
    elif filename_lower.endswith((".wav", ".mp3", ".flac", ".ogg", ".m4a")):
        modality = "audio"
    else:
        modality = "document"

    metadata = {
        "original_filename": file.filename,
        "content_type": file.content_type,
    }

    # Extract image dimensions if image
    if modality == "image":
        try:
            with Image.open(file_path) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height
                metadata["format"] = img.format
                metadata["mode"] = img.mode
        except Exception:
            pass

    # Create evidence asset record
    asset = EvidenceAsset(
        evidence_id=evidence_id,
        case_id=case.case_id,
        filename=file.filename or "evidence.bin",
        filesize_bytes=filesize,
        mime_type=file.content_type or "application/octet-stream",
        modality=modality,
        sha256_digest=computed_sha256,
        storage_path=str(file_path),
        is_original=True,
        metadata_json=metadata
    )
    db.add(asset)

    # Create immutable chain of custody record
    custody_event = CustodyEvent(
        event_id=f"EVT-ING-{uuid.uuid4().hex[:8]}",
        case_id=case.case_id,
        evidence_id=evidence_id,
        event_type="ingested",
        sha256_at_event=computed_sha256,
        performed_by="SPECTRIX Ingestion Gateway",
        details_json={
            "filename": file.filename,
            "filesize_bytes": filesize,
            "modality": modality,
            "vault_path": str(file_path)
        }
    )
    db.add(custody_event)

    # Automatically queue baseline analysis job
    job_id = f"JOB-{uuid.uuid4().hex[:8]}"
    job = AnalysisJob(
        job_id=job_id,
        evidence_id=evidence_id,
        case_id=case.case_id,
        pipelines=["ela_compression", "metadata_inspection", "noise_analysis"],
        status="queued",
        progress_percent=0,
        log_messages=["Job queued automatically upon ingestion"]
    )
    db.add(job)
    db.commit()
    db.refresh(asset)

    # Run analysis asynchronously in background
    background_tasks.add_task(execute_analysis_job, job_id, db)

    return EvidenceResponse(
        evidence_id=asset.evidence_id,
        case_id=asset.case_id,
        filename=asset.filename,
        filesize_bytes=asset.filesize_bytes,
        mime_type=asset.mime_type,
        modality=asset.modality,
        sha256_digest=asset.sha256_digest,
        registered_at=asset.registered_at,
        storage_path=asset.storage_path,
        is_original=asset.is_original,
        metadata=asset.metadata_json or {},
        custody_chain_length=1,
        preview_url=f"/api/v1/evidence/{asset.evidence_id}/file"
    )

@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
def list_case_evidence(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter((Case.case_id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    items = db.query(EvidenceAsset).filter(EvidenceAsset.case_id == case.case_id).all()
    return [
        EvidenceResponse(
            evidence_id=e.evidence_id,
            case_id=e.case_id,
            filename=e.filename,
            filesize_bytes=e.filesize_bytes,
            mime_type=e.mime_type,
            modality=e.modality,
            sha256_digest=e.sha256_digest,
            registered_at=e.registered_at,
            storage_path=e.storage_path,
            is_original=e.is_original,
            derived_from_id=e.derived_from_id,
            derivation_method=e.derivation_method,
            metadata=e.metadata_json or {},
            custody_chain_length=len(e.custody_events),
            preview_url=f"/api/v1/evidence/{e.evidence_id}/file"
        )
        for e in items
    ]

@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: str, db: Session = Depends(get_db)):
    e = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    return EvidenceResponse(
        evidence_id=e.evidence_id,
        case_id=e.case_id,
        filename=e.filename,
        filesize_bytes=e.filesize_bytes,
        mime_type=e.mime_type,
        modality=e.modality,
        sha256_digest=e.sha256_digest,
        registered_at=e.registered_at,
        storage_path=e.storage_path,
        is_original=e.is_original,
        derived_from_id=e.derived_from_id,
        derivation_method=e.derivation_method,
        metadata=e.metadata_json or {},
        custody_chain_length=len(e.custody_events),
        preview_url=f"/api/v1/evidence/{e.evidence_id}/file"
    )

@router.get("/evidence/{evidence_id}/integrity", response_model=IntegrityVerificationResponse)
def verify_integrity(evidence_id: str, db: Session = Depends(get_db)):
    e = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    file_path = Path(e.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=500, detail="Evidence file missing on disk")

    current_sha256 = vault.calculate_sha256(file_path)
    status = "MATCH" if current_sha256.lower() == e.sha256_digest.lower() else "MISMATCH"

    # Log verification event in custody chain
    evt = CustodyEvent(
        event_id=f"EVT-VER-{uuid.uuid4().hex[:8]}",
        case_id=e.case_id,
        evidence_id=e.evidence_id,
        event_type="verified",
        sha256_at_event=current_sha256,
        performed_by="Forensic Integrity Auditor",
        details_json={"status": status, "registered_sha256": e.sha256_digest}
    )
    db.add(evt)
    db.commit()

    return IntegrityVerificationResponse(
        evidence_id=e.evidence_id,
        registered_sha256=e.sha256_digest,
        current_sha256=current_sha256,
        integrity_status=status,
        verified_at=evt.timestamp,
        notice="File integrity only — does not establish content authenticity or provenance"
    )

@router.get("/evidence/{evidence_id}/file")
def get_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    e = db.query(EvidenceAsset).filter(EvidenceAsset.evidence_id == evidence_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Evidence asset not found")

    file_path = Path(e.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")

    return FileResponse(path=file_path, media_type=e.mime_type, filename=e.filename)

@router.get("/evidence/{evidence_id}/derivative/{derivative_name}")
def get_derivative_file(evidence_id: str, derivative_name: str):
    target_path = Path(vault.derivatives_dir) / evidence_id / derivative_name
    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Derivative file not found")
    return FileResponse(path=target_path, media_type="image/png")

