import io
import tempfile
from pathlib import Path
from PIL import Image
from spectrix.pipelines.ela import ELAPipeline
from spectrix.pipelines.metadata_exif import MetadataInspectionPipeline
from spectrix.pipelines.noise_prnu import NoisePRNUPipeline

def test_ela_pipeline():
    # Create temporary image
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = Path(tmp.name)
        img = Image.new("RGB", (200, 200), color=(120, 150, 180))
        img.save(tmp_path, "JPEG", quality=90)

    try:
        pipeline = ELAPipeline()
        findings = pipeline.run(file_path=tmp_path, evidence_id="TEST-EV-01", case_id="CASE-01")
        assert len(findings) >= 1
        finding = findings[0]
        assert finding["modality"] == "image"
        assert finding["finding_type"] == "ela_compression_anomaly"
        assert "score" in finding
    finally:
        tmp_path.unlink(missing_ok=True)

def test_noise_pipeline():
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = Path(tmp.name)
        img = Image.new("RGB", (100, 100), color=(50, 50, 50))
        img.save(tmp_path, "JPEG")

    try:
        pipeline = NoisePRNUPipeline()
        findings = pipeline.run(file_path=tmp_path, evidence_id="TEST-EV-02", case_id="CASE-02")
        assert len(findings) >= 1
        assert findings[0]["finding_type"] == "prnu_sensor_mismatch"
    finally:
        tmp_path.unlink(missing_ok=True)

def test_metadata_pipeline():
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = Path(tmp.name)
        img = Image.new("RGB", (100, 100), color=(200, 200, 200))
        img.save(tmp_path, "JPEG")

    try:
        pipeline = MetadataInspectionPipeline()
        findings = pipeline.run(file_path=tmp_path, evidence_id="TEST-EV-03", case_id="CASE-03")
        assert len(findings) >= 1
        assert findings[0]["finding_type"] == "metadata_tampering"
    finally:
        tmp_path.unlink(missing_ok=True)

