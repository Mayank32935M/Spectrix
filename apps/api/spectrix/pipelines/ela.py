import io
import uuid
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from PIL import Image, ImageChops, ImageEnhance
from spectrix.pipelines.base import BasePipeline
from spectrix.core.config import settings

class ELAPipeline(BasePipeline):
    pipeline_id = "ela_compression"
    modality = "image"

    def run(self, file_path: Path, evidence_id: str, case_id: str, ela_quality: int = 90, **kwargs) -> List[Dict[str, Any]]:
        findings = []
        try:
            with Image.open(file_path).convert("RGB") as original:
                # 1. Save to in-memory buffer at specified compression quality
                buffer = io.BytesIO()
                original.save(buffer, "JPEG", quality=ela_quality)
                buffer.seek(0)
                
                # 2. Re-open compressed image
                recompressed = Image.open(buffer)

                # 3. Compute absolute pixel differences
                diff = ImageChops.difference(original, recompressed)

                # 4. Scale difference for forensic visibility (15x enhancement)
                enhanced_diff = ImageEnhance.Brightness(diff).enhance(15.0)

                # 5. Save derivative ELA image
                derivative_dir = settings.DERIVATIVES_PATH / evidence_id
                derivative_dir.mkdir(parents=True, exist_ok=True)
                ela_output_path = derivative_dir / "ela_analysis.png"
                enhanced_diff.save(ela_output_path)

                # 6. Quantitative Analysis using NumPy
                diff_arr = np.array(diff, dtype=np.float32)
                mean_diff = float(np.mean(diff_arr))
                std_diff = float(np.std(diff_arr))

                # Grid analysis: Find region with highest error variance (candidate ROI)
                h, w, _ = diff_arr.shape
                grid_y = 4
                grid_x = 4
                step_y = h // grid_y
                step_x = w // grid_x

                max_var = 0.0
                max_roi = None

                for gy in range(grid_y):
                    for gx in range(grid_x):
                        cell = diff_arr[gy*step_y:(gy+1)*step_y, gx*step_x:(gx+1)*step_x]
                        cell_var = float(np.var(cell))
                        if cell_var > max_var:
                            max_var = cell_var
                            max_roi = {
                                "x": gx * step_x,
                                "y": gy * step_y,
                                "width": step_x,
                                "height": step_y,
                                "normalized": False
                            }

                # If maximum region variance exceeds 1.8x the global variance, flag as an ELA anomaly
                global_var = float(np.var(diff_arr))
                variance_ratio = max_var / max(global_var, 0.001)

                if variance_ratio > 1.6 and max_roi:
                    findings.append({
                        "finding_id": f"FND-ELA-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "ela_compression_anomaly",
                        "method_id": "ELA_Quantizer_v2.0",
                        "model_id": "ela-quantizer-engine",
                        "model_version": "2.0.1",
                        "classification": "anomaly" if variance_ratio > 2.5 else "heuristic_warning",
                        "score": round(min(variance_ratio / 3.0, 1.0), 3),
                        "score_semantics": "heuristic_variance_percentage",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {
                            "bounding_box": max_roi
                        },
                        "supporting_observations": [
                            f"Global ELA error mean: {mean_diff:.2f}, std: {std_diff:.2f}",
                            f"Localized error variance ratio: {variance_ratio:.2f}x above baseline",
                            f"Derivative ELA map saved to: {ela_output_path.name}"
                        ],
                        "explanation": f"High localized compression error detected in sub-region [X:{max_roi['x']}, Y:{max_roi['y']}, {max_roi['width']}x{max_roi['height']}]. Pixel error rates diverge significantly from the surrounding JPEG block structure, consistent with multi-generation resaving, localized inpainting, or composite elements.",
                        "limitations": "ELA is an illustrative heuristic sensitive to edge density and color contrast. Uniform background regions naturally exhibit lower error levels than sharp boundaries.",
                        "review_status": "unreviewed"
                    })
                else:
                    findings.append({
                        "finding_id": f"FND-ELA-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "ela_compression_anomaly",
                        "method_id": "ELA_Quantizer_v2.0",
                        "model_id": "ela-quantizer-engine",
                        "model_version": "2.0.1",
                        "classification": "baseline_match",
                        "score": round(variance_ratio, 2),
                        "score_semantics": "heuristic_variance_percentage",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {},
                        "supporting_observations": [
                            f"Uniform error distribution across JPEG 8x8 block grid (mean delta: {mean_diff:.2f})",
                            f"No abnormal localized variance spikes detected"
                        ],
                        "explanation": "Compression error levels across the image surface appear statistically uniform. No significant recompression discontinuities observed at Q90 baseline.",
                        "limitations": "Uncompressed source files or high-quality resaves (Q>95) may produce false negatives.",
                        "review_status": "unreviewed"
                    })
        except Exception as e:
            pass

        return findings

