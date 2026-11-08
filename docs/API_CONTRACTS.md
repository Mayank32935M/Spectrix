# SPECTRIX REST API Specification (v1)

Base URL: `/api/v1`

All responses adhere to standard JSON envelopes. Long-running forensic jobs return HTTP 202 Accepted with a Job status pointer.

---

## 1. Case Management

### `POST /api/v1/cases`
Creates a new forensic case.
- **Request Body**:
  ```json
  {
    "case_number": "SPX-2026-0142",
    "title": "Synthetic Media Inquiry",
    "description": "Cross-modal forensic analysis of leaked press briefing",
    "examiner_name": "Dr. E. Vance"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "case_id": "SPX-2026-0142",
    "case_number": "SPX-2026-0142",
    "title": "Synthetic Media Inquiry",
    "status": "open",
    "created_at": "2026-03-02T09:14:00Z"
  }
  ```

### `GET /api/v1/cases`
Lists all cases with evidence counts and active status.

### `GET /api/v1/cases/{case_id}`
Retrieves case overview, summary metrics, and evidence inventory.

---

## 2. Evidence Ingestion & Verification

### `POST /api/v1/cases/{case_id}/evidence`
Ingests an evidence file into the immutable vault.
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file`: Raw binary
  - `precomputed_sha256`: (Optional) Client-calculated SHA-256 for verification
  - `description`: (Optional) Contextual notes
- **Response** (`201 Created`):
  Returns `EvidenceAsset` object including registered SHA-256 digest, detected MIME type, and initial custody event.

### `GET /api/v1/cases/{case_id}/evidence`
Lists all evidence assets associated with a specific case.

### `GET /api/v1/evidence/{evidence_id}`
Retrieves evidence metadata, media URLs, custody history, and derivative hierarchy.

### `GET /api/v1/evidence/{evidence_id}/integrity`
Re-calculates the on-disk SHA-256 digest and compares it against the registration digest.
- **Response** (`200 OK`):
  ```json
  {
    "evidence_id": "SPX-EV-00031",
    "registered_sha256": "4f9c87d2a5789f31a29f8d1e028b12f90a218f0a1c3b5d7e9f012345e1b099c2",
    "current_sha256": "4f9c87d2a5789f31a29f8d1e028b12f90a218f0a1c3b5d7e9f012345e1b099c2",
    "integrity_status": "MATCH",
    "verified_at": "2026-03-02T09:15:30Z",
    "notice": "File integrity only — does not establish content authenticity or provenance"
  }
  ```

---

## 3. Forensic Analysis & Jobs

### `POST /api/v1/evidence/{evidence_id}/analyze`
Dispatches an asynchronous forensic analysis pipeline.
- **Request Body**:
  ```json
  {
    "pipelines": ["ela_compression", "noise_prnu", "metadata_c2pa", "splicing_detection"],
    "parameters": {
      "ela_quality": 90,
      "splicing_min_matches": 10
    }
  }
  ```
- **Response** (`202 Accepted`):
  ```json
  {
    "job_id": "job-773a90",
    "evidence_id": "SPX-EV-00031",
    "status": "queued",
    "progress_percent": 0,
    "created_at": "2026-03-02T09:15:35Z"
  }
  ```

### `GET /api/v1/jobs/{job_id}`
Polls job status, progress percentage, log messages, and output findings.

---

## 4. Structured Findings

### `GET /api/v1/cases/{case_id}/findings`
Returns all findings for the case, with filters for modality, classification, and review status.

### `GET /api/v1/findings/{finding_id}`
Returns the complete `ForensicFinding` object including spatial/temporal coordinates, likelihood ratios, and limitations.

### `PATCH /api/v1/findings/{finding_id}/review`
Allows the human examiner to corroborate or dismiss a finding and record notes.

---

## 5. Evidence Intelligence Graph

### `GET /api/v1/cases/{case_id}/graph`
Returns the Cytoscape-compatible JSON graph payload:
```json
{
  "nodes": [
    { "data": { "id": "SPX-EV-00031", "type": "evidence", "label": "press_briefing.jpg", "modality": "image", "status": "anomaly" } },
    { "data": { "id": "FND-01", "type": "finding", "label": "Mandibular Inpaint", "score": "LR 10^3.8" } }
  ],
  "edges": [
    { "data": { "id": "e1", "source": "SPX-EV-00031", "target": "FND-01", "label": "HAS_FINDING" } }
  ]
}
```

---

## 6. Affidavit & Report Generation

### `POST /api/v1/cases/{case_id}/reports`
Generates a signed evidentiary report summary (JSON or PDF) documenting the chain of custody, verified digests, execution methods, and corroborated findings.

