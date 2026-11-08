# SPECTRIX — Multimodal Digital Forensics & Evidence Intelligence Platform

SPECTRIX is an enterprise-grade digital forensics workstation suite designed for rigorous chain-of-custody scrutiny, forensic media verification, neural deepfake detection, and cryptographic analysis.

---

## Workspaces

1. **Evidence Intelligence Canvas**: Graph-based investigation correlating cross-modal evidence, C2PA provenance hops, and entity biometric similarity leads.
2. **Image Examination Studio**: Spatial pixel forensics, 2D-FFT radial spectrum scope, Error Level Analysis (ELA), PRNU sensor noise residual verification, and diffusion inpainting boundary localization.
3. **Video Examination Studio**: Frame-level temporal scrutiny, SMPTE timecode navigation, multi-track timelines, facial inpainting flags, and audio-video viseme synchronization.
4. **Audio Examination Studio**: Synchronous stereo waveforms, high-resolution STFT spectrograms, time-frequency box bounding, synthetic voice formant cues, and acoustic discontinuity detection.

---

## Architectural Principles

- **Evidence Integrity**: Immutable evidence vault. Raw evidence is never modified. Registered SHA-256 digests are verified on ingestion and continuously auditable.
- **Local-First & Secure**: Core media demuxing, ELA calculation, noise extraction, and metadata parsing execute locally without external cloud dependencies.
- **Truth in Presentation**:
  - Cryptographic file digest match ≠ Content authenticity.
  - Model Likelihood Ratio ≠ Legal guilt.
  - Biometric cosine similarity lead ≠ Established legal identity.
- **Zero Atmospheric Distortions**: Tonal surface stepping and 1px crisp hairpins; no ambient glows, diffused shadows, or blurred glassmorphism that alter color calibration.

---

## Quickstart

### 1. Prerequisites
- Node.js v20+ / v24+
- pnpm v9+ / v12+
- Python 3.12+ / 3.14+

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r apps/api/requirements.txt

# Run backend test suite
pytest apps/api/tests

# Launch API server (port 8000)
uvicorn spectrix.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Install packages
pnpm install

# Build production bundle
pnpm --filter @spectrix/web build

# Launch dev server (port 5173 with proxy to 8000)
pnpm --filter @spectrix/web dev
```

---

## Project Structure

```
SPECTRIX/
├── apps/
│   ├── web/                    # React 19 + TypeScript + Vite + Tailwind CSS
│   └── api/                    # FastAPI + SQLAlchemy + Pillow + NumPy
├── storage/                    # Immutable Evidence Vault (Git-ignored)
│   ├── uploads/                # Original registered media
│   ├── derivatives/            # Generated ELA maps & thumbnails
│   └── temp/                   # Temporary buffers
├── references/                 # Design references & Stitch exports
│   └── stitch/
├── docs/                       # Canonical architecture & design documents
│   ├── DESIGN_SYSTEM.md
│   ├── AUDIT_MILESTONE_0.md
│   ├── UI_TOOLING.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   └── EVIDENCE_MODEL.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Verification & Quality Gates

- **Backend**: 8 automated tests passing (`pytest apps/api/tests`) covering case management, storage vault hashing, integrity verification, ELA pipelines, PRNU extraction, and metadata auditing.
- **Frontend**: Strict TypeScript compilation (`tsc`) and Vite production bundling verified with zero errors.

