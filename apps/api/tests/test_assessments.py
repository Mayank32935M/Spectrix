import pytest
from datetime import datetime
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset
from spectrix.models.finding import ForensicFinding
from spectrix.models.job import AnalysisJob
from spectrix.models.assessment import EvidenceAssessment
from spectrix.assessment.engine import VerdictEngine
from spectrix.routers.assessments import get_evidence_assessment, reevaluate_evidence_assessment, get_assessment_history, get_case_assessment

def test_assessment_insufficient_analysis(db_session):
    """Case where no findings exist yet -> INSUFFICIENT_ANALYSIS"""
    case = Case(case_id="CASE-ASM-01", case_number="SPX-2026-ASM01", title="Test Case", examiner_name="Tester")
    db_session.add(case)
    db_session.commit()

    ev = EvidenceAsset(
        evidence_id="EV-ASM-01",
        case_id=case.case_id,
        filename="unprocessed.png",
        filesize_bytes=1024,
        mime_type="image/png",
        modality="image",
        sha256_digest="1111111111111111111111111111111111111111111111111111111111111111",
        storage_path="/tmp/unprocessed.png",
        is_original=True
    )
    db_session.add(ev)
    db_session.commit()

    asm = VerdictEngine.evaluate_evidence(ev, [], [], db_session)
    assert asm.verdict == "INSUFFICIENT_ANALYSIS"
    assert asm.ai_generation_assessment == "UNEXAMINED"
    assert asm.manipulation_assessment == "UNEXAMINED"
    assert asm.authenticity_assessment == "UNVERIFIABLE"
    assert asm.assessment_version == 1
    assert asm.status == "active"

def test_assessment_authenticity_supported(db_session):
    """Case where all required image examinations ran and zero anomalies were found -> AUTHENTICITY_SUPPORTED"""
    case = Case(case_id="CASE-ASM-02", case_number="SPX-2026-ASM02", title="Auth Test", examiner_name="Tester")
    db_session.add(case)
    db_session.commit()

    ev = EvidenceAsset(
        evidence_id="EV-ASM-02",
        case_id=case.case_id,
        filename="authentic_camera.jpg",
        filesize_bytes=2048,
        mime_type="image/jpeg",
        modality="image",
        sha256_digest="2222222222222222222222222222222222222222222222222222222222222222",
        storage_path="/tmp/authentic.jpg",
        is_original=True
    )
    db_session.add(ev)
    db_session.commit()

    # Create baseline_match findings across all required pipelines
    clean_findings = [
        ForensicFinding(
            finding_id=f"FND-AUTH-{i}",
            case_id=case.case_id,
            evidence_id=ev.evidence_id,
            modality="image",
            finding_type=f"{pipe}_consistent",
            method_id=f"{pipe}:v1.0",
            classification="baseline_match",
            score=0.05,
            score_semantics="anomaly_probability",
            explanation=f"Clean baseline match for {pipe}",
            limitations="Standard test limitations"
        )
        for i, pipe in enumerate(["ela_compression", "metadata_inspection", "noise_analysis", "copymove_detection", "fft_frequency"])
    ]
    for f in clean_findings:
        db_session.add(f)
    db_session.commit()

    job = AnalysisJob(
        job_id="JOB-ASM-02",
        evidence_id=ev.evidence_id,
        case_id=case.case_id,
        pipelines=["ela_compression", "metadata_inspection", "noise_analysis", "copymove_detection", "fft_frequency"],
        status="completed"
    )
    db_session.add(job)
    db_session.commit()

    asm = VerdictEngine.evaluate_evidence(ev, clean_findings, [job], db_session)
    assert asm.verdict == "AUTHENTICITY_SUPPORTED"
    assert asm.ai_generation_assessment == "SYNTHETIC_NOT_DETECTED"
    assert asm.manipulation_assessment == "MANIPULATION_NOT_DETECTED"
    assert asm.authenticity_assessment == "AUTHENTICITY_SUPPORTED_WITH_LIMITATIONS"
    assert "not certify genuine real-world provenance" in asm.explanation or any("not certify genuine" in l for l in asm.limitations)

def test_assessment_likely_manipulated(db_session):
    """Case where multiple physical manipulation detectors flag anomalies -> LIKELY_MANIPULATED"""
    case = Case(case_id="CASE-ASM-03", case_number="SPX-2026-ASM03", title="Tamper Test", examiner_name="Tester")
    db_session.add(case)
    db_session.commit()

    ev = EvidenceAsset(
        evidence_id="EV-ASM-03",
        case_id=case.case_id,
        filename="spliced.png",
        filesize_bytes=4096,
        mime_type="image/png",
        modality="image",
        sha256_digest="3333333333333333333333333333333333333333333333333333333333333333",
        storage_path="/tmp/spliced.png",
        is_original=True
    )
    db_session.add(ev)
    db_session.commit()

    # Add ELA anomaly and PRNU void anomaly
    f_ela = ForensicFinding(
        finding_id="FND-ELA-01",
        case_id=case.case_id,
        evidence_id=ev.evidence_id,
        modality="image",
        finding_type="ela_compression_anomaly",
        method_id="ela_jpeg_resave:v1.0",
        classification="anomaly",
        score=0.92,
        score_semantics="variance_score",
        explanation="Localized JPEG compression disparity in upper right quadrant",
        limitations="Sensitive to quality"
    )
    f_prnu = ForensicFinding(
        finding_id="FND-PRNU-01",
        case_id=case.case_id,
        evidence_id=ev.evidence_id,
        modality="image",
        finding_type="sensor_noise_prnu_anomaly",
        method_id="prnu_residual_correlation:v1.2",
        classification="anomaly",
        score=0.88,
        score_semantics="prnu_correlation_drop",
        explanation="Disrupted PRNU sensor pattern noise in spliced region",
        limitations="Noise floor"
    )
    db_session.add(f_ela)
    db_session.add(f_prnu)
    db_session.commit()

    job = AnalysisJob(
        job_id="JOB-ASM-03",
        evidence_id=ev.evidence_id,
        case_id=case.case_id,
        pipelines=["ela_compression", "noise_analysis"],
        status="completed"
    )
    db_session.add(job)
    db_session.commit()

    asm = VerdictEngine.evaluate_evidence(ev, [f_ela, f_prnu], [job], db_session)
    assert asm.verdict == "LIKELY_MANIPULATED"
    assert asm.manipulation_assessment == "MANIPULATION_DETECTED"
    assert asm.authenticity_assessment == "AUTHENTICITY_UNDERMINED"
    assert len(asm.supporting_findings) >= 2

def test_assessment_likely_ai_generated(db_session):
    """Case where 2D-FFT lattice detects generative upsampling artifacts -> LIKELY_AI_GENERATED"""
    case = Case(case_id="CASE-ASM-04", case_number="SPX-2026-ASM04", title="GenAI Test", examiner_name="Tester")
    db_session.add(case)
    db_session.commit()

    ev = EvidenceAsset(
        evidence_id="EV-ASM-04",
        case_id=case.case_id,
        filename="diffusion_portrait.png",
        filesize_bytes=5120,
        mime_type="image/png",
        modality="image",
        sha256_digest="4444444444444444444444444444444444444444444444444444444444444444",
        storage_path="/tmp/diffusion.png",
        is_original=True
    )
    db_session.add(ev)
    db_session.commit()

    f_fft = ForensicFinding(
        finding_id="FND-FFT-01",
        case_id=case.case_id,
        evidence_id=ev.evidence_id,
        modality="image",
        finding_type="fft_spectral_artifact",
        method_id="fft_spectral_lattice:v1.0",
        classification="anomaly",
        score=0.95,
        score_semantics="spectral_lattice_score",
        explanation="Periodic lattice peaks indicative of generative conv-transpose upsampling",
        limitations="Standard FFT"
    )
    db_session.add(f_fft)
    db_session.commit()

    asm = VerdictEngine.evaluate_evidence(ev, [f_fft], [], db_session)
    assert asm.verdict == "LIKELY_AI_GENERATED"
    assert asm.ai_generation_assessment == "SYNTHETIC_SUPPORTED"
    assert asm.authenticity_assessment == "AUTHENTICITY_UNDERMINED"

def test_assessment_superseding_history(db_session):
    """Verify that re-evaluating creates version 2 and marks version 1 as superseded"""
    case = Case(case_id="CASE-ASM-05", case_number="SPX-2026-ASM05", title="History Test", examiner_name="Tester")
    db_session.add(case)
    db_session.commit()

    ev = EvidenceAsset(
        evidence_id="EV-ASM-05",
        case_id=case.case_id,
        filename="evolving.png",
        filesize_bytes=1024,
        mime_type="image/png",
        modality="image",
        sha256_digest="5555555555555555555555555555555555555555555555555555555555555555",
        storage_path="/tmp/evolving.png",
        is_original=True
    )
    db_session.add(ev)
    db_session.commit()

    # Initial assessment without findings -> INSUFFICIENT_ANALYSIS (v1)
    asm_v1 = VerdictEngine.evaluate_evidence(ev, [], [], db_session)
    assert asm_v1.assessment_version == 1
    assert asm_v1.status == "active"

    # Add findings and re-evaluate -> v2
    f = ForensicFinding(
        finding_id="FND-HIST-01",
        case_id=case.case_id,
        evidence_id=ev.evidence_id,
        modality="image",
        finding_type="copymove_duplication",
        method_id="copymove_dct_block_matcher:v1.0",
        classification="anomaly",
        score=0.89,
        explanation="Cloned block regions",
        limitations="None"
    )
    db_session.add(f)
    db_session.commit()

    asm_v2 = VerdictEngine.evaluate_evidence(ev, [f], [], db_session)
    assert asm_v2.assessment_version == 2
    assert asm_v2.status == "active"

    # Refresh v1 to verify it is marked superseded
    db_session.refresh(asm_v1)
    assert asm_v1.status == "superseded"

    # Query history via router helper
    history = get_assessment_history(evidence_id=ev.evidence_id, db=db_session)
    assert len(history) == 2
    assert history[0].assessment_version == 2
    assert history[1].assessment_version == 1

def test_case_level_assessment(db_session):
    """Verify case-level aggregation across multiple evidence assets"""
    case = Case(case_id="CASE-ASM-06", case_number="SPX-2026-ASM06", title="Case Aggregation", examiner_name="Lead Analyst")
    db_session.add(case)
    db_session.commit()

    ev_img = EvidenceAsset(
        evidence_id="EV-CASE-01",
        case_id=case.case_id,
        filename="briefing_frame.png",
        filesize_bytes=2048,
        mime_type="image/png",
        modality="image",
        sha256_digest="6666666666666666666666666666666666666666666666666666666666666666",
        storage_path="/tmp/f.png",
        is_original=True
    )
    ev_aud = EvidenceAsset(
        evidence_id="EV-CASE-02",
        case_id=case.case_id,
        filename="briefing_audio.wav",
        filesize_bytes=10000,
        mime_type="audio/wav",
        modality="audio",
        sha256_digest="7777777777777777777777777777777777777777777777777777777777777777",
        storage_path="/tmp/a.wav",
        is_original=True
    )
    db_session.add(ev_img)
    db_session.add(ev_aud)
    db_session.commit()

    # Add GenAI finding to audio
    f_aud = ForensicFinding(
        finding_id="FND-AUD-GEN-01",
        case_id=case.case_id,
        evidence_id=ev_aud.evidence_id,
        modality="audio",
        finding_type="synthetic_vocoder_harmonics",
        method_id="neural_vocoder_detector:v2.1",
        classification="anomaly",
        score=0.94,
        explanation="Neural vocoder harmonics detected",
        limitations="Audio limits"
    )
    db_session.add(f_aud)
    db_session.commit()

    case_eval = get_case_assessment(case_id=case.case_id, db=db_session)
    assert case_eval["case_id"] == case.case_id
    assert case_eval["total_evidence_assets"] == 2
    assert case_eval["assessed_assets_count"] == 2
    assert "SYNTHETIC_CONTENT_DETECTED" in case_eval["overall_case_conclusion"] or "CASE_ASSESSMENT_PROVISIONAL" in case_eval["overall_case_conclusion"]
    assert len(case_eval["individual_assessments"]) == 2
