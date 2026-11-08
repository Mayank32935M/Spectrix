# Security & Forensic Integrity Policy

## Supported Versions

SPECTRIX adheres to high standards of digital evidence integrity and cryptographic accountability. Security patches are applied actively to the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Forensic Integrity & Local-First Privacy Guarantees

SPECTRIX is engineered for law enforcement, digital forensics incident response (DFIR) specialists, national security agencies, and media verification organizations. We enforce strict architectural boundaries:

1. **Local-First & Offline By Design**: All ML pipelines, signal transforms (ELA, 2D-FFT, PRNU, FaceMesh, SyncNet, Spectrograms), and database operations execute locally. No evidence bytes, metadata, hashes, or examiner queries leave your infrastructure.
2. **Read-Only Evidence Vault (ISO/IEC 27037 Compliance)**: Ingested evidence assets are assigned immutable cryptographic SHA-256 digests. Raw evidence files are stored in read-only directories; analysis pipelines operate exclusively on read-only buffers or isolated memory mapped handles. Original bits are never overwritten.
3. **Cryptographic Chain of Custody**: Every ingestion, examination, annotation, and export event is immutably logged with UTC timestamps, examiner identity, machine host signatures, and hash verification records.
4. **Transparent, Calibrated Scoring**: SPECTRIX never claims automated infallibility. Automated algorithms provide bounded likelihood scores and confidence intervals, explicitly logging known method limitations (e.g., lens distortion, video recompression, social media downscaling).

---

## Reporting a Vulnerability

If you discover a security vulnerability, evidence-tampering flaw, or integrity bypass in SPECTRIX:

1. **Do not disclose publicly** via GitHub Issues or public forums.
2. Send a detailed report to the security team at:
   `security@spectrix-forensics.org` (or create a private GitHub Security Advisory).
3. Include:
   - Component affected (API router, pipeline runner, frontend vault, database, or report generator)
   - Step-by-step reproduction instructions or proof-of-concept
   - Impact assessment on evidence admissibility or confidentiality
   - Any proposed remediation or patches

We aim to acknowledge receipt of vulnerability reports within **48 hours** and provide a timeline for resolution and coordinated disclosure.
