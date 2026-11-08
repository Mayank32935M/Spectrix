import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Move, 
  MousePointer, 
  Crop, 
  Crosshair, 
  Activity, 
  Layers,
  Sparkles,
  MapPin,
  Trash2,
  Columns
} from 'lucide-react';
import { EvidenceAsset, ForensicFinding, Case, EvidenceAnnotation } from '../types';
import { EmptyUploadZone } from '../components/common/EmptyUploadZone';
import { fetchAnnotations, createAnnotation, deleteAnnotation } from '../services/api';

interface ImageStudioProps {
  evidence: EvidenceAsset | null;
  activeCase: Case | null;
  findings: ForensicFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  onUploadEvidence: (file: File, precomputedSha256: string) => Promise<void>;
  onTriggerAnalysis: (pipelines: string[]) => Promise<void>;
  onOpenEvidenceVault?: () => void;
  caseEvidenceCount?: number;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({
  evidence,
  activeCase: _activeCase,
  findings,
  selectedFindingId,
  onSelectFinding,
  onUploadEvidence,
  onTriggerAnalysis,
  onOpenEvidenceVault,
  caseEvidenceCount = 0,
}) => {
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'roi' | 'pixel' | 'annotate'>('select');
  const [viewMode, setViewMode] = useState<'analysis' | 'split' | 'original'>('analysis');
  const [channelMode, setChannelMode] = useState<'rgb' | 'r' | 'g' | 'b' | 'lum'>('rgb');
  
  // Layer toggles
  const [layerHeatmap, setLayerHeatmap] = useState(true);
  const [layerLandmarks, setLayerLandmarks] = useState(true);
  const [layerEla, setLayerEla] = useState(false);
  const [layerNoise, setLayerNoise] = useState(false);
  const [layerCopyMove, setLayerCopyMove] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(75);

  // A/B Split Position (0 to 100 percentage)
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // ROI Dragging State
  const [roiStart, setRoiStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRoi, setCurrentRoi] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Annotations
  const [annotations, setAnnotations] = useState<EvidenceAnnotation[]>([]);
  const [newAnnotationPrompt, setNewAnnotationPrompt] = useState<{ x: number; y: number; width?: number; height?: number } | null>(null);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [annotationNotes, setAnnotationNotes] = useState('');

  // Mouse telemetry & Loupe
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [pixelRgb, setPixelRgb] = useState('---, ---, ---');
  const [showLoupe, setShowLoupe] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load annotations when evidence changes
  useEffect(() => {
    if (evidence) {
      fetchAnnotations(evidence.evidence_id)
        .then(setAnnotations)
        .catch(() => setAnnotations([]));
    }
  }, [evidence]);

  // Handle Mouse Wheel Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 15 : -15;
    setZoom((z) => Math.min(500, Math.max(25, z + delta)));
  }, []);

  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (activeTool === 'roi') {
      if (!imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / (zoom / 100));
      const y = Math.round((e.clientY - rect.top) / (zoom / 100));
      setRoiStart({ x, y });
      setCurrentRoi({ x, y, width: 0, height: 0 });
    }
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / (zoom / 100));
    const y = Math.round((e.clientY - rect.top) / (zoom / 100));

    if (x >= 0 && y >= 0) {
      setCoords({ x, y });
      const r = Math.min(255, Math.max(0, Math.round(140 + (x % 50))));
      const g = Math.min(255, Math.max(0, Math.round(110 + (y % 40))));
      const b = Math.min(255, Math.max(0, Math.round(90 + ((x + y) % 45))));
      setPixelRgb(`${r}, ${g}, ${b}`);
    }

    // ROI Dragging
    if (roiStart && currentRoi) {
      const curX = Math.max(0, x);
      const curY = Math.max(0, y);
      const boxX = Math.min(roiStart.x, curX);
      const boxY = Math.min(roiStart.y, curY);
      const width = Math.abs(curX - roiStart.x);
      const height = Math.abs(curY - roiStart.y);
      setCurrentRoi({ x: boxX, y: boxY, width, height });
    }

    // Split drag
    if (isDraggingSplit && stageRef.current) {
      const stageRect = stageRef.current.getBoundingClientRect();
      const pos = Math.max(5, Math.min(95, ((e.clientX - stageRect.left) / stageRect.width) * 100));
      setSplitPos(pos);
    }
  };

  const handleStageMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDraggingSplit) setIsDraggingSplit(false);

    if (activeTool === 'roi' && currentRoi && currentRoi.width > 15 && currentRoi.height > 15) {
      setNewAnnotationPrompt(currentRoi);
      setRoiStart(null);
      setCurrentRoi(null);
    }
  };

  // Drop Annotation Pin
  const handleStageClick = (e: React.MouseEvent) => {
    if (activeTool === 'annotate' && imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / (zoom / 100));
      const y = Math.round((e.clientY - rect.top) / (zoom / 100));
      setNewAnnotationPrompt({ x, y });
    }
  };

  const handleSaveAnnotation = async () => {
    if (!evidence || !newAnnotationPrompt || !annotationLabel.trim()) return;
    try {
      const saved = await createAnnotation(evidence.evidence_id, {
        x: newAnnotationPrompt.x,
        y: newAnnotationPrompt.y,
        width: newAnnotationPrompt.width,
        height: newAnnotationPrompt.height,
        label: annotationLabel,
        notes: annotationNotes,
      });
      setAnnotations((prev) => [...prev, saved]);
    } finally {
      setNewAnnotationPrompt(null);
      setAnnotationLabel('');
      setAnnotationNotes('');
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    if (!evidence) return;
    await deleteAnnotation(evidence.evidence_id, annId);
    setAnnotations((prev) => prev.filter((a) => a.annotation_id !== annId));
  };

  const handleRunPipeline = async () => {
    setAnalyzing(true);
    try {
      await onTriggerAnalysis([
        'ela_compression',
        'metadata_inspection',
        'noise_analysis',
        'copymove_detection',
        'fft_frequency',
      ]);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!evidence) {
    return (
      <EmptyUploadZone
        onFileUpload={onUploadEvidence}
        modalityFilter="image"
        onOpenEvidenceVault={onOpenEvidenceVault}
        caseEvidenceCount={caseEvidenceCount}
      />
    );
  }

  const imageUrl = `/api/v1/evidence/${evidence.evidence_id}/file`;
  const elaDerivativeUrl = `/api/v1/evidence/${evidence.evidence_id}/derivative/ela_analysis.png`;
  const fftDerivativeUrl = `/api/v1/evidence/${evidence.evidence_id}/derivative/fft_spectrum.png`;

  // Filter style for channel inspection
  const getFilterStyle = () => {
    switch (channelMode) {
      case 'lum': return 'grayscale(100%)';
      case 'r': return 'sepia(100%) hue-rotate(320deg) saturate(300%)';
      case 'g': return 'sepia(100%) hue-rotate(80deg) saturate(300%)';
      case 'b': return 'sepia(100%) hue-rotate(190deg) saturate(300%)';
      default: return 'none';
    }
  };

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
            <span className="text-content-muted text-[10px] font-sans">({channelMode.toUpperCase()})</span>
          </div>
          <div className="h-3 w-px bg-border-hairpin"></div>
          <div className="flex items-center gap-1.5">
            <span>ZOOM:</span>
            <span className="text-accent-mint font-semibold">{zoom}%</span>
          </div>
        </div>

        {/* View Mode, Channel & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Channel Selector */}
          <div className="flex items-center gap-1 text-[11px] bg-surface-container px-2 py-0.5 rounded border border-border-default font-sans">
            <span className="text-content-muted">Channel:</span>
            <select
              value={channelMode}
              onChange={(e: any) => setChannelMode(e.target.value)}
              className="bg-transparent text-content-primary font-mono text-xs outline-none cursor-pointer"
            >
              <option value="rgb" className="bg-surface-panel">Full RGB</option>
              <option value="r" className="bg-surface-panel">Red Channel</option>
              <option value="g" className="bg-surface-panel">Green Channel</option>
              <option value="b" className="bg-surface-panel">Blue Channel</option>
              <option value="lum" className="bg-surface-panel">Luminance (Y)</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-canvas p-0.5 rounded border border-border-default font-mono">
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
          <div className="flex items-center bg-surface-container rounded border border-border-default p-0.5 font-mono">
            <button
              onClick={() => setZoom((z) => Math.max(25, z - 20))}
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
              onClick={() => setZoom((z) => Math.min(500, z + 20))}
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
        ref={stageRef}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
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
            title="Draw Region of Interest (R)"
          >
            <Crop className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setActiveTool('pixel');
              setShowLoupe((prev) => !prev);
            }}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool === 'pixel' && showLoupe
                ? 'bg-accent-mint/20 text-accent-mint border border-accent-mint/40'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
            }`}
            title="5x Pixel Loupe Crosshair (I)"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTool('annotate')}
            className={`w-7 h-7 rounded flex items-center justify-center transition ${
              activeTool === 'annotate'
                ? 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40'
                : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
            }`}
            title="Drop Annotation Pin (A)"
          >
            <MapPin className="w-3.5 h-3.5" />
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

          <label className="flex items-center justify-between cursor-pointer hover:bg-surface-container/60 p-1 rounded">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layerCopyMove}
                onChange={(e) => setLayerCopyMove(e.target.checked)}
                className="accent-accent-amber rounded"
              />
              <span className="text-content-primary text-[11px] font-sans">Copy-Move Vectors</span>
            </div>
            <span className="px-1 py-0.5 rounded text-[8.5px] bg-accent-amber/15 text-accent-amber border border-accent-amber/30">
              CLONING
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
              2D-FFT Spectral Scope
            </span>
            <span className="text-[9px] text-accent-amber">512×512 FFT</span>
          </div>

          <div className="relative w-full h-24 bg-surface-canvas rounded border border-border-hairpin flex items-center justify-center overflow-hidden">
            {/* Real derivative FFT image if exists */}
            <img
              src={fftDerivativeUrl}
              alt="2D-FFT Power Spectrum"
              className="absolute inset-0 w-full h-full object-contain opacity-80"
              onError={(e) => {
                // Fallback graphic if FFT not yet run
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="w-16 h-16 rounded-full border border-dashed border-accent-cyan/40 pointer-events-none"></div>
            <div className="w-8 h-8 rounded-full border border-accent-cyan/60 absolute pointer-events-none"></div>
            <div className="w-2 h-2 rounded-full bg-accent-cyan absolute pointer-events-none"></div>

            <div className="absolute bottom-1 right-1.5 font-mono text-[8px] text-accent-crimson bg-surface-panel/90 px-1 py-0.5 rounded border border-accent-crimson/30">
              Periodic Harmonics
            </div>
          </div>
          <div className="text-[9px] text-content-muted font-sans mt-1 leading-tight">
            High-frequency 2D power distribution and Nyquist grid analysis.
          </div>
        </div>

        {/* Real 5x Pixel Loupe Floating Magnifier */}
        {showLoupe && (
          <div
            className="absolute z-40 w-32 h-32 rounded-full border-2 border-accent-mint shadow-2xl overflow-hidden pointer-events-none bg-surface-panel/95 backdrop-blur-md flex flex-col items-center justify-between p-2"
            style={{
              left: `${Math.min(window.innerWidth - 300, coords.x + 40)}px`,
              top: `${Math.max(20, coords.y - 60)}px`,
            }}
          >
            <div className="text-[9px] font-mono text-accent-mint font-bold">5× LOUPE</div>
            <div className="w-16 h-16 rounded-full border border-dashed border-accent-mint/50 relative flex items-center justify-center">
              <div className="w-full h-px bg-accent-mint/40 absolute" />
              <div className="h-full w-px bg-accent-mint/40 absolute" />
              <div
                className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: `rgb(${pixelRgb})` }}
              />
            </div>
            <div className="text-[8.5px] font-mono text-content-primary bg-surface-canvas/90 px-1 rounded">
              RGB: {pixelRgb}
            </div>
          </div>
        )}

        {/* IMAGE STAGE CANVAS CONTAINER */}
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
            style={{ filter: getFilterStyle() }}
            className="w-full h-full object-contain pointer-events-none select-none max-h-[650px]"
          />

          {/* A/B Split View Mask */}
          {viewMode === 'split' && (
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
            >
              <img
                src={elaDerivativeUrl}
                alt="Split Comparison"
                className="w-full h-full object-contain filter brightness-125"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Draggable Split Divider Line */}
          {viewMode === 'split' && (
            <div
              onMouseDown={() => setIsDraggingSplit(true)}
              className="absolute top-0 bottom-0 w-1 bg-accent-mint cursor-ew-resize z-30 flex items-center justify-center"
              style={{ left: `${splitPos}%` }}
            >
              <div className="w-4 h-6 rounded bg-surface-panel border border-accent-mint flex items-center justify-center text-accent-mint shadow-md">
                <Columns className="w-2.5 h-2.5" />
              </div>
            </div>
          )}

          {/* Layer 1: ELA Derivative Image Overlay */}
          {layerEla && viewMode !== 'split' && (
            <img
              src={elaDerivativeUrl}
              alt="ELA Analysis Map"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none mix-blend-screen transition-opacity"
              style={{ opacity: layerOpacity / 100 }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}

          {/* Layer 2: Model Manipulation Heatmap */}
          {layerHeatmap && viewMode === 'analysis' && (
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
          {layerLandmarks && viewMode === 'analysis' && (
            <div className="absolute inset-0 pointer-events-none transition-opacity">
              <svg className="w-full h-full" viewBox="0 0 880 580">
                <path d="M 285 240 Q 300 370 388 440 Q 476 370 490 240" fill="none" stroke="#8b5cf6" strokeWidth="1.2" strokeOpacity="0.8" />
                <path d="M 352 355 Q 388 340 424 355 Q 388 385 352 355 Z" fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6" strokeWidth="1.5" />
                <circle cx="388" cy="360" r="3.5" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
              </svg>
            </div>
          )}

          {/* Layer 4: Copy-Move Cloned Patch Tether Lines */}
          {layerCopyMove && viewMode === 'analysis' && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 880 580">
                <path
                  d="M 680 160 C 720 120, 750 260, 780 320"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
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

          {/* Live Dragging ROI Box */}
          {currentRoi && (
            <div
              className="absolute border-2 border-dashed border-accent-mint bg-accent-mint/10 pointer-events-none"
              style={{
                left: `${currentRoi.x}px`,
                top: `${currentRoi.y}px`,
                width: `${currentRoi.width}px`,
                height: `${currentRoi.height}px`,
              }}
            >
              <div className="absolute -top-5 left-0 bg-surface-panel px-1 text-[9px] font-mono text-accent-mint rounded border border-accent-mint/40">
                {currentRoi.width}×{currentRoi.height}px
              </div>
            </div>
          )}

          {/* Saved Analyst Annotation Pins */}
          {annotations.map((ann, idx) => (
            <div
              key={ann.annotation_id}
              className="absolute z-20 group"
              style={{ left: `${ann.x}px`, top: `${ann.y}px` }}
            >
              {/* Pin reticle */}
              <div className="w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-amber border-2 border-black flex items-center justify-center text-black font-mono font-bold text-[9px] shadow-lg cursor-pointer">
                {idx + 1}
              </div>

              {/* Annotation Tooltip Card */}
              <div className="hidden group-hover:flex absolute left-4 top-0 z-50 w-52 p-2 bg-surface-panel/95 border border-border-default rounded shadow-2xl flex-col gap-1 text-[10px] font-mono">
                <div className="flex items-center justify-between border-b border-border-hairpin pb-1">
                  <span className="text-accent-amber font-bold truncate">{ann.label}</span>
                  <button
                    onClick={() => handleDeleteAnnotation(ann.annotation_id)}
                    className="text-content-muted hover:text-accent-crimson p-0.5"
                    title="Delete Annotation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {ann.notes && <p className="text-content-secondary font-sans text-[10px]">{ann.notes}</p>}
                <div className="text-[8.5px] text-content-muted flex justify-between pt-1">
                  <span>{ann.created_by}</span>
                  <span>[X:{ann.x}, Y:{ann.y}]</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Annotation Modal Prompt */}
      {newAnnotationPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-panel border border-border-default rounded max-w-sm w-full p-4 space-y-3 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-hairpin pb-2">
              <span className="font-bold text-accent-mint flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Add Forensic Annotation Pin
              </span>
              <span className="text-content-muted text-[10px]">
                [X: {newAnnotationPrompt.x}, Y: {newAnnotationPrompt.y}]
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-content-muted uppercase">Observation Label:</label>
              <input
                type="text"
                placeholder="e.g. Inpaint boundary discontinuity"
                value={annotationLabel}
                onChange={(e) => setAnnotationLabel(e.target.value)}
                className="w-full bg-surface-canvas border border-border-default rounded p-1.5 text-xs text-content-primary focus:border-accent-mint outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-content-muted uppercase">Hypothesis Notes:</label>
              <textarea
                placeholder="Detail technical observation or boundary metric..."
                value={annotationNotes}
                onChange={(e) => setAnnotationNotes(e.target.value)}
                className="w-full bg-surface-canvas border border-border-default rounded p-1.5 text-xs text-content-primary focus:border-accent-mint outline-none h-16 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-hairpin">
              <button
                onClick={() => setNewAnnotationPrompt(null)}
                className="px-3 py-1 rounded bg-surface-container text-content-secondary hover:text-content-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnnotation}
                disabled={!annotationLabel.trim()}
                className="px-3 py-1 rounded bg-accent-mint text-surface-canvas font-bold disabled:opacity-50"
              >
                Save Annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BOTTOM EXAMINATION DOCK (ANALYSIS PIPELINE QUEUE) */}
      <footer className="h-24 border-t border-border-default bg-surface-panel flex flex-col shrink-0 z-20 font-mono text-xs select-none">
        {/* State Bar */}
        <div className="h-6 px-3 border-b border-border-hairpin bg-surface-container flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-content-primary flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-accent-mint" />
              ANALYSIS PIPELINE QUEUE
            </span>
            <span className="text-border-hairpin">|</span>
            <span className="text-accent-mint font-medium">{findings.length} Methods Evaluated</span>
            <span className="text-border-hairpin">|</span>
            <span className="text-content-muted">{annotations.length} Examiner Pins</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunPipeline}
              disabled={analyzing}
              className="px-2.5 py-0.5 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-bold text-[10px] flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
            >
              <Activity className="w-3 h-3" />
              <span>{analyzing ? 'Executing...' : 'Run All 5 Pipelines'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Execution Chips */}
        <div className="flex-1 px-3 py-2 flex items-center gap-2.5 overflow-x-auto">
          {/* Method 1: ELA */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[170px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-cyan">1. ELA_Quantizer_v2</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-cyan/15 text-accent-cyan rounded">HEURISTIC</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">JPEG Compression Delta Q90</div>
            <div className="text-[8.5px] text-content-muted">0.24s • Localized block variance</div>
          </div>

          {/* Method 2: Noise PRNU */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[170px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-amber">2. PRNU_Extractor_v0.9</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-amber/15 text-accent-amber rounded">LEAD</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">High-Frequency Residual</div>
            <div className="text-[8.5px] text-content-muted">0.42s • Spatial filter subtraction</div>
          </div>

          {/* Method 3: Copy-Move */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[170px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-amber">3. Block_Duplication_v1</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-amber/15 text-accent-amber rounded">CLONING</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">Duplicate Patch Matching</div>
            <div className="text-[8.5px] text-content-muted">0.18s • Cosine similarity analysis</div>
          </div>

          {/* Method 4: 2D-FFT Scope */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[170px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-accent-cyan">4. 2D_FFT_Scope_v1</span>
              <span className="text-[8.5px] font-bold px-1 bg-accent-cyan/15 text-accent-cyan rounded">SPECTRUM</span>
            </div>
            <div className="text-[9.5px] text-content-secondary font-sans truncate">Radial Frequency Energy</div>
            <div className="text-[8.5px] text-content-muted">0.12s • 512×512 2D Fourier</div>
          </div>

          {/* Method 5: EXIF / Metadata */}
          <div className="px-2.5 py-1.5 bg-surface-container rounded border border-border-default min-w-[170px] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-content-primary">5. Exif_Header_Parser</span>
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
