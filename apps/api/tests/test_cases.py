from spectrix.routers.cases import create_case, list_cases, get_case
from spectrix.schemas.case import CaseCreate

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
