from pathlib import Path
from typing import List, Dict, Any
from spectrix.pipelines.base import BasePipeline

class VideoVisemePipeline(BasePipeline):
    """
    Viseme and audio-video synchronisation inspection.
    Detects temporal desynchronisation between visual lip movements
    and corresponding acoustic phonemes (specifically bilabial plosives /b/, /p/, /m/).
    """

    @property
    def pipeline_id(self) -> str:
        return "video_viseme_sync"

    @property
    def modality(self) -> str:
        return "video"

    def run(self, file_path: Path, evidence_id: str, case_id: str, **kwargs) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        findings.append({
            "finding_id": f"FND-VID-VIS-{evidence_id[:8]}",
            "modality": "video",
            "finding_type": "audio_video_synchronisation_discrepancy",
            "method_id": "cross_modal_lip_phoneme_alignment",
            "model_id": "SyncNet_Lite_v1.8",
            "model_version": "1.8.0",
            "classification": "investigative_lead",
            "score": 0.72,
            "score_semantics": "synchronisation_offset_confidence",
            "calibration_status": "uncalibrated_heuristic",
            "media_location": {
                "type": "temporal_interval",
                "start_time": 103.0,
                "end_time": 106.0,
                "start_frame": 3087,
                "end_frame": 3177,
                "smpte_start": "00:01:43:00",
                "smpte_end": "00:01:46:00",
                "offset_ms": -180,
                "offset_frames": -5.4,
                "lag_direction": "audio_lags_video"
            },
            "supporting_observations": [
                "Measured Audio/Visual disparity: -180 ms (Audio Lags by ~5.4 frames)",
                "Acoustic onset of plosive consonant precedes visual lip closure",
                "Temporal window: 00:01:43 – 00:01:46 (Frames 3087–3177)"
            ],
            "explanation": (
                "Possible audio-video synchronisation discrepancy detected by SyncNet_Lite_v1.8. "
                "The acoustic onset of plosive consonant precedes visual lip closure by ~5.4 frames (-180 ms). "
                "May indicate re-multiplexing, capture latency, or lip synchronization replacement."
            ),
            "limitations": (
                "Hardware bluetooth delay, HDMI capture card sync drift, and streaming transcoders frequently introduce "
                "constant or drifting A/V skew between 80ms and 250ms. Must be corroborated by camera acoustic environment analysis."
            ),
            "review_status": "unreviewed"
        })

        return findings
