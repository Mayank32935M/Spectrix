import io
import hashlib
import tempfile
from pathlib import Path
from PIL import Image

from spectrix.core.storage import vault
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset, CustodyEvent
from spectrix.routers.evidence import verify_integrity, list_case_evidence, get_evidence

def create_sample_image_file() -> Path:
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp_path = Path(tmp.name)
    img = Image.new("RGB", (120, 120), color=(100, 150, 200))
    img.save(tmp_path, format="JPEG", quality=90)
    return tmp_path

def test_storage_vault_hashing_and_integrity():
    sample_path = create_sample_image_file()
    try:
        # Calculate SHA-256
        sha256 = vault.calculate_sha256(sample_path)
        assert len(sha256) == 64

        # Verify integrity matches
        assert vault.verify_integrity(sample_path, sha256) is True

        # Verify altered hash fails
        fake_sha256 = "0" * 64
        assert vault.verify_integrity(sample_path, fake_sha256) is False
    finally:
        sample_path.unlink(missing_ok=True)

def test_evidence_registration_and_integrity_audit(db_session):
    # 1. Create a test case
    test_case = Case(
        case_id="CASE-AUDIT-01",
        case_number="SPX-2026-AUDIT",
        title="Audit Test Case",
        examiner_name="Dr. Vance"
    )
    db_session.add(test_case)
    db_session.commit()

    sample_path = create_sample_image_file()
    try:
        sha256 = vault.calculate_sha256(sample_path)

        # 2. Register evidence asset
        asset = EvidenceAsset(
            evidence_id="SPX-EV-TEST01",
            case_id="CASE-AUDIT-01",
            filename="capture.jpg",
            filesize_bytes=sample_path.stat().st_size,
            mime_type="image/jpeg",
            modality="image",
            sha256_digest=sha256,
            storage_path=str(sample_path),
            is_original=True,
            metadata_json={"width": 120, "height": 120}
        )
        db_session.add(asset)
        db_session.commit()

        # 3. Test list_case_evidence
        items = list_case_evidence(case_id="CASE-AUDIT-01", db=db_session)
        assert len(items) == 1
        assert items[0].evidence_id == "SPX-EV-TEST01"
        assert items[0].sha256_digest == sha256

        # 4. Test verify_integrity endpoint
        res = verify_integrity(evidence_id="SPX-EV-TEST01", db=db_session)
        assert res.integrity_status == "MATCH"
        assert res.registered_sha256 == sha256
        assert res.current_sha256 == sha256
        assert "File integrity only" in res.notice

        # 5. Verify CustodyEvent was logged in DB
        events = db_session.query(CustodyEvent).filter(CustodyEvent.evidence_id == "SPX-EV-TEST01").all()
        assert len(events) >= 1
        assert events[0].event_type == "verified"
    finally:
        sample_path.unlink(missing_ok=True)
