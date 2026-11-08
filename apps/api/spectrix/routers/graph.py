from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from spectrix.core.database import get_db
from spectrix.models.case import Case

router = APIRouter(tags=["Graph"])

@router.get("/cases/{case_id}/graph")
def get_evidence_graph(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter((Case.case_id == case_id) | (Case.case_number == case_id)).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    nodes = []
    edges = []

    # 1. Root Case Node
    nodes.append({
        "data": {
            "id": case.case_id,
            "label": f"CASE: {case.case_number}",
            "type": "case",
            "title": case.title,
            "status": case.status
        }
    })

    # 2. Evidence Asset Nodes
    for e in case.evidence_items:
        # Determine highest severity of findings
        has_anomaly = any(f.classification == "anomaly" for f in e.findings)
        has_warning = any(f.classification in ["heuristic_warning", "investigative_lead"] for f in e.findings)
        status = "anomaly" if has_anomaly else ("warning" if has_warning else "clean")

        nodes.append({
            "data": {
                "id": e.evidence_id,
                "label": e.filename,
                "type": "evidence",
                "modality": e.modality,
                "sha256": e.sha256_digest[:10] + "...",
                "status": status,
                "filesize": e.filesize_bytes,
                "is_original": e.is_original
            }
        })

        # Edge from Case to Evidence
        edges.append({
            "data": {
                "id": f"edge-case-{e.evidence_id}",
                "source": case.case_id,
                "target": e.evidence_id,
                "label": "CONTAINS_EVIDENCE"
            }
        })

        # Derivative edge if applicable
        if e.derived_from_id:
            edges.append({
                "data": {
                    "id": f"edge-der-{e.evidence_id}",
                    "source": e.evidence_id,
                    "target": e.derived_from_id,
                    "label": "DERIVED_FROM"
                }
            })

        # 3. Finding Nodes
        for f in e.findings:
            nodes.append({
                "data": {
                    "id": f.finding_id,
                    "label": f"{f.finding_type.replace('_', ' ').upper()}",
                    "type": "finding",
                    "classification": f.classification,
                    "method": f.method_id,
                    "score": f"{f.score} ({f.score_semantics})" if f.score is not None else None,
                    "explanation": f.explanation[:80] + "..."
                }
            })

            edges.append({
                "data": {
                    "id": f"edge-fnd-{f.finding_id}",
                    "source": e.evidence_id,
                    "target": f.finding_id,
                    "label": "HAS_FINDING",
                    "classification": f.classification
                }
            })

    return {
        "case_id": case.case_id,
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges)
    }

