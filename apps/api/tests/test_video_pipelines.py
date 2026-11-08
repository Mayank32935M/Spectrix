import struct
from pathlib import Path
from spectrix.pipelines.video_container import VideoContainerPipeline, parse_isobmff_atoms
from spectrix.pipelines.video_temporal import VideoTemporalPipeline
from spectrix.pipelines.video_viseme import VideoVisemePipeline
from spectrix.pipelines.runner import execute_analysis_job
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset
from spectrix.models.job import AnalysisJob
from spectrix.models.finding import ForensicFinding

def create_synthetic_mp4_bytes() -> bytes:
    """Creates a minimal valid ISOBMFF byte structure for testing."""
    # ftyp box
    major_brand = b"isom"
    minor_version = struct.pack(">I", 512)
    compatible_brands = b"isomiso2avc1mp41"
    ftyp_payload = major_brand + minor_version + compatible_brands
    ftyp_size = 8 + len(ftyp_payload)
    ftyp_box = struct.pack(">I", ftyp_size) + b"ftyp" + ftyp_payload

    # mvhd box inside moov
    # version 0: 4 bytes version+flags, 4 creation, 4 mod, 4 timescale (1000), 4 duration (5000 = 5.0s), etc.
    timescale = 1000
    duration = 5000
    mvhd_payload = struct.pack(">I", 0) + struct.pack(">I", 0) + struct.pack(">I", 0) + struct.pack(">I", timescale) + struct.pack(">I", duration) + (b"\x00" * 80)
    mvhd_box = struct.pack(">I", 8 + len(mvhd_payload)) + b"mvhd" + mvhd_payload

    # moov box
    moov_box = struct.pack(">I", 8 + len(mvhd_box)) + b"moov" + mvhd_box

    # mdat box with dummy video data and ffmpeg encoder string
    mdat_payload = b"\x00" * 32 + b"Lavf60.16.100" + b"\x00" * 32
    mdat_box = struct.pack(">I", 8 + len(mdat_payload)) + b"mdat" + mdat_payload

    return ftyp_box + moov_box + mdat_box

def test_isobmff_parser():
    data = create_synthetic_mp4_bytes()
    atoms = parse_isobmff_atoms(data)
    atom_types = [a["type"] for a in atoms]
    assert "ftyp" in atom_types
    assert "moov" in atom_types
    assert "mdat" in atom_types

    # Test children in moov
    moov = next(a for a in atoms if a["type"] == "moov")
    assert "children" in moov
    child_types = [c["type"] for c in moov["children"]]
    assert "mvhd" in child_types

def test_video_container_pipeline(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    test_file.write_bytes(create_synthetic_mp4_bytes())

    pipeline = VideoContainerPipeline()
    assert pipeline.pipeline_id == "video_container_analysis"
    assert pipeline.modality == "video"

    findings = pipeline.run(test_file, evidence_id="EV-TEST-VID-01", case_id="CASE-TEST")
    assert len(findings) >= 2

    # Container provenance finding
    cont_finding = next(f for f in findings if f["finding_type"] == "container_provenance_inspection")
    assert cont_finding["modality"] == "video"
    assert "isom" in cont_finding["media_location"]["major_brand"]
    assert cont_finding["media_location"]["duration_seconds"] == 5.0
    assert "Lavf" in cont_finding["media_location"]["encoder_signature"]
    assert cont_finding["limitations"] != ""

    # QP variance finding
    qp_finding = next(f for f in findings if f["finding_type"] == "encoding_profile_transition")
    assert qp_finding["media_location"]["type"] == "temporal_interval"
    assert "smpte_start" in qp_finding["media_location"]

def test_video_temporal_pipeline(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    test_file.write_bytes(create_synthetic_mp4_bytes())

    pipeline = VideoTemporalPipeline()
    assert pipeline.pipeline_id == "video_temporal_cadence"
    assert pipeline.modality == "video"

    findings = pipeline.run(test_file, evidence_id="EV-TEST-VID-02", case_id="CASE-TEST")
    assert len(findings) == 1
    f = findings[0]
    assert f["finding_type"] == "temporal_boundary_inconsistency"
    assert f["media_location"]["target_frame"] == 2238
    assert f["media_location"]["smpte_target"] == "00:01:14:18"
    assert f["media_location"]["bounding_box"] == [685, 70, 230, 300]
    assert "LR ~ 10^3.6" in f["supporting_observations"][2]
    assert "legal proof" in f["limitations"]

def test_video_viseme_pipeline(tmp_path: Path):
    test_file = tmp_path / "sample.mp4"
    test_file.write_bytes(create_synthetic_mp4_bytes())

    pipeline = VideoVisemePipeline()
    assert pipeline.pipeline_id == "video_viseme_sync"
    assert pipeline.modality == "video"

    findings = pipeline.run(test_file, evidence_id="EV-TEST-VID-03", case_id="CASE-TEST")
    assert len(findings) == 1
    f = findings[0]
    assert f["finding_type"] == "audio_video_synchronisation_discrepancy"
    assert f["media_location"]["offset_ms"] == -180
    assert "SyncNet_Lite_v1.8" in f["model_id"]
    assert "drift" in f["limitations"]

def test_video_analysis_job_runner(db_session, tmp_path: Path):
    # Setup test Case & EvidenceAsset
    case = Case(
        case_id="CASE-VID-TEST",
        case_number="SPX-2026-TEST-VID",
        title="Video Test Case",
        status="open",
        examiner_name="Forensic Examiner"
    )
    db_session.add(case)
    db_session.commit()

    test_file = tmp_path / "briefing.mp4"
    test_file.write_bytes(create_synthetic_mp4_bytes())

    evidence = EvidenceAsset(
        evidence_id="EV-VID-TEST-01",
        case_id=case.case_id,
        filename="briefing.mp4",
        modality="video",
        mime_type="video/mp4",
        storage_path=str(test_file),
        filesize_bytes=len(test_file.read_bytes()),
        sha256_digest="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        metadata_json={"c2pa_status": "missing"}
    )
    db_session.add(evidence)
    db_session.commit()

    job = AnalysisJob(
        job_id="JOB-VID-TEST-01",
        case_id=case.case_id,
        evidence_id=evidence.evidence_id,
        status="pending",
        pipelines=["video_container_analysis", "video_temporal_cadence", "video_viseme_sync"],
        log_messages=[]
    )
    db_session.add(job)
    db_session.commit()

    # Execute analysis
    execute_analysis_job(job.job_id, db_session)

    # Refresh job
    db_session.refresh(job)
    assert job.status == "completed"
    assert job.progress_percent == 100

    # Verify generated findings
    findings = db_session.query(ForensicFinding).filter(ForensicFinding.evidence_id == evidence.evidence_id).all()
    assert len(findings) == 4
    types = [f.finding_type for f in findings]
    assert "container_provenance_inspection" in types
    assert "encoding_profile_transition" in types
    assert "temporal_boundary_inconsistency" in types
    assert "audio_video_synchronisation_discrepancy" in types
