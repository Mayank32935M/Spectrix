import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from spectrix.models.evidence import EvidenceAsset
from spectrix.models.finding import ForensicFinding
from spectrix.models.job import AnalysisJob
from spectrix.models.assessment import EvidenceAssessment
from spectrix.models.case import Case

# Expected core examination pipelines by modality
MODALITY_REQUIRED_EXAMINATIONS = {
    "image": [
        "ela_compression",
        "metadata_inspection",
        "noise_analysis",
        "copymove_detection",
        "fft_frequency"
    ],
    "video": [
        "video_container_analysis",
        "video_temporal_cadence",
        "video_viseme_sync"
    ],
    "audio": [
        "audio_spectral_analysis",
        "audio_synthetic_voice"
    ]
}

# Method reliability weights (0.0 to 1.0) based on forensic validation benchmarks
METHOD_RELIABILITY_WEIGHTS = {
    "prnu_residual_correlation:v1.2": 0.95,
    "fft_spectral_lattice:v1.0": 0.90,
    "temporal_cadence_optical_flow:v1.0": 0.90,
    "neural_vocoder_detector:v2.1": 0.90,
    "isobmff_atom_parser:v1.0": 0.85,
    "syncnet_viseme_audio:v1.0": 0.85,
    "copymove_dct_block_matcher:v1.0": 0.80,
    "stft_spectral_splice:v1.0": 0.80,
    "ela_jpeg_resave:v1.0": 0.75,
    "exif_metadata_parser:v1.0": 0.70,
}

# Finding type taxonomy classification
AI_SYNTHETIC_FINDING_TYPES = {
    "fft_spectral_artifact",
    "synthetic_vocoder_harmonics",
    "generative_adversarial_grid",
    "diffusion_latent_residual"
}

MANIPULATION_FINDING_TYPES = {
    "ela_compression_anomaly",
    "sensor_noise_prnu_anomaly",
    "copymove_duplication",
    "temporal_boundary_discontinuity",
    "mandibular_mesh_shearing",
    "viseme_synchronisation_lag",
    "spectral_splice_discontinuity",
    "ambient_noise_elevation",
    "container_atom_anomaly"
}

PIPELINE_KEYWORDS = {
    "ela_compression": ["ela"],
    "metadata_inspection": ["exif", "metadata"],
    "noise_analysis": ["prnu", "noise"],
    "copymove_detection": ["copymove"],
    "fft_frequency": ["fft"],
    "video_container_analysis": ["container", "atom", "c2pa", "isobmff"],
    "video_temporal_cadence": ["temporal", "mandibular", "cadence"],
    "video_viseme_sync": ["viseme", "syncnet"],
    "audio_spectral_analysis": ["spectral", "splice", "noise_floor", "ambient_noise"],
    "audio_synthetic_voice": ["synthetic", "vocoder", "diarization"]
}

class VerdictEngine:
    """
    Consolidated Forensic Assessment & Verdict Engine.
    Produces deterministic, explainable, versioned verdicts based on empirical findings,
    method reliability weighting, contradiction checks, and modality fusion policies.
    """

    POLICY_ID = "spectrix-fusion-v1"
    POLICY_VERSION = "1.0.0"

    @classmethod
    def evaluate_evidence(
        cls,
        evidence: EvidenceAsset,
        findings: List[ForensicFinding],
        jobs: List[AnalysisJob],
        db: Session,
        examiner_override_notes: Optional[str] = None
    ) -> EvidenceAssessment:
        """
        Evaluate an evidence asset and commit a new versioned EvidenceAssessment.
        Supersedes any existing active assessment for this evidence.
        """
        modality = evidence.modality.lower()
        required_pipes = MODALITY_REQUIRED_EXAMINATIONS.get(modality, [])

        # 1. Determine examinations performed vs unavailable/failed
        performed_pipes, unavailable_pipes = cls._resolve_examinations(jobs, findings, required_pipes)

        # 2. Check for insufficient analysis
        if len(findings) == 0 or len(performed_pipes) == 0:
            return cls._build_insufficient_analysis(
                evidence=evidence,
                performed=performed_pipes,
                unavailable=unavailable_pipes,
                reason="No forensic examination findings available for evaluation.",
                db=db
            )

        # If less than 40% of required examinations ran, analysis is insufficient for positive authenticity
        coverage_ratio = len(performed_pipes) / max(len(required_pipes), 1)

        # 3. Categorize findings into active vs dismissed/mitigated
        active_findings: List[ForensicFinding] = []
        dismissed_findings: List[ForensicFinding] = []
        for f in findings:
            if f.review_status == "analyst_dismissed":
                dismissed_findings.append(f)
            else:
                active_findings.append(f)

        # 4. Partition anomalies, warnings, and clean matches
        anomalies = [f for f in active_findings if f.classification == "anomaly"]
        warnings = [f for f in active_findings if f.classification in ["heuristic_warning", "investigative_lead"]]
        baselines = [f for f in active_findings if f.classification == "baseline_match"]

        # Identify AI-generation vs post-manipulation findings
        ai_findings = [f for f in anomalies + warnings if f.finding_type in AI_SYNTHETIC_FINDING_TYPES or "synthetic" in f.finding_type or "diffusion" in f.explanation.lower()]
        manip_findings = [f for f in anomalies + warnings if f.finding_type in MANIPULATION_FINDING_TYPES or "tamper" in f.explanation.lower() or "discontinuity" in f.finding_type]

        # 5. Evaluate Method Reliability & Contradictions
        supporting_findings_data = []
        conflicting_findings_data = []
        model_methods_used = []

        for f in findings:
            ref_entry = {
                "finding_id": f.finding_id,
                "finding_type": f.finding_type,
                "method_id": f.method_id,
                "model": f.model_id or "N/A",
                "classification": f.classification,
                "score": f.score,
                "score_semantics": f.score_semantics,
                "review_status": f.review_status
            }
            if f.method_id and f.method_id not in model_methods_used:
                model_methods_used.append(f.method_id)

            if f in anomalies or f in warnings:
                supporting_findings_data.append(ref_entry)
            elif f in dismissed_findings or f in baselines:
                conflicting_findings_data.append(ref_entry)

        # Contradiction Detection: Strong anomaly vs dismissed or strong baseline match in same domain
        has_direct_contradiction = False
        if len(dismissed_findings) > 0 and len(anomalies) > 0:
            has_direct_contradiction = True

        # 6. Apply Modality-Specific Fusion Policy & Determine Verdict
        verdict: str
        ai_dim: str
        manip_dim: str
        auth_dim: str
        explanation_lines: List[str] = []
        limitations: List[str] = [
            "Algorithmic detector scores represent statistical likelihood benchmarks and do not constitute self-authenticating courtroom facts.",
            "Absence of detected anomalies does not certify genuine real-world provenance.",
            f"Bitstream SHA-256 match ({evidence.sha256_digest[:16]}...) certifies custody integrity only."
        ]

        # Dimension A: AI Generation
        ai_anomalies = [f for f in ai_findings if f.classification == "anomaly"]
        if len(ai_anomalies) >= 1:
            ai_dim = "SYNTHETIC_SUPPORTED"
            explanation_lines.append(
                f"Synthetic origin supported: {len(ai_anomalies)} anomaly detector(s) identified generative model artifacts "
                f"({', '.join([f.finding_type for f in ai_anomalies])})."
            )
        elif len(ai_findings) > 0:
            ai_dim = "SUSPICIOUS_SYNTHETIC"
            explanation_lines.append("Heuristic indicators of synthetic origin were detected but did not reach conclusive anomaly threshold.")
        elif any(pipe in performed_pipes for pipe in ["fft_frequency", "audio_synthetic_voice"]):
            ai_dim = "SYNTHETIC_NOT_DETECTED"
            explanation_lines.append("No periodic upsampling lattices, neural vocoder phase artifacts, or synthetic generative signatures detected.")
        else:
            ai_dim = "UNEXAMINED"
            explanation_lines.append("AI generation detection pipelines were not executed for this evidence asset.")

        # Dimension B: Manipulation
        manip_anomalies = [f for f in manip_findings if f.classification == "anomaly"]
        if len(manip_anomalies) >= 2 or (len(manip_anomalies) == 1 and len(warnings) >= 1):
            manip_dim = "MANIPULATION_DETECTED"
            explanation_lines.append(
                f"Localized manipulation detected: Corroborated anomalies identified across {len(manip_anomalies)} independent physical dimensions "
                f"({', '.join([f.finding_type for f in manip_anomalies])})."
            )
        elif len(manip_anomalies) == 1:
            manip_dim = "SUSPICIOUS_MANIPULATION"
            explanation_lines.append(f"Single uncorroborated anomaly detected in {manip_anomalies[0].finding_type}; requires corroborating cross-examination.")
        elif len(manip_findings) > 0:
            manip_dim = "SUSPICIOUS_MANIPULATION"
            explanation_lines.append("Heuristic warnings observed without full anomaly corroboration.")
        elif len(performed_pipes) > 0:
            manip_dim = "MANIPULATION_NOT_DETECTED"
            explanation_lines.append("No localized compression disparities, PRNU noise voids, or splice boundaries detected by executed pipelines.")
        else:
            manip_dim = "UNEXAMINED"

        # Dimension C: Final Consolidated Verdict & Authenticity
        if coverage_ratio < 0.4 and len(anomalies) == 0:
            verdict = "INSUFFICIENT_ANALYSIS"
            auth_dim = "UNVERIFIABLE"
            explanation_lines.insert(0, f"Insufficient examination coverage ({len(performed_pipes)}/{len(required_pipes)} pipelines completed). Cannot establish reliable verdict.")
        elif has_direct_contradiction and len(anomalies) <= 1:
            verdict = "SUSPICIOUS_INCONCLUSIVE"
            auth_dim = "INCONCLUSIVE"
            explanation_lines.insert(0, "Contradictory findings or analyst dismissals prevent a definitive forensic conclusion. Further manual verification required.")
        elif ai_dim == "SYNTHETIC_SUPPORTED" and manip_dim == "MANIPULATION_DETECTED":
            verdict = "LIKELY_AI_GENERATED"
            auth_dim = "AUTHENTICITY_UNDERMINED"
            explanation_lines.insert(0, "Co-occurring AI synthesis and localized manipulation: Asset exhibits both generative upsampling signatures and secondary editing/splicing.")
        elif ai_dim == "SYNTHETIC_SUPPORTED":
            verdict = "LIKELY_AI_GENERATED"
            auth_dim = "AUTHENTICITY_UNDERMINED"
            explanation_lines.insert(0, "Substantial empirical evidence of generative AI synthesis detected across frequency and harmonic domain analysis.")
        elif manip_dim == "MANIPULATION_DETECTED":
            verdict = "LIKELY_MANIPULATED"
            auth_dim = "AUTHENTICITY_UNDERMINED"
            explanation_lines.insert(0, "Multiple corroborating indicators confirm localized tampering, splicing, or structural media alteration.")
        elif len(anomalies) == 1 or (len(warnings) >= 2 and len(baselines) > 0):
            verdict = "SUSPICIOUS_INCONCLUSIVE"
            auth_dim = "INCONCLUSIVE"
            explanation_lines.insert(0, "Suspicious anomalies observed, but available evidence cannot establish a defensible single conclusion without further corroboration.")
        elif len(anomalies) == 0 and len(performed_pipes) >= max(len(required_pipes) - 1, 1):
            verdict = "AUTHENTICITY_SUPPORTED"
            auth_dim = "AUTHENTICITY_SUPPORTED_WITH_LIMITATIONS"
            explanation_lines.insert(0, "Authenticity supported within stated analytical scope: All executed physical and metadata examinations completed without significant anomalies.")
        else:
            verdict = "INSUFFICIENT_ANALYSIS"
            auth_dim = "UNVERIFIABLE"
            explanation_lines.insert(0, "Available examinations produced insufficient usable indicators to reach a definitive verdict.")

        # Modality-specific caveats
        if modality == "image":
            limitations.append("High JPEG compression (Q < 65) can degrade PRNU sensor correlation and obscure fine ELA differentials.")
        elif modality == "video":
            limitations.append("Variable frame rate (VFR) containers and aggressive H.264 motion estimation can induce false-positive temporal jitter.")
        elif modality == "audio":
            limitations.append("Lossy AAC/MP3 transcoding can mask subtle phase vocoder striations.")

        if unavailable_pipes:
            limitations.append(f"Unexamined modalities/pipelines: {', '.join(unavailable_pipes)}.")

        # 7. Supersede any existing active assessment
        existing_active = db.query(EvidenceAssessment).filter(
            EvidenceAssessment.evidence_id == evidence.evidence_id,
            EvidenceAssessment.status == "active"
        ).first()

        next_version = 1
        if existing_active:
            existing_active.status = "superseded"
            next_version = existing_active.assessment_version + 1
            db.commit()

        # 8. Commit New Assessment Record
        assessment = EvidenceAssessment(
            assessment_id=f"ASM-{uuid.uuid4().hex[:8].upper()}",
            case_id=evidence.case_id,
            evidence_id=evidence.evidence_id,
            assessment_version=next_version,
            verdict=verdict,
            ai_generation_assessment=ai_dim,
            manipulation_assessment=manip_dim,
            authenticity_assessment=auth_dim,
            supporting_findings=supporting_findings_data,
            conflicting_findings=conflicting_findings_data,
            examinations_performed=performed_pipes,
            unavailable_or_failed_examinations=unavailable_pipes,
            explanation="\n\n".join(explanation_lines),
            limitations=limitations,
            fusion_policy_id=cls.POLICY_ID,
            fusion_policy_version=cls.POLICY_VERSION,
            model_method_references=model_methods_used,
            status="active",
            generated_at=datetime.utcnow()
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment

    @classmethod
    def _resolve_examinations(
        cls,
        jobs: List[AnalysisJob],
        findings: List[ForensicFinding],
        required_pipes: List[str]
    ) -> Tuple[List[str], List[str]]:
        """Identify which pipelines completed vs which failed or were not run."""
        completed_pipelines = set()
        for j in jobs:
            if j.status == "completed" and j.pipelines:
                completed_pipelines.update(j.pipelines)

        # Also identify pipelines from findings directly
        for f in findings:
            m_id = (f.method_id or "").lower()
            f_type = (f.finding_type or "").lower()
            for pipe in required_pipes:
                keywords = PIPELINE_KEYWORDS.get(pipe, [pipe])
                if any(kw in m_id or kw in f_type for kw in keywords):
                    completed_pipelines.add(pipe)

        performed = [p for p in required_pipes if p in completed_pipelines]
        unavailable = [p for p in required_pipes if p not in completed_pipelines]
        return performed, unavailable

    @classmethod
    def _build_insufficient_analysis(
        cls,
        evidence: EvidenceAsset,
        performed: List[str],
        unavailable: List[str],
        reason: str,
        db: Session
    ) -> EvidenceAssessment:
        existing_active = db.query(EvidenceAssessment).filter(
            EvidenceAssessment.evidence_id == evidence.evidence_id,
            EvidenceAssessment.status == "active"
        ).first()

        next_version = 1
        if existing_active:
            existing_active.status = "superseded"
            next_version = existing_active.assessment_version + 1
            db.commit()

        assessment = EvidenceAssessment(
            assessment_id=f"ASM-{uuid.uuid4().hex[:8].upper()}",
            case_id=evidence.case_id,
            evidence_id=evidence.evidence_id,
            assessment_version=next_version,
            verdict="INSUFFICIENT_ANALYSIS",
            ai_generation_assessment="UNEXAMINED",
            manipulation_assessment="UNEXAMINED",
            authenticity_assessment="UNVERIFIABLE",
            supporting_findings=[],
            conflicting_findings=[],
            examinations_performed=performed,
            unavailable_or_failed_examinations=unavailable,
            explanation=f"Insufficient analysis: {reason} Required forensic examinations have not been executed or yielded no usable results.",
            limitations=[
                "No definitive forensic conclusions can be drawn without completed examination pipelines.",
                "Execute the full forensic analysis suite to populate empirical evidence findings."
            ],
            fusion_policy_id=cls.POLICY_ID,
            fusion_policy_version=cls.POLICY_VERSION,
            model_method_references=[],
            status="active",
            generated_at=datetime.utcnow()
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)
        return assessment

    @classmethod
    def evaluate_case(cls, case_id: str, db: Session) -> Dict[str, Any]:
        """
        Consolidated Case-Level Assessment.
        Summarizes evidence assessments across all assets without making speculative
        guilt, attribution, or identity claims.
        """
        case = db.query(Case).filter((Case.case_id == case_id) | (Case.case_number == case_id)).first()
        if not case:
            raise ValueError(f"Case {case_id} not found")

        evidence_items = db.query(EvidenceAsset).filter(EvidenceAsset.case_id == case.case_id).all()
        assessments: List[EvidenceAssessment] = []

        for e in evidence_items:
            # Fetch active assessment for each asset, or compute if not present
            active_asm = db.query(EvidenceAssessment).filter(
                EvidenceAssessment.evidence_id == e.evidence_id,
                EvidenceAssessment.status == "active"
            ).first()

            if not active_asm:
                findings = db.query(ForensicFinding).filter(ForensicFinding.evidence_id == e.evidence_id).all()
                jobs = db.query(AnalysisJob).filter(AnalysisJob.evidence_id == e.evidence_id).all()
                active_asm = cls.evaluate_evidence(e, findings, jobs, db)

            assessments.append(active_asm)

        total_assets = len(evidence_items)
        assessed_count = len(assessments)

        verdict_counts = {
            "AUTHENTICITY_SUPPORTED": 0,
            "LIKELY_MANIPULATED": 0,
            "LIKELY_AI_GENERATED": 0,
            "SUSPICIOUS_INCONCLUSIVE": 0,
            "INSUFFICIENT_ANALYSIS": 0,
        }
        for a in assessments:
            verdict_counts[a.verdict] = verdict_counts.get(a.verdict, 0) + 1

        # Corroborating and Conflicting Evidence identification across modalities
        corroborating_evidence = []
        conflicting_evidence = []

        manipulated_assets = [a for a in assessments if a.verdict in ["LIKELY_MANIPULATED", "LIKELY_AI_GENERATED"]]
        authentic_assets = [a for a in assessments if a.verdict == "AUTHENTICITY_SUPPORTED"]

        if len(manipulated_assets) > 1:
            corroborating_evidence.append({
                "type": "cross_modal_synthetic_corroboration",
                "evidence_ids": [a.evidence_id for a in manipulated_assets],
                "description": f"Multiple evidence assets ({', '.join([a.evidence_id for a in manipulated_assets])}) independently corroborate synthetic or manipulative tampering."
            })

        if len(manipulated_assets) > 0 and len(authentic_assets) > 0:
            conflicting_evidence.append({
                "type": "heterogeneous_case_evidence",
                "manipulated_ids": [a.evidence_id for a in manipulated_assets],
                "authentic_ids": [a.evidence_id for a in authentic_assets],
                "description": "Case exhibits mixed evidence: certain assets indicate tampering while others support authenticity. An entire case cannot be declared manipulated based on a single asset."
            })

        # Overall Case Assessment Synthesis
        if total_assets == 0:
            overall_verdict = "CASE_INSUFFICIENT_EVIDENCE"
            summary_statement = "No evidence assets are registered under this case dossier."
        elif verdict_counts["LIKELY_AI_GENERATED"] > 0 and verdict_counts["LIKELY_MANIPULATED"] > 0:
            overall_verdict = "MULTI_MODAL_TAMPERING_DETECTED"
            summary_statement = "Case dossier contains corroborated findings of both AI synthesis and secondary media manipulation across separate evidence assets."
        elif verdict_counts["LIKELY_AI_GENERATED"] > 0:
            overall_verdict = "SYNTHETIC_CONTENT_DETECTED"
            summary_statement = f"{verdict_counts['LIKELY_AI_GENERATED']} asset(s) exhibit validated indicators of generative AI synthesis."
        elif verdict_counts["LIKELY_MANIPULATED"] > 0:
            overall_verdict = "MANIPULATION_DETECTED_IN_CASE"
            summary_statement = f"{verdict_counts['LIKELY_MANIPULATED']} asset(s) show localized tampering or splicing."
        elif verdict_counts["AUTHENTICITY_SUPPORTED"] == total_assets:
            overall_verdict = "ALL_EXAMINED_ASSETS_AUTHENTICITY_SUPPORTED"
            summary_statement = "All evidence assets examined to date support authenticity within the physical limitations of the executed examinations."
        else:
            overall_verdict = "CASE_ASSESSMENT_PROVISIONAL"
            summary_statement = "Case assessment remains provisional due to incomplete analytical coverage or inconclusive evidence indicators."

        return {
            "case_id": case.case_id,
            "case_number": case.case_number,
            "title": case.title,
            "examiner_name": case.examiner_name,
            "total_evidence_assets": total_assets,
            "assessed_assets_count": assessed_count,
            "verdict_summary": verdict_counts,
            "overall_case_conclusion": overall_verdict,
            "summary_statement": summary_statement,
            "corroborating_evidence": corroborating_evidence,
            "conflicting_evidence": conflicting_evidence,
            "individual_assessments": [
                {
                    "assessment_id": a.assessment_id,
                    "evidence_id": a.evidence_id,
                    "version": a.assessment_version,
                    "verdict": a.verdict,
                    "ai_generation": a.ai_generation_assessment,
                    "manipulation": a.manipulation_assessment,
                    "authenticity": a.authenticity_assessment,
                    "generated_at": a.generated_at.isoformat() if a.generated_at else None
                }
                for a in assessments
            ],
            "provisional_disclaimer": "Case-level assessments aggregate technical evidence telemetry only. No judicial conclusions regarding motive, authorship, attribution, or legal identity are established."
        }
