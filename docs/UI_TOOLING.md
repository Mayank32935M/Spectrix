# SPECTRIX UI Tooling & Dependency Register

This register documents every UI library, component framework, and visualization engine evaluated and adopted for the SPECTRIX forensic workstation.

---

## 1. Adopted Tooling & Component Registry

### A. React & TypeScript
- **Tool Name**: React / React DOM
- **Official URL**: https://react.dev/
- **Version**: ^19.0.0 (or ^18.3.1)
- **Purpose**: Core component architecture and state-driven UI framework.
- **Installation Method**: `pnpm add react react-dom`
- **Integration Location**: `apps/web/`
- **License**: MIT
- **Reason for Adoption**: Industry-standard, declarative component model with rich ecosystem for high-performance canvas, audio, and graph integration.
- **Alternatives Considered**: Vue 3, Svelte (React selected for Cytoscape.js and audio canvas ecosystem maturity).

### B. Vite
- **Tool Name**: Vite
- **Official URL**: https://vitejs.dev/
- **Version**: ^6.0.0
- **Purpose**: Modern frontend bundler, HMR, and build toolchain.
- **Installation Method**: `pnpm add -D vite @vitejs/plugin-react`
- **Integration Location**: `apps/web/vite.config.ts`
- **License**: MIT
- **Reason for Adoption**: Sub-second dev server startup, rapid HMR, optimized production rollup builds.
- **Alternatives Considered**: Webpack, Turbopack, Next.js (SPA architecture chosen to allow local offline execution and standalone desktop-ready distribution).

### C. Tailwind CSS
- **Tool Name**: Tailwind CSS
- **Official URL**: https://tailwindcss.com/
- **Version**: ^3.4.0 (or v4)
- **Purpose**: Utility-first CSS engine implementing the canonical SPECTRIX design tokens.
- **Installation Method**: `pnpm add -D tailwindcss postcss autoprefixer`
- **Integration Location**: `apps/web/tailwind.config.js`, `apps/web/src/index.css`
- **License**: MIT
- **Reason for Adoption**: Rapid composition of high-density forensic layouts without stylesheet bloat; full control over color tokens.
- **Alternatives Considered**: Vanilla CSS, CSS Modules, Styled Components.

### D. Cytoscape.js
- **Tool Name**: Cytoscape.js
- **Official URL**: https://js.cytoscape.org/
- **Version**: ^3.30.0
- **Purpose**: Primary graph visualization and relational intelligence engine for the Evidence Intelligence Canvas.
- **Installation Method**: `pnpm add cytoscape @types/cytoscape`
- **Integration Location**: `apps/web/src/components/canvas/EvidenceGraph.tsx`
- **License**: MIT
- **Reason for Adoption**: High performance on large forensic graphs (hundreds of nodes/edges), rich layout algorithms (cose, breadthfirst, concentric), custom node styling, and full headless API.
- **Alternatives Considered**: React Flow / XYFlow (React Flow is more focused on workflow node editors with ports; Cytoscape is superior for evidence relationship networks and clustering), D3-force (too low-level; requires re-implementing selection, zooming, and layouts).

### E. Lucide Icons (React)
- **Tool Name**: Lucide React
- **Official URL**: https://lucide.dev/
- **Version**: ^0.460.0
- **Purpose**: Crisp, consistent 1px/1.5px hairline vector iconography for forensic tools, badges, and headers.
- **Installation Method**: `pnpm add lucide-react`
- **Integration Location**: `apps/web/src/components/`
- **License**: ISC
- **Reason for Adoption**: Modern, comprehensive, zero-runtime overhead SVG icons with consistent optical balance matching the technical aesthetic.
- **Alternatives Considered**: Font Awesome (heavy, inconsistent licensing), Material Icons font (font rendering causes alignment glitches and layout shifts).

### F. Motion (Framer Motion)
- **Tool Name**: Motion
- **Official URL**: https://motion.dev/
- **Version**: ^12.0.0
- **Purpose**: Subtle, fast, meaningful micro-interactions (collapsible inspector docks, toast entrances, selection focus rings).
- **Installation Method**: `pnpm add motion`
- **Integration Location**: `apps/web/src/components/common/`
- **License**: MIT
- **Reason for Adoption**: Declarative React animation with built-in layout animation and reduced-motion preference support.
- **Alternatives Considered**: Anime.js (imperative; better for standalone SVG animations, but heavier integration with React component lifecycle).

### G. TanStack Table
- **Tool Name**: TanStack Table (v8)
- **Official URL**: https://tanstack.com/table
- **Version**: ^8.20.0
- **Purpose**: Dense tabular data grids for evidence vaults, audit logs, metadata tables, and model registries.
- **Installation Method**: `pnpm add @tanstack/react-table`
- **Integration Location**: `apps/web/src/components/tables/`
- **License**: MIT
- **Reason for Adoption**: Headless, completely customizable markup, sorting, multi-filtering, column pinning, and lightweight footprint.
- **Alternatives Considered**: AG Grid (proprietary license for enterprise features), DataTables (jQuery legacy).

---

## 2. Evaluation of Specialized Audio & Video Visualization

### Audio Waveforms & Spectrograms
- **Primary Strategy**: Web Audio API `AudioContext` + HTML5 Canvas.
  - Generates direct sample decoding in browser for instant playback and zero-latency seeking.
  - Spectrograms: High-performance 2D Canvas rendering using STFT magnitude matrices computed either by the Python Librosa backend (for mathematically authoritative FFTs) or client-side Web Audio `AnalyserNode`.
- **Alternatives Evaluated**:
  - WaveSurfer.js (good for basic waveforms, but custom forensic annotations, frequency bounds, and multi-track sync are easier and cleaner with direct Canvas controls).

### Large Image Inspection
- **Primary Strategy**: Direct 2D Canvas / WebGL transform matrix with pan, zoom, pixel loupe, and SVG annotation overlays.
- **Alternatives Evaluated**: OpenSeadragon (great for Deep Zoom pyramid images; can be added if multi-gigabyte gigapixel imagery is required, but standard 4K/8K images are handled natively by Canvas with zero external dependencies).

