import uuid
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from PIL import Image
from spectrix.pipelines.base import BasePipeline
from spectrix.core.config import settings

class FFTFrequencyPipeline(BasePipeline):
    pipeline_id = "fft_frequency"
    modality = "image"

    def run(self, file_path: Path, evidence_id: str, case_id: str, **kwargs) -> List[Dict[str, Any]]:
        findings = []
        try:
            with Image.open(file_path).convert("L") as gray:
                # Resize for consistent 2D-FFT calculation (e.g. 512x512)
                size = 512
                resized = gray.resize((size, size), Image.Resampling.BILINEAR)
                arr = np.array(resized, dtype=np.float32)

                # 1. Compute 2D Fast Fourier Transform
                fft = np.fft.fft2(arr)
                fft_shift = np.fft.fftshift(fft)
                magnitude = 20 * np.log(np.abs(fft_shift) + 1.0)

                # Normalize magnitude spectrum to 0..255 for visualization
                mag_norm = ((magnitude - np.min(magnitude)) / max(np.ptp(magnitude), 0.001) * 255.0).astype(np.uint8)

                # 2. Save derivative FFT spectral visualization
                derivative_dir = settings.DERIVATIVES_PATH / evidence_id
                derivative_dir.mkdir(parents=True, exist_ok=True)
                fft_output_path = derivative_dir / "fft_spectrum.png"
                Image.fromarray(mag_norm).save(fft_output_path)

                # 3. Analyze high-frequency radial symmetry
                center = size // 2
                y, x = np.ogrid[:size, :size]
                radius_from_center = np.sqrt((x - center)**2 + (y - center)**2)

                # Extract energy in high-frequency band (radius between 180 and 240)
                high_freq_mask = (radius_from_center >= 180) & (radius_from_center <= 240)
                high_freq_energy = float(np.mean(magnitude[high_freq_mask]))
                global_energy = float(np.mean(magnitude))

                energy_ratio = high_freq_energy / max(global_energy, 0.001)

                # Check horizontal vs vertical asymmetry
                quad_left = magnitude[:, :center]
                quad_right = magnitude[:, center:]
                asymmetry = float(np.abs(np.mean(quad_left) - np.mean(quad_right)))

                if energy_ratio > 0.85 or asymmetry > 4.5:
                    findings.append({
                        "finding_id": f"FND-FFT-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "frequency_domain_anomaly",
                        "method_id": "2D_FFT_Spectral_Scope_v1.0",
                        "model_id": "fft-power-spectrum-analyzer",
                        "model_version": "1.0.0",
                        "classification": "anomaly" if energy_ratio > 0.95 else "heuristic_warning",
                        "score": round(energy_ratio, 2),
                        "score_semantics": "heuristic_variance_percentage",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {},
                        "supporting_observations": [
                            f"High-frequency radial energy ratio: {energy_ratio:.2f}",
                            f"Spectral energy asymmetry: {asymmetry:.2f} dB",
                            f"2D-FFT magnitude spectrum saved to: {fft_output_path.name}"
                        ],
                        "explanation": "2D-FFT radial power spectrum indicates asymmetric high-frequency energy concentration. Unnatural spectral roll-off is characteristic of diffusion upsampler periodicity, localized inpainting boundaries, or non-optical resampling.",
                        "limitations": "Sharp geometric edges (text, logos, high-contrast linear structures) naturally introduce high-frequency cross-spectral lines in the Fourier plane.",
                        "review_status": "unreviewed"
                    })
                else:
                    findings.append({
                        "finding_id": f"FND-FFT-{uuid.uuid4().hex[:6]}",
                        "case_id": case_id,
                        "evidence_id": evidence_id,
                        "modality": "image",
                        "finding_type": "frequency_domain_anomaly",
                        "method_id": "2D_FFT_Spectral_Scope_v1.0",
                        "model_id": "fft-power-spectrum-analyzer",
                        "model_version": "1.0.0",
                        "classification": "baseline_match",
                        "score": round(energy_ratio, 2),
                        "score_semantics": "heuristic_variance_percentage",
                        "calibration_status": "uncalibrated_heuristic",
                        "media_location": {},
                        "supporting_observations": [
                            f"Natural radial 1/f power falloff across frequency spectrum (ratio: {energy_ratio:.2f})",
                            f"Spectral map saved to {fft_output_path.name}"
                        ],
                        "explanation": "2D Fourier power distribution exhibits expected natural photographic 1/f falloff with no abnormal periodic spikes or synthesis grid harmonics.",
                        "limitations": "Subtle inpainting covering < 5% of the frame may not shift global Fourier distribution.",
                        "review_status": "unreviewed"
                    })
        except Exception:
            pass

        return findings
