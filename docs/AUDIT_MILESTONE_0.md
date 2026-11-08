# SPECTRIX — MILESTONE 0: REFERENCE AUDIT & ARCHITECTURAL SPECIFICATION

## 1. Reference Inventory

The provided Stitch reference packages in `stitch_multimodal_forensic_workspace` (now mirrored in `references/stitch/`) represent the starting visual and interaction designs for SPECTRIX.

| Workspace Directory | Key Assets | Visual Scope | Primary Forensic Workflows |
| :--- | :--- | :--- | :--- |
| `spectrix_evidence_intelligence_canvas_forensic_refinement` | `code.html`, `screen.png` | Graph-based investigation canvas, node hierarchy, relational SVG links, 5-tier inspector dock, mini-map, audit ticker. | Cross-modal correlation, provenance tracing, entity similarity leads, case evidence orchestration. |
| `spectrix_image_examination_studio` | `code.html` | High-res image examination stage, 2D-FFT spectral scope, layer toggles (heatmap, landmarks, ELA, PRNU, cloning), bottom pipeline queue, findings inspector. | Spatial pixel forensics, ELA, noise residual verification, copy-move detection, inpainting localization. |
| `spectrix_video_examination_studio` | `code.html`, `screen.png` | Video viewport, SMPTE timecode bar, multi-track temporal timeline, filmstrip thumbnails, frame anomaly flags, frame inspector. | Temporal deepfake analysis, frame-by-frame scrubbing, face tracking, compression jumps, audio-visual viseme synchronization. |
| `spectrix_audio_examination_studio` | `code.html`, `screen.png` | Stereo waveform viewport, synchronized STFT spectrogram, transport controls (jog/shuttle, 10ms steps, loop), harmonic cursor, spectral inspector. | Acoustic discontinuity detection, voice activity detection, synthetic formant detection, speaker diarization. |
| `spectrix_design_system` | `DESIGN.md` | Token definitions, design philosophy, component patterns, typography, elevation rules. | Foundational design specifications and color mappings. |

---

## 2. Design Consistency Audit

A thorough examination of the four exported workspaces revealed significant divergences, stylistic inconsistencies, and token mismatches:

| Domain | Observed Inconsistencies Across Stitch Packages | SPECTRIX Canonical Resolution |
| :--- | :--- | :--- |
| **Color Palettes & Token Aliases** | • Canvas used `canvas (#090E16)`, `border (#25303D)`, `alertRed (#E05B63)`.<br>• Image Studio used `graphite-950..600`, `crimson (#f43f5e)`, `amber (#f59e0b)`.<br>• Video Studio used Material 3 `surface-container-lowest (#090d14)`.<br>• Audio Studio used Material tokens with `primary (#59e2bb)`. | Unified token set defined in `docs/DESIGN_SYSTEM.md`: 5 substrate tiers (`#0a0e16` to `#222c3d`), standardized 1px border (`#25303d`), and unified forensic accents: Mint (`#35c6a0`), Cyan (`#38bdf8`), Violet (`#8b5cf6`), Amber (`#f59e0b`), Crimson (`#f43f5e`). |
| **Typography & Fonts** | • Canvas loaded Inter and Geist Mono, using Phosphor Icons.<br>• Image Studio loaded Geist and JetBrains Mono with SVG vectors.<br>• Video Studio and Audio Studio used Google Material Symbols Outlined. | Standardized on **Geist** for UI prose/labels, **JetBrains Mono** for all technical telemetry and identifiers (with `tnum` and slashed zero). Unified icon library with clean vector rendering. |
| **Application Header Height** | Inconsistent across all 4 screens: Canvas (56px / `h-14`), Image (48px / `h-12`), Video (44px / `h-11`), Audio (64px / `h-16`). | Standardized on a single universal 48px (`h-12`) header with shared 3-zone layout (Brand/Case/Evidence, View Modes, Verification/Export). |
| **Inspector Dock Sizing** | Canvas had 380px fixed width; Image had 390px; Video had 360px; Audio had 380px with inconsistent internal padding and collapsible behaviors. | Unified `UniversalForensicInspector` component (`w-[380px]`) with standardized 5-tier forensic hierarchy and smooth collapsible toggle. |
| **Integrity & Verification Messaging** | Stitch screens inconsistently labeled hash verification (e.g., "Digest Verified", "DIGEST VERIFICATION: MATCH", "Pristine RAW"). | Mandatory scientific accuracy: Hash matches verify file integrity against a registered baseline; they do **not** certify that content was unmanipulated at origin. Badge strictly displays: `DIGEST MATCH [SHA-256] // File integrity only`. |
| **Shadows & Atmospheric Effects** | Canvas introduced ambient glow classes (`glow-mint`, `glow-alert`) which violate the DESIGN.md principle against artificial lighting that alters image evaluation. | Removed all ambient glows, drop-shadow blooms, and blurred glassmorphism. Elevation achieved purely through tonal stepping and 1px hairpin outlines. |

---

## 3. Canonical Design Token Specification

All tokens are formally specified in `docs/DESIGN_SYSTEM.md` and mapped directly to Tailwind CSS and CSS variables:

- **Surfaces**: `--surface-canvas` (`#0a0e16`), `--surface-panel` (`#111722`), `--surface-container` (`#18202e`), `--surface-elevated` (`#222c3d`), `--surface-highlight` (`#31353e`)
- **Borders**: `--border-subtle` (`#1c2433`), `--border-default` (`#25303d`), `--border-active` (`#2d3a4f`)
- **Forensic Accents**: `--accent-mint` (`#35c6a0`), `--accent-cyan` (`#38bdf8`), `--accent-violet` (`#8b5cf6`), `--accent-amber` (`#f59e0b`), `--accent-crimson` (`#f43f5e`)
- **Typography**: Font UI: `Geist, sans-serif`; Font Telemetry: `JetBrains Mono, monospace` (Tabular Numbers & Slashed Zeros enabled)
- **Geometry**: Strict 4px container radius (`rounded-[4px]`), 0px on internal evidentiary media grids.

---

## 4. Shared Component Inventory

The following core components will be implemented in the shared component ecosystem (`apps/web/src/components/common`):

1. **`AppShell` / `Header`**: Fixed 48px header with case selector, workspace router tabs, evidence item pill, SHA-256 integrity indicator, and export action.
2. **`UniversalInspector`**: 5-tier contextual forensic inspector supporting tabs (Findings, Telemetry, ROI Parameters, Analyst Notes, Relations).
3. **`FloatingToolPalette`**: Modular vertical tool dock with keyboard shortcut integration (`V`, `H`, `R`, `A`).
4. **`EvidenceCard`**: Compact, dense card rendering thumbnail, filename, format, SHA-256 snippet, processing status badge, and quick jump triggers.
5. **`ForensicStatusBadge`**: Semantic chip (`DIGEST MATCH`, `LEAD ONLY`, `ANOMALY`, `HEURISTIC`, `VERIFIED CLEAN`) combining high-contrast text and 1px border.
6. **`EmptyUploadZone`**: Accessible drag-and-drop file ingestion zone with MIME validation, SHA-256 real-time client hashing, file-size warning, and local processing disclaimers.
7. **`AffidavitExportModal`**: Cryptographically verifiable forensic examination export builder generating PDF/JSON evidence summaries.
8. **`AuditLogTicker`**: Bottom telemetry strip reporting chronological pipeline execution events and chain-of-custody updates.

---

## 5. Workspace-Specific Interaction Inventory

Each workspace possesses distinct operational mechanics:

### Evidence Intelligence Canvas
- **Engine**: Cytoscape.js with custom forensic nodes (Case, Evidence, Finding, Entity, Hop).
- **Interactions**: Spatial pan/zoom, node lasso selection, relationship filtering (Video, Image, Audio, Entity, Findings), connection inspector, graph layout re-centering, minimap scrubbing.

### Image Examination Studio
- **Engine**: High-DPI Canvas / WebGL viewer with pan-zoom matrix transforms.
- **Interactions**: Pixel Loupe (RGB / Linear sRGB readout), interactive ROI bounding boxes with resize handles, layer opacity slider (10%–100%), overlay toggles (Heatmap, Landmarks, ELA, PRNU, Splicing), 2D-FFT radial scope analysis.

### Video Examination Studio
- **Engine**: HTML5 Video element coupled with custom WebGL / Canvas timeline scrubber.
- **Interactions**: SMPTE timecode seeking (`00:00:00:00`), frame-accurate stepping (J/K/L, -1/+1 frame, -10/+10 frames), multi-track timeline (Video, Frame Anomalies, Audio visemes, Scene cuts), A/B split slider.

### Audio Examination Studio
- **Engine**: Web Audio API + Canvas spectrogram renderer (or pre-rendered STFT tiles from Librosa backend).
- **Interactions**: Synchronous stereo waveform scrubbing, time-frequency box selection (`[t1, t2, f1, f2]`), harmonic pitch cursor, A/B loop playback, channel routing (Stereo, Left, Right, Difference L-R).

---

## 6. Usability Improvements Recommended Over Stitch Designs

1. **Eliminate Hardcoded & Fake Evidence**:
   - The Stitch designs relied on static mockup images and fixed mock telemetry.
   - *Improvement*: Implement real file ingestion. The UI boots into an elegant, informative empty state with immediate upload capability. When a file is uploaded, the app calculates its real SHA-256, reads actual image dimensions/codecs via native APIs and backend FFprobe, and displays true analysis results.
2. **Flexible, Resizable Panels**:
   - Stitch designs used rigid CSS pixel widths that caused clipping on standard 1080p and laptop screens.
   - *Improvement*: Employ flexible flexbox layouts and draggable divider handles for inspector docks and timelines.
3. **Honest Forensic Disclaimers**:
   - Stitch mockups showed raw model numbers (`p = 0.002`, `10^3.8`) without context.
   - *Improvement*: Add mandatory inline disclaimers: *"Illustrative benchmark score — requires multi-modal corroboration; not established legal fact"*.
4. **Actionable Empty & Loading States**:
   - When no findings or files exist, provide clear guides on supported formats (JPEG, PNG, TIFF, MP4, MOV, WAV, FLAC), local storage guarantees, and analysis pipeline selection.
5. **Reduced Visual Fatigue**:
   - Remove glow effects, neon cyan borders, and harsh gradients, establishing a clinical, glare-free dark substrate suitable for long shifts in forensic labs.

---

## 7. Initial Architecture Proposal

SPECTRIX is structured as a **modular monolith** with asynchronous background processing, designed for local-first execution while supporting optional cloud scale:

### System Architecture Diagram
```
                     ┌──────────────────────────────────────────────────────────┐
                     │            SPECTRIX Web Application (React + Vite)       │
                     │  - Evidence Canvas (Cytoscape.js)                       │
                     │  - Image / Video / Audio Studios (Canvas / Web Audio)    │
                     │  - Shared API Client & Forensic UI Component Suite       │
                     └─────────────────────────────┬────────────────────────────┘
                                                   │ HTTP / WebSocket
                                                   ▼
                     ┌──────────────────────────────────────────────────────────┐
                     │             SPECTRIX Core API (FastAPI / Python)         │
                     │  - Evidence Ingestion & Cryptographic Digest (SHA-256)   │
                     │  - Case Management & Access Control                      │
                     │  - Analysis Pipeline Dispatcher & Job Tracking           │
                     │  - Forensic Graph Projection Engine (Postgres / Neo4j)   │
                     │  - Structured Findings & Forensic Copilot API            │
                     └─────────────────────────────┬────────────────────────────┘
                                                   │
                ┌──────────────────────────────────┴──────────────────────────────────┐
                ▼                                                                     ▼
┌─────────────────────────────────┐                                 ┌──────────────────────────────────┐
│      Primary Storage Layer      │                                 │     Worker & Processing Layer    │
│ - PostgreSQL / SQLite (Authoritative)│                             │ - Celery / Local Worker Pool     │
│ - Neo4j (Graph Projection - opt)│                                 │ - FFmpeg / FFprobe Media Service │
│ - MinIO / Local FS Object Store │                                 │ - Forensic Image/Audio Pipelines │
│ - Redis (Job Broker / Cache)    │                                 │   (OpenCV, PIL, Librosa, PyTorch)│
└─────────────────────────────────┘                                 └──────────────────────────────────┘
```

- **Frontend**: Single-Page App built with React 19, TypeScript (strict), Vite, Tailwind CSS, Lucide icons, and Cytoscape.js for evidence relationship graphs.
- **Backend**: FastAPI (Python 3.12+), Pydantic v2 domain schemas, SQLAlchemy 2.0 ORM with Alembic migrations, supporting PostgreSQL for production and SQLite for zero-dependency standalone local development.
- **Media Engine**: FFmpeg/FFprobe wrapper for audio/video stream demuxing and metadata; Pillow/OpenCV for image analysis; Librosa/SoundFile for audio STFT spectrogram generation.
- **Job Orchestration**: Background tasks managed via Celery + Redis in production, with a lightweight in-process asynchronous queue fallback for local single-node development.
- **Evidence Vault**: Local immutable directory store with SHA-256 pre-registration and optional S3/MinIO backend.

---

## 8. Proposed Implementation Plan

- **Milestone 0: Reference Audit & Architecture Specification** *(Current)*
  - Completed Stitch inventory, design consistency audit, canonical design tokens (`docs/DESIGN_SYSTEM.md`), architecture proposal, and UI tooling register (`docs/UI_TOOLING.md`).
- **Milestone 1: Engineering Foundation**
  - Project directory structure (`apps/web`, `apps/api`, `shared/`, `tests/`).
  - Git repository initialization and verified `.gitignore`.
  - Python backend setup with FastAPI, Pydantic schemas, database models, file storage service, and healthcheck endpoints.
  - React + Vite + TypeScript frontend setup with Tailwind CSS configured with canonical SPECTRIX tokens.
  - Automated test harnesses for backend and frontend.
- **Milestone 2: Shared Application UI**
  - Universal header with workspace navigation and case context.
  - Dynamic drag-and-drop file upload component with real-time SHA-256 hashing.
  - Universal 5-tier inspector dock component.
  - Toast and notification system.
- **Milestone 3: First End-to-End Vertical Slice (Image Forensic Workflow)**
  - Case creation API and UI.
  - Real image upload, SHA-256 digest computation, and immutable storage.
  - Native metadata extraction (EXIF/C2PA).
  - Baseline image forensic analysis (ELA, Noise variance, Splicing detection).
  - Visualization of real image with interactive findings in Image Examination Studio.
  - Automatic projection of evidence and findings into the Evidence Intelligence Canvas.
- **Milestones 4–9**:
  - Full Image Studio, Video Studio (FFmpeg thumbnails & temporal scrutiny), Audio Studio (Web Audio waveforms & spectrograms), Graph Intelligence (Cytoscape), Forensic Copilot, and Hardening.

