import tempfile
from pathlib import Path
from PIL import Image

from spectrix.core.storage import vault
from spectrix.models.case import Case
from spectrix.models.evidence import EvidenceAsset
from spectrix.routers.annotations import create_annotation, list_annotations, delete_annotation
from spectrix.schemas.annotation import AnnotationCreate

def create_sample_img() -> Path:
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    tmp_path = Path(tmp.name)
    img = Image.new("RGB", (100, 100), color=(150, 100, 50))
    img.save(tmp_path, "JPEG")
    return tmp_path

def test_annotation_lifecycle(db_session):
    # 1. Create case & evidence
    test_case = Case(case_id="CASE-ANN-01", case_number="SPX-2026-ANN", title="Annotation Test")
    db_session.add(test_case)
    db_session.commit()

    sample_path = create_sample_img()
    try:
        sha256 = vault.calculate_sha256(sample_path)
        asset = EvidenceAsset(
            evidence_id="SPX-EV-ANN01",
            case_id="CASE-ANN-01",
            filename="sample.jpg",
            filesize_bytes=sample_path.stat().st_size,
            mime_type="image/jpeg",
            modality="image",
            sha256_digest=sha256,
            storage_path=str(sample_path),
            is_original=True
        )
        db_session.add(asset)
        db_session.commit()

        # 2. Add an annotation pin
        payload = AnnotationCreate(
            x=280,
            y=340,
            width=50,
            height=40,
            label="Inpaint boundary discontinuity",
            notes="Mandibular contour divergence observed at 200% zoom.",
            created_by="Dr. Vance"
        )
        created = create_annotation(evidence_id="SPX-EV-ANN01", payload=payload, db=db_session)
        assert created.x == 280
        assert created.y == 340
        assert created.label == "Inpaint boundary discontinuity"
        assert created.annotation_id.startswith("ANN-")

        # 3. List annotations
        items = list_annotations(evidence_id="SPX-EV-ANN01", db=db_session)
        assert len(items) == 1
        assert items[0].annotation_id == created.annotation_id

        # 4. Delete annotation
        delete_annotation(evidence_id="SPX-EV-ANN01", annotation_id=created.annotation_id, db=db_session)
        items_after = list_annotations(evidence_id="SPX-EV-ANN01", db=db_session)
        assert len(items_after) == 0
    finally:
        sample_path.unlink(missing_ok=True)
