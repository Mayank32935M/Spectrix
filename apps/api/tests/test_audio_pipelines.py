import struct
from pathlib import Path
from spectrix.pipelines.audio_spectral import AudioSpectralPipeline, parse_wav_header
from spectrix.pipelines.audio_synthetic_voice import AudioSyntheticVoicePipeline
from spectrix.pipelines.runner import execute_analysis_job
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset
from spectrix.models.job import AnalysisJob
from spectrix.models.finding import ForensicFinding

def create_synthetic_wav_bytes(duration_sec: float = 3.0, sample_rate: int = 48000, channels: int = 2, bit_depth: int = 24) -> bytes:
    """Generates a minimal valid RIFF/WAVE PCM byte stream for testing."""
    bytes_per_sample = bit_depth // 8
    block_align = channels * bytes_per_sample
    byte_rate = sample_rate * block_align
    num_samples = int(duration_sec * sample_rate)
    data_size = num_samples * block_align

    # RIFF header
    riff_header = b"RIFF" + struct.pack("<I", 36 + data_size) + b"WAVE"

    # fmt chunk (PCM = 1)
    fmt_chunk = b"fmt " + struct.pack("<I", 16) + struct.pack("<HHIIHH", 1, channels, sample_rate, byte_rate, block_align, bit_depth)

    # data chunk
    dummy_data = b"\x00" * data_size
    data_chunk = b"data" + struct.pack("<I", data_size) + dummy_data

    return riff_header + fmt_chunk + data_chunk

def test_wav_header_parser():
    wav_bytes = create_synthetic_wav_bytes(duration_sec=2.5, sample_rate=48000, channels=2, bit_depth=24)
    specs = parse_wav_header(wav_bytes)

    assert specs["is_valid_wav"] is True
    assert specs["channels"] == 2
    assert specs["sample_rate"] == 48000
    assert specs["bit_depth"] == 24
    assert specs["duration_seconds"] == 2.5

def test_audio_spectral_pipeline(tmp_path: Path):
    test_file = tmp_path / "recording.wav"
    test_file.write_bytes(create_synthetic_wav_bytes())

    pipeline = AudioSpectralPipeline()
    assert pipeline.pipeline_id == "audio_spectral_analysis"
    assert pipeline.modality == "audio"

    findings = pipeline.run(test_file, evidence_id="EV-AUD-01", case_id="CASE-AUD-TEST")
    assert len(findings) == 2

    # Check spectral discontinuity finding
    disc = next(f for f in findings if f["finding_type"] == "spectral_discontinuity")
    assert disc["modality"] == "audio"
    assert disc["score"] == 0.84
    assert "00:01:21.000" in disc["media_location"]["smpte_start"]
    assert "PhaseSplice_Det_v1.4" in disc["model_id"]
    assert "occlusion" in disc["limitations"]

    # Check noise floor elevation finding
    noise = next(f for f in findings if f["finding_type"] == "noise_floor_elevation")
    assert noise["media_location"]["noise_delta_db"] == 4.2
    assert noise["media_location"]["frequency_band_hz"] == [100, 1200]

def test_audio_synthetic_voice_pipeline(tmp_path: Path):
    test_file = tmp_path / "recording.wav"
    test_file.write_bytes(create_synthetic_wav_bytes())

    pipeline = AudioSyntheticVoicePipeline()
    assert pipeline.pipeline_id == "audio_synthetic_voice"
    assert pipeline.modality == "audio"

    findings = pipeline.run(test_file, evidence_id="EV-AUD-02", case_id="CASE-AUD-TEST")
    assert len(findings) == 2

    # Check synthetic speech finding
    synth = next(f for f in findings if f["finding_type"] == "synthetic_speech_characteristic")
    assert synth["score"] == 0.92
    assert "NeuralAcoustic_v3.2" in synth["model_id"]
    assert synth["media_location"]["frequency_band_hz"] == [3800, 7400]
    assert "LR ~ 10^3.4" in synth["supporting_observations"][2]
    assert "legal proof" in synth["limitations"]

    # Check speaker diarization finding
    spk = next(f for f in findings if f["finding_type"] == "speaker_diarization_transition")
    assert spk["media_location"]["speaker_cluster_a"] == "SPK-01"
    assert spk["media_location"]["speaker_cluster_b"] == "SPK-02"

def test_audio_analysis_job_runner(db_session, tmp_path: Path):
    # Setup test Case & EvidenceAsset
    case = Case(
        case_id="CASE-AUD-RUNNER-TEST",
        case_number="SPX-2026-TEST-AUD",
        title="Audio Test Case",
        status="open",
        examiner_name="Forensic Acoustic Examiner"
    )
    db_session.add(case)
    db_session.commit()

    test_file = tmp_path / "speech.wav"
    test_file.write_bytes(create_synthetic_wav_bytes())

    evidence = EvidenceAsset(
        evidence_id="EV-AUD-TEST-01",
        case_id=case.case_id,
        filename="speech.wav",
        modality="audio",
        mime_type="audio/wav",
        storage_path=str(test_file),
        filesize_bytes=len(test_file.read_bytes()),
        sha256_digest="d9fec8319a9fc8319a9fc8319a9fc8319a9fc8319a9fc8319a9fc8319a9fc831",
        metadata_json={"sample_rate": 48000, "channels": 2}
    )
    db_session.add(evidence)
    db_session.commit()

    # Create job without explicit pipelines (should auto-select audio pipelines)
    job = AnalysisJob(
        job_id="JOB-AUD-TEST-01",
        case_id=case.case_id,
        evidence_id=evidence.evidence_id,
        status="pending",
        pipelines=[],
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
    assert "spectral_discontinuity" in types
    assert "noise_floor_elevation" in types
    assert "synthetic_speech_characteristic" in types
    assert "speaker_diarization_transition" in types
