from spectrix.routers.copilot import query_forensic_copilot, CopilotQueryRequest
from spectrix.routers.reports import get_case_forensic_report
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset
from spectrix.models.finding import ForensicFinding
from spectrix.models.annotation import EvidenceAnnotation

def test_copilot_query_endpoint(db_session, tmp_path):
    # Setup test Case, Evidence, Findings
    case = Case(
        case_id="CASE-COPILOT-01",
        case_number="SPX-2026-COPILOT",
        title="Copilot Inquiry",
        status="open",
        examiner_name="Dr. E. Vance"
    )
    db_session.add(case)
    db_session.commit()

    test_file = tmp_path / "target.mp4"
    test_file.write_bytes(b"dummy_bytes")

    evidence = EvidenceAsset(
        evidence_id="EV-COPILOT-01",
        case_id=case.case_id,
        filename="target.mp4",
        modality="video",
        mime_type="video/mp4",
        storage_path=str(test_file),
        filesize_bytes=11,
        sha256_digest="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    )
    db_session.add(evidence)
    db_session.commit()

    finding = ForensicFinding(
        finding_id="FND-COPILOT-01",
        case_id=case.case_id,
        evidence_id=evidence.evidence_id,
        modality="video",
        finding_type="temporal_boundary_inconsistency",
        method_id="dense_optical_flow",
        model_id="TemporalFace_v2.4",
        classification="anomaly",
        score=0.88,
        media_location={"smpte_target": "00:01:14:18", "target_frame": 2238},
        explanation="Mandibular boundary discontinuity observed.",
        limitations="Benchmark score only; requires multi-spectral corroboration."
    )
    db_session.add(finding)

    annotation = EvidenceAnnotation(
        annotation_id="ANN-COPILOT-01",
        case_id=case.case_id,
        evidence_id=evidence.evidence_id,
        x=2238,
        y=74600,
        label="Frame #2238",
        notes="Correlated lip retargeting note",
        created_by="Dr. E. Vance"
    )
    db_session.add(annotation)
    db_session.commit()

    # Query Copilot
    req = CopilotQueryRequest(query="What anomalies exist in the video?")
    res = query_forensic_copilot(case.case_id, req, db_session)

    assert res.case_id == case.case_id
    assert "temporal_boundary_inconsistency" in res.answer or "Mandibular" in res.answer
    assert len(res.grounding_references) >= 2
    assert len(res.observations) >= 2
    assert len(res.forensic_limitations) >= 2
    assert any("legal proof" in lim for lim in res.forensic_limitations)

def test_case_forensic_report_generation(db_session, tmp_path):
    case = Case(
        case_id="CASE-REPORT-01",
        case_number="SPX-2026-REPORT",
        title="Dossier Report Test",
        status="active",
        examiner_name="Special Agent Analyst"
    )
    db_session.add(case)
    db_session.commit()

    test_file = tmp_path / "evidence.png"
    test_file.write_bytes(b"image_bytes")

    evidence = EvidenceAsset(
        evidence_id="EV-REPORT-01",
        case_id=case.case_id,
        filename="evidence.png",
        modality="image",
        mime_type="image/png",
        storage_path=str(test_file),
        filesize_bytes=11,
        sha256_digest="1122334455667788990011223344556677889900112233445566778899001122"
    )
    db_session.add(evidence)
    db_session.commit()

    finding = ForensicFinding(
        finding_id="FND-REPORT-01",
        case_id=case.case_id,
        evidence_id=evidence.evidence_id,
        modality="image",
        finding_type="error_level_analysis",
        method_id="ela_pipeline",
        classification="anomaly",
        score=0.91,
        explanation="Resaving compression artifact gradient mismatch.",
        limitations="Does not establish legal proof."
    )
    db_session.add(finding)
    db_session.commit()

    report = get_case_forensic_report(case.case_id, db_session)

    assert report["case_number"] == case.case_number
    assert report["total_evidence_assets"] == 1
    assert report["total_findings"] == 1
    assert "SPECTRIX FORENSIC EXAMINATION REPORT & LEGAL AFFIDAVIT" in report["affidavit_markdown"]
    assert "1122334455667788990011223344556677889900112233445566778899001122" in report["affidavit_markdown"]
    assert "File Integrity ≠ Content Authenticity" in report["affidavit_markdown"]
    assert "EXAMINER DIGITAL ATTESTATION" in report["affidavit_markdown"]
