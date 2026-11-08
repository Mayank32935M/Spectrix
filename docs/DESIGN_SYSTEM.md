# SPECTRIX Canonical Design System

## 1. Overview & Forensic Philosophy

SPECTRIX is an enterprise-grade multimodal digital forensics and evidence intelligence platform. The interface operates as an objective, sensory-calibrated scientific instrument across four specialized workspaces:

1. **Evidence Intelligence Canvas** (Relational graph exploration & hypothesis formulation)
2. **Image Examination Studio** (High-resolution pixel analysis, ELA, PRNU residual, deepfake boundary detection)
3. **Video Examination Studio** (Frame-level temporal scrutiny, scene transitions, viseme desync, multi-track timelines)
4. **Audio Examination Studio** (Synchronized dual-channel waveforms, high-resolution STFT spectrograms, synthetic voice cues)

### Core UI/UX Tenets
- **Analytical Density**: High information density without visual clutter. Monospaced tabular alignment for telemetry.
- **Elevation via Tonal Stepping**: No atmospheric glows, simulated blur, or neon blooms that distort color calibration or forensic scrutiny. Depth is created strictly via calibrated surface luminance tiers and crisp 1px borders.
- **Truth in Presentation**: Visual design reinforces the evidentiary hierarchy:
  - Cryptographic file integrity ≠ Content authenticity.
  - Algorithmic likelihood ratio ≠ Legal guilt or established fact.
  - Facial or vocal similarity lead ≠ Verified legal identity.
- **Micro-radii**: Strict 4px corner radius (`rounded-[4px]`) on containers and controls; internal evidentiary elements (bounding boxes, waveforms, video pixels) maintain 0px geometric fidelity.

---

## 2. Canonical Color Palette & Normalization

The Stitch reference exports contained overlapping and divergent token sets (`graphite-*`, `surface-*`, `alertRed` vs `crimson`). SPECTRIX normalizes these into a single authoritative design token architecture.

### Substrate Surfaces (Tonal Tiers)
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `surface-canvas` | `#0a0e16` | Lowest substrate; viewport background, graph background |
| `surface-panel` | `#111722` | Secondary containers; sidebars, inspectors, headers |
| `surface-container` | `#18202e` | Inset data trays, cards, tables, dock modules |
| `surface-elevated` | `#222c3d` | Popovers, contextual dropdowns, modals, floating palettes |
| `surface-highlight`| `#31353e` | Hover states, active selection backgrounds |
| `border-subtle` | `#1c2433` | Hairpin dividers, interior cell borders |
| `border-default` | `#25303d` | Standard 1px panel and card borders |
| `border-active` | `#2d3a4f` | Interactive focus boundaries, active panel outlines |

### Monochromatic Text & Data
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `text-primary` | `#f1f5f9` | High-contrast values, findings headlines, active tab labels |
| `text-secondary` | `#94a3b8` | Metadata values, table body, secondary descriptions |
| `text-muted` | `#64748b` | Field labels, unit labels, disabled states, timestamps |

### Semantic Forensic Accents
| Accent | Canonical Hex | Active/Light | Role in Forensics |
| :--- | :--- | :--- | :--- |
| **Mint** (Anchor) | `#35c6a0` | `#20e3b2` | Registered SHA-256 digest match, verified baselines, intact C2PA credentials, valid chain-of-custody. *(Does NOT imply authentic capture)* |
| **Cyan** (Telemetry) | `#38bdf8` | `#7bd0ff` | Active scrub playheads, demuxed audio streams, ELA heuristic variance, crosshair coordinates |
| **Violet** (Biometric) | `#8b5cf6` | `#a855f7` | Facial landmark mesh (68-pt), biometric cosine similarity, voice diarization cluster leads *(Investigative lead only)* |
| **Amber** (Lead/Warning) | `#f59e0b` | `#e5a93c` | Metadata discrepancies, missing GPS/EXIF headers, compression artifacts, uncorroborated leads |
| **Crimson** (Anomaly) | `#f43f5e` | `#e11d48` | Algorithmic deepfake detection, diffusion inpaint boundaries, viseme desync, compromised custody |

---

## 3. Typography & Numerical Representation

### Type Families
1. **Application UI & Narratives**: `Geist`, `Inter`, system sans-serif.
   - Clean, neutral neo-grotesque type optimized for reading analyst notes, findings descriptions, and headers.
2. **Computational Ground Truth**: `JetBrains Mono`, `Geist Mono`, monospace.
   - All technical parameters: SMPTE timecodes (`00:01:14:18`), SHA-256 digests (`b8a1c9...31f0`), sample rates, frequencies, bounding-box extents, pixel RGB coordinates, and JSON telemetry.
   - Must use OpenType feature tags: `font-feature-settings: "tnum" 1, "zero" 1` (tabular numerals, slashed zero).

### Hierarchy Scale
- **Display / Large**: 18px / 24px (`Geist`, Semi-Bold, letter-spacing: -0.015em)
- **Workspace Subhead**: 14px / 20px (`Geist`, Medium)
- **Body & Inspector Text**: 12px / 18px (`Geist`, Regular)
- **Monospace Telemetry (Default)**: 11px / 16px (`JetBrains Mono`, Regular)
- **Monospace Micro-Labels / Tags**: 9px–10px / 12px (`JetBrains Mono`, Semi-Bold, uppercase, letter-spacing: 0.04em)

---

## 4. Reusable Component Specifications

### A. Application Shell Header (`h-12` / 48px)
- **Zone 1 (Left)**: App Logo (`SPECTRIX`), Workspace Selector dropdown, Case Chip (`SPX-2026-0142`), Evidence Item Chip (`SPX-EV-00031`).
- **Zone 2 (Center)**: Workspace View Mode Switcher (e.g., *Analysis Overlays*, *A/B Split*, *Raw Evidence*).
- **Zone 3 (Right)**: Cryptographic File Integrity Chip (`Digest Verified`), Ingestion Sync Status, Global Search (`⌘K`), Affidavit Export Trigger, Analyst Profile Badge.

### B. Universal 5-Tier Inspector Dock (`w-[380px]`)
Consistently structured across all four workspaces into 5 forensic tiers:
1. **Tier 1: Cryptographic File Integrity**: Registered SHA-256 digest, verification button, timestamp, C2PA manifest state, custody log reference. Explicitly marked: *"File integrity only — does not establish content authenticity or provenance"*.
2. **Tier 2: Observed Stream Telemetry**: Native container properties extracted by FFprobe/ExifTool (codecs, resolutions, frame rates, color spaces, audio bit depths).
3. **Tier 3: Model Findings & Benchmark Scores**: Detection methods, versions, localized ROIs, likelihood ratios, model limitations disclaimer.
4. **Tier 4: Analyst Observations & Hypothesis Notes**: Human examiner sign-off, timestamped hypothesis log, Markdown note append.
5. **Tier 5: Investigative Leads & Graph Relations**: Biometric leads, related cases, dissemination hops, similarity scores (with mandatory lead warnings).

### C. Floating Workstation Tool Palettes
- Vertical dock positioned at `top-3 left-3` of viewports.
- 28px × 28px square buttons with 4px radius, 1px border.
- Active tool: `#35c6a0/20` background, `#35c6a0` icon, `#35c6a0/40` border.
- Hover tool: `#18202e` background, `#f1f5f9` icon.

### D. Forensic Bounding Boxes & Annotation Reticles
- 1px hairline border in the corresponding semantic accent (`#f43f5e` for anomalies, `#f59e0b` for copy-move, `#38bdf8` for ELA).
- 2px corner reticle indicators (`border-t-2 border-l-2`).
- Monospace metadata pill attached to top-left corner displaying finding ID and model score.
- Dimension pill attached to bottom-right corner displaying `[X, Y, W, H]`.

---

## 5. Accessibility & Responsive Constraints

1. **Contrast Ratios**: All text meets WCAG AA (minimum 4.5:1 for body text against dark backgrounds; minimum 3:1 for large/bold labels).
2. **Color Blindness Defense**: No forensic state is communicated solely through color. Every badge, finding, and node pairs color with a distinct text tag (e.g., `[FLAGGED]`, `[MATCH]`, `[LEAD ONLY]`, `[PRISTINE]`).
3. **Reduced Motion**: All animations (node wiring dashes, pulse indicators) respect `prefers-reduced-motion: reduce`.
4. **Keyboard Navigation**:
   - `V`: Select / Pointer tool
   - `H`: Pan tool
   - `R`: Region of interest (ROI) selection
   - `Space`: Video / Audio play & pause
   - `J` / `K` / `L`: Scrub backward, pause, scrub forward
   - `[` / `]`: In-point and out-point loop markers
   - `Esc`: Clear selection / dismiss modal

