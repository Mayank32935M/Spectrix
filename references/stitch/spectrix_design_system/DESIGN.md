---
name: SPECTRIX Design System
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#111722'
  surface-container: '#18202e'
  surface-container-high: '#222c3d'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#bbcac2'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#86948d'
  outline-variant: '#3c4a44'
  surface-tint: '#53ddb5'
  primary: '#59e2bb'
  on-primary: '#00382a'
  primary-container: '#35c6a0'
  on-primary-container: '#004d3c'
  inverse-primary: '#006b54'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#e1bfff'
  on-tertiary: '#490080'
  tertiary-container: '#ce9bff'
  on-tertiary-container: '#6400ac'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#73fad1'
  primary-fixed-dim: '#53ddb5'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#00513f'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
  outline-border: '#2d3a4f'
  mint-bright: '#20e3b2'
  amber-lead: '#e5a93c'
  amber-bright: '#f59e0b'
  crimson-anomaly: '#f43f5e'
  crimson-dark: '#e11d48'
  violet-biometric: '#8b5cf6'
  text-primary: '#f1f5f9'
  text-secondary: '#94a3b8'
  text-muted: '#64748b'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.06em
  code-telemetry:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0px
  gutter-loose: 0.25rem
  margin: 0.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes the visual and structural architecture for an enterprise-grade digital forensics workstation suite. Built for mission-critical chain-of-custody scrutiny, forensic media verification, neural deepfake detection, and cryptographic analysis, it prioritizes analytical density, determinism, and instant state legibility.

The design movement balances technical brutalism with clinical modern instrumentation: dark graphite substrate surfaces, calibrated 1px structural hairpins, micro-radii (4px) on operational modules, and stark chromatic coding across verification tiers. The interface operates as an objective sensory instrument across the Evidence Intelligence Canvas, Image Examination Studio, Video Examination Studio, and Audio Examination Studio. Every visual marker maps unambiguously to verified anchors, speculative leads, or critical anomalies.

## Colors

The workstation uses a high-contrast dark graphite foundation that eliminates display glare, prevents eye fatigue during multi-hour investigations, and maintains perceptual luminance calibration when evaluating forensic imagery and spectral heatmaps.

- **Primary (`#35c6a0` / `#20e3b2`)**: Mint designates cryptographically verified anchors, established baselines, valid SHA-256 blocks, and active confirmations.
- **Secondary (`#38bdf8`)**: Sky cyan isolates active telemetry streams, demuxed audio channels, active scrubbing needles, and parameter crosshairs.
- **Tertiary (`#a855f7` / `#8b5cf6`)**: Violet indicates biometric identity matches, facial landmark topologies, neural embeddings, and cross-source identity leads.
- **Investigation & Warning (`#e5a93c` / `#f59e0b`)**: Amber marks open investigative leads, container metadata inconsistencies, and heuristic warnings.
- **Critical Anomaly (`#f43f5e` / `#e11d48`)**: Crimson denotes detected neural synthesis, deepfake artifacts, model manipulation, and compromised chain-of-custody signatures.
- **Neutral Core**: Tiered dark graphite layers structure the workspace: Canvas Base (`#0b0f17`), Panel Surface (`#111722`), Inset/Dock Containers (`#18202e`), Hover/Selection Containers (`#222c3d`), and Structural Framing (`#2d3a4f`).

## Typography

The typographic hierarchy implements an intentional division of labor between natural language parsing and raw computational telemetry:

1. **Analytical Prose & Workspace Hierarchy (`Geist`)**: Used for workspace headlines, modal headers, finding narratives, and analyst observations. Geist provides neutral, ultra-clean legibility without distracting stylistic flourishes.
2. **Computational Ground Truth (`JetBrains Mono`)**: Powers all technical parameters, SMPTE timecodes (`HH:MM:SS:FF`), SHA-256 digests, frame indices, coordinates, audio decibel metrics, and hexadecimal inspections.
3. **OpenType Features**: All monospaced numbers render with tabular figures (`tnum`) and slashed zeros (`zero`) to guarantee rigid columnar vertical alignment and eliminate confusion between `0` and `O`.

## Elevation & Depth

This system intentionally rejects atmospheric drop shadows, diffused colored glows, and blurred glassmorphism. In evidence analysis, fake ambient light distorts visual verification and color calibration.

- **Tonal Stepping**: Surface depth is established strictly by luminance tiers:
  - Base Workstation Layer: `#0b0f17`
  - Secondary Panels / Docks: `#111722`
  - Inset Data Trays / Code Cells: `#18202e`
  - Modals, Popovers, & Context Menus: `#222c3d`
- **Low-Contrast Structural Outlines**: Spatial boundaries use crisp 1px borders in `#2d3a4f`.
- **Active Focus**: Interactive element focus is indicated by a sharp 1px outline in `#35c6a0` or `#38bdf8`, with zero exterior shadow bloom.

## Shapes

The interface uses subtle 4px corner micro-radii (`roundedness: 1` / `0.25rem`) across action buttons, container frames, inspector cards, and badge pills. 

This micro-radius softens interactive controls without breaking the mechanical alignment of the analytical grid. Internal evidentiary elements—including node pins, waveform scrub ticks, video frame boundaries, and pixel-grid scopes—remain strict 0px rectangles to guarantee geometric fidelity.

## Components

### Buttons & Interactive Triggers
- **Primary Verify Button**: 32px height, 4px radius, solid `#35c6a0` fill, `#0b0f17` JetBrains Mono 12px bold typography. Hover shifts to `#20e3b2`.
- **Secondary Inspection Button**: 32px height, 4px radius, `#18202e` background, 1px solid `#2d3a4f` border, text `#f1f5f9`. Hover shifts border to `#38bdf8`.
- **Destructive/Flag Anomaly Button**: 32px height, 4px radius, `#18202e` background with a 1px solid `#f43f5e` border, `#f43f5e` text, and a 10% red alpha hover wash.

### Form Inputs & Search Fields
- 30px compact height, 4px radius, `#0b0f17` background, 1px solid `#2d3a4f` border.
- Text rendered in JetBrains Mono 11px `#f1f5f9` with `#64748b` placeholder text.
- Focus state applies a crisp 1px border in `#38bdf8` with zero shadow.

### Status Badges & Forensic Chips
- 20px fixed height, 4px radius, 6px horizontal padding.
- Built using a 1px border matching the semantic token with an 8% alpha background fill:
  - *Verified Clean*: `#35c6a0` border, `rgba(53, 198, 160, 0.08)` background, `#35c6a0` text.
  - *Investigative Lead*: `#e5a93c` border, `rgba(229, 169, 60, 0.08)` background, `#e5a93c` text.
  - *Synthetic Anomaly*: `#f43f5e` border, `rgba(244, 63, 94, 0.08)` background, `#f43f5e` text.
  - *Biometric Lead*: `#a855f7` border, `rgba(168, 85, 247, 0.08)` background, `#a855f7` text.

### Inspection Panels & Chain-of-Custody Cards
- Surface background `#111722`, 4px radius, framed in 1px solid `#2d3a4f`.
- Header: 28px height, `#18202e` background, 1px bottom border `#2d3a4f`, uppercase 11px Geist semi-bold text.
- Metadata Rows: Key labels in 10px `#64748b` JetBrains Mono; values in 11px `#f1f5f9` JetBrains Mono with 1-click clipboard copy actions on hover.

### Media Timelines & Scope Displays
- Track background `#111722` bordered by `#2d3a4f`.
- Scrubber head: 1px vertical line in `#38bdf8` topped with a 4px-radius triangular flag.
- Frame anomaly markers: Solid spans of `#f43f5e` overlaid directly across the temporal ribbon.