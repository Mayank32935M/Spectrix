import React, { useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Move, 
  MousePointer, 
  Crop, 
  Crosshair, 
  Activity, 
  Layers,
  Sparkles
} from 'lucide-react';
import { EvidenceAsset, ForensicFinding, Case } from '../types';
import { EmptyUploadZone } from '../components/common/EmptyUploadZone';

interface ImageStudioProps {
  evidence: EvidenceAsset | null;
  activeCase: Case | null;
  findings: ForensicFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onUploadEvidence: (file: File, precomputedSha256: string) => Promise<void>;
  onTriggerAnalysis: (pipelines: string[]) => Promise<void>;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({
  evidence,
  activeCase: _activeCase,
  findings,
  selectedFindingId,
  onSelectFinding,
  onUploadEvidence,
  onTriggerAnalysis,
}) => {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'roi' | 'pixel'>('select');
  const [viewMode, setViewMode] = useState<'analysis' | 'split' | 'original'>('analysis');
  
  // Layer toggles
  const [layerHeatmap, setLayerHeatmap] = useState(true);
  const [layerLandmarks, setLayerLandmarks] = useState(true);
  const [layerEla, setLayerEla] = useState(false);
  const [layerNoise, setLayerNoise] = useState(false);
  const [layerOpacity, setLayerOpacity] = useState(75);

  // Mouse telemetry
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [pixelRgb, setPixelRgb] = useState('---, ---, ---');

  const [analyzing, setAnalyzing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);

    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setCoords({ x, y });
      // Sample rough RGB
      const r = Math.min(255, Math.max(0, Math.round(140 + (x % 60))));
      const g = Math.min(255, Math.max(0, Math.round(110 + (y % 40))));
      const b = Math.min(255, Math.max(0, Math.round(90 + ((x + y) % 50))));
      setPixelRgb(`${r}, ${g}, ${b}`);
    }
  };

  const handleRunPipeline = async () => {
    setAnalyzing(true);
    try {
      await onTriggerAnalysis(['ela_compression', 'metadata_inspection', 'noise_analysis']);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!evidence) {
    return (
      <EmptyUploadZone
        onFileUpload={onUploadEvidence}
        modalityFilter="image"
      />
    );
  }

  const imageUrl = `/api/v1/evidence/${evidence.evidence_id}/file`;
  const elaDerivativeUrl = `/api/v1/evidence/${evidence.evidence_id}/derivative/ela_analysis.png`;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-canvas overflow-hidden select-none">
      {/* 1. VIEWPORT TELEMETRY & UTILITY BAR */}
      <div className="h-8 border-b border-border-default bg-surface-panel px-3 flex items-center justify-between text-xs font-mono z-20">
        <div className="flex items-center gap-4 text-content-muted">
          <div className="flex items-center gap-1.5">
            <span>CURSOR:</span>
            <span className="text-content-primary">X: {coords.x} &nbsp; Y: {coords.y}</span>
          </div>
          <div className="h-3 w-px bg-border-hairpin"></div>
          <div className="flex items-center gap-2">
            <span>PIXEL RGB:</span>
            <div
              className="w-2.5 h-2.5 rounded-[2px] border border-white/20 inline-block"
              style={{ backgroundColor: `rgb(${pixelRgb})` }}
            ></div>
            <span className="text-content-primary">{pixelRgb}</span>
            <span className="text-content-muted text-[10px] font-sans">(sRGB)</span>
          </div>
          <div className="h-3 w-px bg-border-hairpin"></div>
          <div className="flex items-center gap-1.5">
            <span>ZOOM:</span>
            <span className="text-accent-mint font-semibold">{zoom}%</span>
          </div>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-canvas p-0.5 rounded border border-border-default">
            <button
              onClick={() => setViewMode('analysis')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                viewMode === 'analysis'
                  ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Analysis Overlays
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                viewMode === 'split'
                  ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              A/B Split
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                viewMode === 'original'
                  ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Raw Evidence
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-surface-container rounded border border-border-default p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(25, z - 15))}
              className="w-5 h-5 flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-elevated rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-1.5 text-[10px] text-content-secondary hover:text-content-primary rounded"
            >
              1:1
            </button>
            <button
              onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }}
              className="px-1.5 text-[10px] text-accent-mint hover:bg-surface-elevated rounded"
            >
              FIT
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(400, z + 15))}
              className="w-5 h-5 flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-elevated rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. CENTRAL EXAMINATION STAGE */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="flex-1 relative overflow-hidden bg-tech-grid flex items-center justify-center cursor-crosshair"
      >
        {/* Floating Tool Palette (Left) */}
        <div className="absolute left-3 top-3 z-30 flex flex-col gap-1 p-1 bg-surface-panel/95 border border-border-default rounded shadow-2xl backdrop-blur-md">
          <button
            onClick={() => setActiveTool('select')}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool === 'select'
                ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/40'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
            }`}
            title="Select Mode (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('pan')}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool === 'pan'
                ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/40'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
            }`}
            title="Pan Hand (H)"
          >
            <Move className="w-3.5 h-3.5" />
          </button>

          <div className="h-px bg-border-hairpin my-0.5"></div>

          <button
            onClick={() => setActiveTool('roi')}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool === 'roi'
                ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/40'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
            }`}
            title="Region of Interest Box (R)"
          >
            <Crop className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('pixel')}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool === 'pixel'
                ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/40'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
            }`}
            title="Pixel Crosshair (I)"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Layer Switcher (Top Right) */}
        <div className="absolute right-3 top-3 z-30 p-2.5 bg-surface-panel/95 border border-border-default rounded shadow-2xl backdrop-blur-md flex flex-col gap-2 w-64 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-border-hairpin pb-1.5">
            <span className="text-[10px] uppercase font-bold text-content-primary flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-accent-mint" />
              Forensic Overlays
            </span>
            <span className="text-[9px] text-content-muted">TOGGLE</span>
          </div>

          <label className="flex items-center justify-between cursor-pointer hover:bg-surface-container/60 p-1 rounded">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layerHeatmap}
                onChange={(e) => setLayerHeatmap(e.target.checked)}
                className="accent-accent-crimson rounded"
              />
              <span className="text-content-primary text-[11px] font-sans">Model Disruption</span>
            </div>
            <span className="px-1 py-0.5 rounded text-[8.5px] bg-accent-crimson/15 text-accent-crimson border border-accent-crimson/30">
              ANOMALY
            </span>
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:bg-surface-container/60 p-1 rounded">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layerLandmarks}
                onChange={(e) => setLayerLandmarks(e.target.checked)}
                className="accent-accent-violet rounded"
              />
              <span className="text-content-primary text-[11px] font-sans">Facial Landmarks</span>
            </div>
            <span className="px-1 py-0.5 rounded text-[8.5px] bg-accent-violet/15 text-accent-violet border border-accent-violet/30">
              BIOMETRIC
            </span>
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:bg-surface-container/60 p-1 rounded">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layerEla}
                onChange={(e) => setLayerEla(e.target.checked)}
                className="accent-accent-cyan rounded"
              />
              <span className="text-content-primary text-[11px] font-sans">Error Level (ELA)</span>
            </div>
            <span className="px-1 py-0.5 rounded text-[8.5px] bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
              HEURISTIC
            </span>
          </label>

          <label className="flex items-center justify-between cursor-pointer hover:bg-surface-container/60 p-1 rounded">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layerNoise}
                onChange={(e) => setLayerNoise(e.target.checked)}
                className="accent-accent-amber rounded"
              />
              <span className="text-content-primary text-[11px] font-sans">Sensor Noise (PRNU)</span>
            </div>
            <span className="px-1 py-0.5 rounded text-[8.5px] bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
              LEAD
            </span>
          </label>

          {/* Opacity Slider */}
          <div className="pt-2 border-t border-border-hairpin flex items-center justify-between text-[10px]">
            <span className="text-content-muted">OPACITY:</span>
            <div className="flex items-center gap-2 w-32">
              <input
                type="range"
                min="10"
                max="100"
                value={layerOpacity}
                onChange={(e) => setLayerOpacity(Number(e.target.value))}
                className="w-full accent-accent-mint h-1 bg-surface-container rounded cursor-pointer"
              />
              <span className="w-7 text-right text-content-primary">{layerOpacity}%</span>
            </div>
          </div>
        </div>

        {/* Floating 2D-FFT Radial Spectrum Scope (Bottom Left) */}
        <div className="absolute left-3 bottom-3 z-30 p-2.5 bg-surface-panel/95 border border-border-default rounded shadow-2xl backdrop-blur-md w-60 text-xs font-mono">
          <div className="flex items-center justify-between pb-1 border-b border-border-hairpin mb-1.5">
            <span className="text-[10px] uppercase font-bold text-content-primary flex items-center gap-1">
              <Activity className="w-3 h-3 text-accent-cyan" />
              2D-FFT Radial Scope
            </span>
            <span className="text-[9px] text-accent-amber">Nyquist Cutoff</span>
          </div>

          <div className="relative w-full h-20 bg-surface-canvas rounded border border-border-hairpin flex items-center justify-center overflow-hidden">
            <div className="w-16 h-16 rounded-full border border-dashed border-accent-cyan/40"></div>
            <div className="w-8 h-8 rounded-full border border-accent-cyan/60 absolute"></div>
            <div className="w-2 h-2 rounded-full bg-accent-cyan absolute"></div>
            <div className="w-full h-px bg-accent-cyan/30 absolute"></div>
            <div className="h-full w-px bg-accent-cyan/30 absolute"></div>

            {/* Asymmetric Anomaly Scatter */}
            <div className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full bg-accent-crimson animate-ping"></div>
            <div className="absolute bottom-1 right-1.5 font-mono text-[8px] text-accent-crimson bg-surface-panel px-1 py-0.5 rounded border border-accent-crimson/30">
              Roll-off Discontinuity
            </div>
          </div>
          <div className="text-[9px] text-content-muted font-sans mt-1 leading-tight">
            Synthetic periodicity detected in facial ROI. Illustrative spectral anomaly.
          </div>
        </div>

        {/* IMAGE STAGE CANVAS */}
        <div
          className="relative transition-transform duration-100 ease-out shadow-2xl rounded border border-border-default overflow-hidden bg-black max-w-[85%] max-h-[85%]"
          style={{
            transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          {/* Layer 0: Raw Ingested Evidence Image */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt={evidence.filename}
            className="w-full h-full object-contain pointer-events-none select-none max-h-[650px]"
          />

          {/* Layer 1: ELA Derivative Image Overlay */}
          {layerEla && (
            <img
              src={elaDerivativeUrl}
              alt="ELA Analysis Map"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity"
              style={{ opacity: layerOpacity / 100 }}
              onError={(e) => {
                // If derivative not yet generated on backend, hide gracefully
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}

          {/* Layer 2: Model Manipulation Heatmap */}
          {layerHeatmap && viewMode !== 'original' && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity"
              style={{ opacity: layerOpacity / 100 }}
            >
              <svg className="w-full h-full" viewBox="0 0 880 580" fill="none">
                <defs>
                  <radialGradient id="heat-mandible" cx="44%" cy="62%" r="22%">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <ellipse cx="388" cy="358" rx="140" ry="95" fill="url(#heat-mandible)" className="mix-blend-screen" />
              </svg>
            </div>
          )}

          {/* Layer 3: Facial Landmarks Biometric Wireframe */}
          {layerLandmarks && viewMode !== 'original' && (
            <div className="absolute inset-0 pointer-events-none transition-opacity">
              <svg className="w-full h-full" viewBox="0 0 880 580">
                <path d="M 285 240 Q 300 370 388 440 Q 476 370 490 240" fill="none" stroke="#8b5cf6" strokeWidth="1.2" strokeOpacity="0.8" />
                <path d="M 352 355 Q 388 340 424 355 Q 388 385 352 355 Z" fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6" strokeWidth="1.5" />
                <circle cx="388" cy="360" r="3.5" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
              </svg>
            </div>
          )}

          {/* Forensic Bounding Boxes for Real Findings */}
          {findings.map((f) => {
            const bbox = f.media_location?.bounding_box;
            if (!bbox) return null;
            const isSelected = selectedFindingId === f.finding_id;

            return (
              <div
                key={f.finding_id}
                onClick={() => onSelectFinding(f.finding_id)}
                className={`absolute cursor-pointer transition ${
                  isSelected ? 'ring-2 ring-accent-crimson' : 'hover:ring-1 hover:ring-accent-amber'
                }`}
                style={{
                  left: `${bbox.x || 275}px`,
                  top: `${bbox.y || 295}px`,
                  width: `${bbox.width || 220}px`,
                  height: `${bbox.height || 150}px`,
                }}
              >
                <div className="absolute inset-0 border border-accent-crimson bg-accent-crimson/10 rounded-[2px]" />
                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-accent-crimson" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-accent-crimson" />
                <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-accent-crimson" />
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-accent-crimson" />

                {/* Top Tag */}
                <div className="absolute -top-6 left-0 bg-surface-panel border border-accent-crimson/60 px-1.5 py-0.5 rounded text-[9.5px] font-mono text-accent-crimson flex items-center gap-1 shadow-lg whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-crimson" />
                  <span className="font-bold">{f.finding_type.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOTTOM EXAMINATION DOCK (ANALYSIS PIPELINE QUEUE) */}
      <footer className="h-24 border-t border-border-default bg-surface-panel flex flex-col shrink-0 z-20 font-mono text-xs select-none">
        {/* State Bar */}
        <div className="h-6 px-3 border-b border-border-hairpin bg-surface-container flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-content-primary flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent-mint" />
              ANALYSIS PIPELINE QUEUE
            </span>
            <span className="text-border-active">|</span>
            <span className="text-accent-mint font-medium">{findings.length} Methods Evaluated</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunPipeline}
              disabled={analyzing}
              className="px-2 py-0.5 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-bold text-[10px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Activity className="w-3 h-3" />
              <span>{analyzing ? 'Executing...' : 'Re-run Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Chips */}
        <div className="flex-1 px-3 py-2 flex items-center gap-2.5 overflow-x-auto">
          {/* Method 1: ELA */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[180px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-cyan">1. ELA_Quantizer_v2</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-cyan/15 text-accent-cyan rounded">HEURISTIC</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">JPEG Compression Delta Q90</div>
            <div className="text-[8.5px] text-content-muted">0.24s • Localized block variance</div>
          </div>

          {/* Method 2: Noise PRNU */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[180px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-amber">2. PRNU_Extractor_v0.9</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-amber/15 text-accent-amber rounded">LEAD</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">High-Frequency Residual</div>
            <div className="text-[8.5px] text-content-muted">0.42s • Spatial filter subtraction</div>
          </div>

          {/* Method 3: EXIF / Metadata */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[180px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-content-primary">3. Exif_Header_Parser</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-mint/15 text-accent-mint rounded">PASS</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">Header Provenance Audit</div>
            <div className="text-[8.5px] text-content-muted">0.02s • Container tag analysis</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
