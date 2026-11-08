import uuid
from pathlib import Path
from typing import List, Dict, Any
from PIL import Image, ExifTags
from spectrix.pipelines.base import BasePipeline

class MetadataInspectionPipeline(BasePipeline):
    pipeline_id = "metadata_inspection"
    modality = "image"

    def run(self, file_path: Path, evidence_id: str, case_id: str, **kwargs) -> List[Dict[str, Any]]:
        findings = []
        try:
            with Image.open(file_path) as img:
                info = {
                    "format": img.format,
                    "mode": img.mode,
                    "width": img.width,
                    "height": img.height,
                }
                
                exif_data = {}
                raw_exif = img.getexif()
                if raw_exif:
                    for tag_id, value in raw_exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        # Keep serializable values
                        if isinstance(value, (str, int, float)):
                            exif_data[tag_name] = value

                # Check for software manipulation signatures or stripped metadata
                software = exif_data.get("Software") or exif_data.get("ProcessingSoftware")
                has_gps = any("GPS" in k for k in exif_data.keys())

                observations = []
                if software:
                    observations.append(f"Header indicates encoding software: {software}")
                if not has_gps:
                    observations.append("Geographic location (GPS) tags stripped or absent")
                if not exif_data:
                    observations.append("EXIF metadata completely absent or purged")

                if software and any(app in str(software).lower() for app in ["photoshop", "gimp", "lavf", "ffmpeg", "canva"]):
                    findings.append({
                        "finding_id": f"FND-META-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "metadata_tampering",
                        "method_id": "Exif_Container_Parser_v1.0",
                        "model_id": "exif-header-parser",
                        "model_version": "1.0.0",
                        "classification": "heuristic_warning",
                        "score": 0.85,
                        "score_semantics": "heuristic_variance_percentage",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {},
                        "supporting_observations": observations,
                        "explanation": f"Image header indicates post-capture editing/re-encoding via '{software}'. Original camera capture tags are inconsistent with pristine sensor dumps.",
                        "limitations": "Metadata can be legitimately rewritten by standard export tools or stripped for privacy by messaging applications.",
                        "review_status": "unreviewed"
                    })
                elif not exif_data:
                    findings.append({
                        "finding_id": f"FND-META-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "metadata_tampering",
                        "method_id": "Exif_Container_Parser_v1.0",
                        "classification": "investigative_lead",
                        "score": 0.40,
                        "score_semantics": "heuristic_variance_percentage",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {},
                        "supporting_observations": ["EXIF header table completely stripped"],
                        "explanation": "No EXIF camera metadata present in file header. Consistent with web dissemination or deliberate metadata removal.",
                        "limitations": "Many social media platforms strip metadata upon upload; does not prove active falsification.",
                        "review_status": "unreviewed"
                    })
        except Exception as e:
            pass

        return findings

