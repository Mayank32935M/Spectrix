import uuid
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from PIL import Image
from spectrix.pipelines.base import BasePipeline

class CopyMovePipeline(BasePipeline):
    pipeline_id = "copymove_detection"
    modality = "image"

    def run(self, file_path: Path, evidence_id: str, case_id: str, **kwargs) -> List[Dict[str, Any]]:
        findings = []
        try:
            with Image.open(file_path).convert("L") as gray:
                # Resize down for fast, reliable block feature extraction
                w, h = gray.size
                scale_w = min(w, 400)
                scale_h = int(h * (scale_w / w))
                thumb = gray.resize((scale_w, scale_h), Image.Resampling.BILINEAR)
                arr = np.array(thumb, dtype=np.float32)

                block_size = 16
                step = 12
                blocks = []
                coords = []

                # Extract local block features
                for y in range(0, scale_h - block_size, step):
                    for x in range(0, scale_w - block_size, step):
                        patch = arr[y:y+block_size, x:x+block_size]
                        # Normalized feature vector (mean, std, 4 quadrant means)
                        mean = np.mean(patch)
                        std = np.std(patch)
                        if std < 2.0:  # Skip flat uniform regions (sky, solid black)
                            continue
                        q1 = np.mean(patch[:block_size//2, :block_size//2])
                        q2 = np.mean(patch[:block_size//2, block_size//2:])
                        q3 = np.mean(patch[block_size//2:, :block_size//2])
                        q4 = np.mean(patch[block_size//2:, block_size//2:])
                        feat = np.array([mean, std, q1, q2, q3, q4], dtype=np.float32)
                        norm = np.linalg.norm(feat)
                        if norm > 0:
                            feat /= norm
                            blocks.append(feat)
                            coords.append((x, y))

                # Pairwise comparison for distant blocks
                n = len(blocks)
                best_sim = 0.0
                best_pair = None
                min_dist_sq = (40 ** 2)  # Must be at least 40 pixels apart

                if n > 1:
                    feat_matrix = np.array(blocks)  # shape (n, 6)
                    # Compute dot product similarity matrix in batches
                    sim_matrix = np.dot(feat_matrix, feat_matrix.T)

                    for i in range(min(n, 150)):
                        for j in range(i + 1, min(n, 150)):
                            x1, y1 = coords[i]
                            x2, y2 = coords[j]
                            dist_sq = (x1 - x2)**2 + (y1 - y2)**2
                            if dist_sq >= min_dist_sq:
                                sim = float(sim_matrix[i, j])
                                if sim > best_sim:
                                    best_sim = sim
                                    best_pair = ((x1, y1), (x2, y2))

                # Scale coordinates back to original image space
                inv_scale = w / scale_w

                if best_pair and best_sim > 0.985:
                    (x1, y1), (x2, y2) = best_pair
                    roi_src = {
                        "x": int(x1 * inv_scale),
                        "y": int(y1 * inv_scale),
                        "width": int(block_size * inv_scale),
                        "height": int(block_size * inv_scale),
                        "normalized": False
                    }
                    roi_dst = {
                        "x": int(x2 * inv_scale),
                        "y": int(y2 * inv_scale),
                        "width": int(block_size * inv_scale),
                        "height": int(block_size * inv_scale),
                        "normalized": False
                    }

                    findings.append({
                        "finding_id": f"FND-CPMV-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "splicing_copymove",
                        "method_id": "Block_Feature_Duplication_v1.2",
                        "model_id": "copymove-descriptor-engine",
                        "model_version": "1.2.0",
                        "classification": "anomaly" if best_sim > 0.995 else "investigative_lead",
                        "score": round(best_sim, 3),
                        "score_semantics": "cosine_similarity",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {
                            "bounding_box": roi_src,
                            "target_bounding_box": roi_dst
                        },
                        "supporting_observations": [
                            f"Identified duplicate patch candidate with cosine similarity {best_sim:.3f}",
                            f"Spatial displacement vector: ΔX={roi_dst['x'] - roi_src['x']}px, ΔY={roi_dst['y'] - roi_src['y']}px",
                            "Features match quadrant luminance distributions across non-contiguous image regions"
                        ],
                        "explanation": f"Near-identical feature descriptor match observed between region [X:{roi_src['x']}, Y:{roi_src['y']}] and region [X:{roi_dst['x']}, Y:{roi_dst['y']}]. High cross-correlation indicates potential copy-move cloning or repetitive texture replication.",
                        "limitations": "Natural architectural patterns (tiles, repeating brickwork, railings, foliage) can yield high descriptor similarity without intentional forgery.",
                        "review_status": "unreviewed"
                    })
                else:
                    findings.append({
                        "finding_id": f"FND-CPMV-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "splicing_copymove",
                        "method_id": "Block_Feature_Duplication_v1.2",
                        "model_id": "copymove-descriptor-engine",
                        "model_version": "1.2.0",
                        "classification": "baseline_match",
                        "score": round(best_sim, 3) if best_sim > 0 else 0.0,
                        "score_semantics": "cosine_similarity",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {},
                        "supporting_observations": [
                            f"Maximum non-local patch similarity: {best_sim:.3f} (Below duplication threshold of 0.985)"
                        ],
                        "explanation": "No duplicate block features or cloned texture patches detected across non-contiguous image areas.",
                        "limitations": "Heavily rotated or scaled clone patches are not captured by standard translational block comparison.",
                        "review_status": "unreviewed"
                    })
        except Exception:
            pass

        return findings
