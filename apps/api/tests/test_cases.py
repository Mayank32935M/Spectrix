import pytest
from fastapi import HTTPException
from spectrix.routers.cases import create_case, list_cases, get_case, update_case
from spectrix.schemas.case import CaseCreate, CaseUpdate
from spectrix.models.evidence import EvidenceAsset
from spectrix.routers.evidence import list_case_evidence

def test_create_and_list_case(db_session):
    payload = CaseCreate(
        case_number="SPX-2026-TEST",
        title="Synthetic Media Forensic Inquiry",
        description="Cross-modal verification",
        examiner_name="Dr. E. Vance"
    )
    created = create_case(payload=payload, db=db_session)
    assert created.case_number == "SPX-2026-TEST"
    assert created.title == "Synthetic Media Forensic Inquiry"
    assert created.examiner_name == "Dr. E. Vance"

    # List cases
    cases = list_cases(db=db_session)
    assert len(cases) == 1
    assert cases[0].case_number == "SPX-2026-TEST"

    # Get single case
    fetched = get_case(case_id=created.case_id, db=db_session)
    assert fetched.case_id == created.case_id

def test_update_case_examiner_and_details(db_session):
    payload = CaseCreate(
        case_number="SPX-2026-EXAMINER-TEST",
        title="Original Case Title",
        examiner_name="Initial Examiner"
    )
    created = create_case(payload=payload, db=db_session)

    # Update examiner name and title
    update_payload = CaseUpdate(
        examiner_name="Agent Sarah Connor",
        title="Updated Case Title"
    )
    updated = update_case(case_id=created.case_id, payload=update_payload, db=db_session)
    assert updated.examiner_name == "Agent Sarah Connor"
    assert updated.title == "Updated Case Title"

    # Verify invalid whitespace-only examiner name raises 400
    with pytest.raises(HTTPException) as excinfo:
        update_case(case_id=created.case_id, payload=CaseUpdate(examiner_name="   "), db=db_session)
    assert excinfo.value.status_code == 400
    assert "whitespace" in excinfo.value.detail.lower()

def test_case_evidence_isolation(db_session):
    case_a = create_case(payload=CaseCreate(case_number="CASE-A", title="Case A", examiner_name="Analyst A"), db=db_session)
    case_b = create_case(payload=CaseCreate(case_number="CASE-B", title="Case B", examiner_name="Analyst B"), db=db_session)

    # Attach evidence only to Case A
    ev_a = EvidenceAsset(
        evidence_id="EV-A-01",
        case_id=case_a.case_id,
        filename="sample_a.png",
        filesize_bytes=1024,
        mime_type="image/png",
        modality="image",
        sha256_digest="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        storage_path="/tmp/sample_a.png",
        is_original=True
    )
    db_session.add(ev_a)
    db_session.commit()

    # Query evidence for Case A and Case B
    ev_list_a = list_case_evidence(case_id=case_a.case_id, db=db_session)
    ev_list_b = list_case_evidence(case_id=case_b.case_id, db=db_session)

    assert len(ev_list_a) == 1
    assert ev_list_a[0].evidence_id == "EV-A-01"
    assert len(ev_list_b) == 0  # Strict isolation: Case B must not see Case A's evidence

