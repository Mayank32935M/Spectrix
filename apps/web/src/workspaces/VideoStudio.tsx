import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MousePointer,
  Move,
  Crop,
  Search,
  MapPin,
  Clock,
  Film,
  AudioWaveform,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Info,
  ShieldCheck,
  UserCheck,
  Trash2
} from 'lucide-react';
import { EvidenceAsset, ForensicFinding, Case, EvidenceAnnotation } from '../types';
import { EmptyUploadZone } from '../components/common/EmptyUploadZone';
import { fetchAnnotations, createAnnotation, deleteAnnotation } from '../services/api';

interface VideoStudioProps {
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

export const VideoStudio: React.FC<VideoStudioProps> = ({
  evidence,
  activeCase,
  findings,
  selectedFindingId,
  onSelectFinding,
  onUploadEvidence,
  onTriggerAnalysis,
  onOpenEvidenceVault,
  caseEvidenceCount = 0,
}) => {
  // Video element and playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(74.6); // default to ~00:01:14:18 for demonstration
  const [duration, setDuration] = useState<number>(168.0); // 00:02:48:00
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [fps] = useState<number>(29.97);
  const [isLoopingAB, setIsLoopingAB] = useState<boolean>(false);
  const [loopRange, setLoopRange] = useState<[number, number]>([72.0, 75.0]); // 00:01:12 to 00:01:15

  // Modes & Tools
  const [studioMode, setStudioMode] = useState<'analysis' | 'split' | 'raw'>('analysis');
  const [splitPosition] = useState<number>(50);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'roi' | 'loupe' | 'pin'>('select');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Overlays
  const [showHeat, setShowHeat] = useState<boolean>(true);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [showJitter, setShowJitter] = useState<boolean>(true);
  const [showViseme, setShowViseme] = useState<boolean>(true);
  const [showTracking, setShowTracking] = useState<boolean>(true);

  // Inspector Tabs
  const [inspectorTab, setInspectorTab] = useState<'findings' | 'metadata' | 'roi'>('findings');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Annotations
  const [annotations, setAnnotations] = useState<EvidenceAnnotation[]>([]);
  const [annotationNote, setAnnotationNote] = useState<string>(
    'Boundary discontinuity indicates selective GAN inpainting / lip retargeting rather than full-head diffusion.'
  );
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Loupe position
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Format Helpers
  const formatSMPTE = useCallback((seconds: number, frameRate: number = 29.97): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00:00';
    const totalFrames = Math.floor(seconds * frameRate);
    const ff = Math.floor(totalFrames % frameRate);
    const totalSecs = Math.floor(seconds);
    const ss = totalSecs % 60;
    const mm = Math.floor(totalSecs / 60) % 60;
    const hh = Math.floor(totalSecs / 3600);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  }, []);

  const currentFrame = Math.floor(currentTime * fps);
  const totalFrames = Math.floor(duration * fps);

  // Load annotations when evidence changes
  useEffect(() => {
    if (evidence) {
      fetchAnnotations(evidence.evidence_id)
        .then(setAnnotations)
        .catch(console.error);
    }
  }, [evidence]);

  // Video timeupdate listener
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Handle A/B Loop
      if (isLoopingAB && (cur < loopRange[0] || cur >= loopRange[1])) {
        videoRef.current.currentTime = loopRange[0];
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  // Playback actions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stepFrame = useCallback((deltaFrames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const target = Math.max(0, Math.min(duration, currentTime + deltaFrames / fps));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  }, [currentTime, duration, fps]);

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    const safeTarget = Math.max(0, Math.min(duration, seconds));
    videoRef.current.currentTime = safeTarget;
    setCurrentTime(safeTarget);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Keyboard navigation (J/K/L, Space, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepFrame(e.shiftKey ? -10 : -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepFrame(e.shiftKey ? 10 : 1);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          stepFrame(-30);
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          stepFrame(30);
          break;
        case 'i':
        case 'I':
          setLoopRange([currentTime, loopRange[1]]);
          break;
        case 'o':
        case 'O':
          setLoopRange([loopRange[0], currentTime]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepFrame, currentTime, loopRange]);

  // Timeline Scrubber dragging
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = x / rect.width;
    seekTo(pct * duration);
  };

  // Commit Annotation Note
  const handleCommitNote = async () => {
    if (!evidence || !activeCase || !annotationNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      const created = await createAnnotation(evidence.evidence_id, {
        x: currentFrame,
        y: Math.round(currentTime * 1000),
        label: `Frame #${currentFrame}`,
        notes: annotationNote.trim(),
        created_by: activeCase.examiner_name || 'Dr. E. Vance'
      });
      setAnnotations(prev => [...prev, created]);
      setAnnotationNote('');
    } catch (err) {
      console.error('Failed to commit note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (annotationId: string) => {
    if (!evidence) return;
    try {
      await deleteAnnotation(evidence.evidence_id, annotationId);
      setAnnotations(prev => prev.filter(a => a.annotation_id !== annotationId));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const copyDigest = () => {
    if (!evidence) return;
    navigator.clipboard.writeText(evidence.sha256_digest);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Filter video findings
  const videoFindings = findings.filter(f => f.modality === 'video' || f.evidence_id === evidence?.evidence_id);

  if (!evidence) {
    return (
      <EmptyUploadZone
        onFileUpload={onUploadEvidence}
        modalityFilter="video"
        onOpenEvidenceVault={onOpenEvidenceVault}
        caseEvidenceCount={caseEvidenceCount}
      />
    );
  }

  const videoUrl = `/api/v1/evidence/${evidence.evidence_id}/file`;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0a0e16] text-[#e2e8f0] overflow-hidden select-none">
      {/* ==================== WORKSPACE HEADER / TELEMETRY ==================== */}
      <div className="h-9 bg-[#111722] border-b border-[#1c2433] px-3 flex items-center justify-between font-mono text-[11px] shrink-0 z-30">
        {/* Left: Timecode, Frame, Resolution */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b]">TC:</span>
            <span className="text-[#38bdf8] font-bold tracking-wider">{formatSMPTE(currentTime, fps)}</span>
          </div>
          <span className="text-[#253043]">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748b]">FRM:</span>
            <span className="text-[#e2e8f0] font-semibold">{String(currentFrame).padStart(6, '0')}</span>
            <span className="text-[#64748b]">/ {String(totalFrames).padStart(6, '0')}</span>
          </div>
          <span className="text-[#253043]">|</span>
          <span className="text-[#94a3b8] text-[10px]">1920×1080 | 29.970 FPS (CFR) | H.264 (avc1)</span>
        </div>

        {/* Center: Mode Switcher */}
        <div className="flex items-center bg-[#090d14] p-0.5 rounded-[4px] border border-[#1c2433]">
          <button
            onClick={() => setStudioMode('analysis')}
            className={`px-2.5 py-0.5 text-[10px] rounded-[3px] transition-colors ${
              studioMode === 'analysis'
                ? 'bg-[#1f2737] text-[#35c6a0] font-semibold border border-[#35c6a0]/30 shadow-sm'
                : 'text-[#64748b] hover:text-[#e2e8f0]'
            }`}
          >
            Analysis Overlays
          </button>
          <button
            onClick={() => setStudioMode('split')}
            className={`px-2.5 py-0.5 text-[10px] rounded-[3px] transition-colors ${
              studioMode === 'split'
                ? 'bg-[#1f2737] text-[#38bdf8] font-semibold border border-[#38bdf8]/30 shadow-sm'
                : 'text-[#64748b] hover:text-[#e2e8f0]'
            }`}
          >
            A/B Split
          </button>
          <button
            onClick={() => setStudioMode('raw')}
            className={`px-2.5 py-0.5 text-[10px] rounded-[3px] transition-colors ${
              studioMode === 'raw'
                ? 'bg-[#1f2737] text-[#e2e8f0] font-semibold border border-[#e2e8f0]/30 shadow-sm'
                : 'text-[#64748b] hover:text-[#e2e8f0]'
            }`}
          >
            Raw Evidence
          </button>
        </div>

        {/* Right: Zoom & Alerts */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#171d29] px-2 py-0.5 rounded-[4px] border border-[#1c2433]">
            <span className="text-[#64748b] text-[10px]">ZOOM:</span>
            <span className="text-[#35c6a0] font-semibold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(100)}
              className="text-[#64748b] hover:text-white px-1 text-[10px]"
            >
              FIT
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 25, 250))}
              className="text-[#64748b] hover:text-white px-0.5"
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 25, 50))}
              className="text-[#64748b] hover:text-white px-0.5"
            >
              -
            </button>
          </div>

          {/* Anomaly Alert Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f43f5e]/15 border border-[#f43f5e]/40 rounded-[3px] text-[#f43f5e] text-[10px] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse"></span>
            <span>ALERT: MESH DEFORMATION</span>
          </div>
        </div>
      </div>

      {/* ==================== MAIN STAGE & TIMELINE GRID ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Work Area: Viewport + Multi-Track Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#090d14] border-r border-[#1c2433] overflow-hidden">
          {/* VIDEO STAGE VIEWPORT */}
          <div
            ref={containerRef}
            className="relative flex-1 bg-[#070a10] flex items-center justify-center overflow-hidden p-3"
            onMouseMove={(e) => {
              if (activeTool === 'loupe') {
                const rect = containerRef.current?.getBoundingClientRect();
                if (rect) {
                  setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                }
              }
            }}
            onMouseLeave={() => setMousePos(null)}
          >
            {/* FLOATING LEFT TOOL PALETTE */}
            <div className="absolute left-4 top-4 z-30 flex flex-col gap-1 p-1 bg-[#111722]/95 border border-[#1c2433] rounded-[4px] shadow-2xl backdrop-blur-sm">
              <button
                onClick={() => setActiveTool('select')}
                className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors ${
                  activeTool === 'select'
                    ? 'bg-[#35c6a0]/20 text-[#35c6a0]'
                    : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#171d29]'
                }`}
                title="Select Pointer (V)"
              >
                <MousePointer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('pan')}
                className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors ${
                  activeTool === 'pan'
                    ? 'bg-[#35c6a0]/20 text-[#35c6a0]'
                    : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#171d29]'
                }`}
                title="Pan Hand (H)"
              >
                <Move className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('roi')}
                className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors ${
                  activeTool === 'roi'
                    ? 'bg-[#35c6a0]/20 text-[#35c6a0]'
                    : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#171d29]'
                }`}
                title="ROI Box (R)"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
              <div className="h-px bg-[#1c2433] my-0.5"></div>
              <button
                onClick={() => setActiveTool('loupe')}
                className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors ${
                  activeTool === 'loupe'
                    ? 'bg-[#38bdf8]/20 text-[#38bdf8]'
                    : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#171d29]'
                }`}
                title="Pixel Loupe 5x (Z)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('pin')}
                className={`w-7 h-7 flex items-center justify-center rounded-[3px] transition-colors ${
                  activeTool === 'pin'
                    ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                    : 'text-[#64748b] hover:text-[#e2e8f0] hover:bg-[#171d29]'
                }`}
                title="Annotation Pin (P)"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* FLOATING TOP-RIGHT OVERLAYS TOGGLE PILL */}
            {studioMode !== 'raw' && (
              <div className="absolute right-4 top-4 z-30 flex flex-col gap-1 p-2 bg-[#111722]/95 border border-[#1c2433] rounded-[4px] shadow-2xl backdrop-blur-sm text-[10px] font-mono">
                <div className="text-[9px] uppercase tracking-wider text-[#64748b] font-semibold pb-1 border-b border-[#1c2433]">
                  Forensic Overlays
                </div>
                <label className="flex items-center justify-between gap-3 px-1 py-0.5 rounded cursor-pointer hover:bg-[#171d29] text-[#f43f5e]">
                  <span>Manipulation Heat</span>
                  <input
                    type="checkbox"
                    checked={showHeat}
                    onChange={e => setShowHeat(e.target.checked)}
                    className="rounded bg-[#171d29] border-[#1c2433] text-[#f43f5e] focus:ring-0 w-3 h-3"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 px-1 py-0.5 rounded cursor-pointer hover:bg-[#171d29] text-[#a855f7]">
                  <span>Landmark Mesh (68pt)</span>
                  <input
                    type="checkbox"
                    checked={showMesh}
                    onChange={e => setShowMesh(e.target.checked)}
                    className="rounded bg-[#171d29] border-[#1c2433] text-[#a855f7] focus:ring-0 w-3 h-3"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 px-1 py-0.5 rounded cursor-pointer hover:bg-[#171d29] text-[#f59e0b]">
                  <span>Temporal Jitter</span>
                  <input
                    type="checkbox"
                    checked={showJitter}
                    onChange={e => setShowJitter(e.target.checked)}
                    className="rounded bg-[#171d29] border-[#1c2433] text-[#f59e0b] focus:ring-0 w-3 h-3"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 px-1 py-0.5 rounded cursor-pointer hover:bg-[#171d29] text-[#38bdf8]">
                  <span>Viseme Decouple</span>
                  <input
                    type="checkbox"
                    checked={showViseme}
                    onChange={e => setShowViseme(e.target.checked)}
                    className="rounded bg-[#171d29] border-[#1c2433] text-[#38bdf8] focus:ring-0 w-3 h-3"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 px-1 py-0.5 rounded cursor-pointer hover:bg-[#171d29] text-[#c084fc]">
                  <span>Face Tracking Box</span>
                  <input
                    type="checkbox"
                    checked={showTracking}
                    onChange={e => setShowTracking(e.target.checked)}
                    className="rounded bg-[#171d29] border-[#1c2433] text-[#c084fc] focus:ring-0 w-3 h-3"
                  />
                </label>
              </div>
            )}

            {/* MAIN VIDEO FRAME & FORENSIC SVG OVERLAYS */}
            <div
              className="relative w-full max-w-[1100px] aspect-video bg-black rounded-[2px] border border-[#1c2433] shadow-2xl overflow-hidden flex items-center justify-center"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
            >
              {/* HTML5 Video Element */}
              <video
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain pointer-events-auto"
                playsInline
              />

              {/* A/B Split Line (if Split Mode Active) */}
              {studioMode === 'split' && (
                <div
                  className="absolute inset-0 pointer-events-none z-20"
                  style={{
                    clipPath: `polygon(${splitPosition}% 0, 100% 0, 100% 100%, ${splitPosition}% 100%)`,
                  }}
                >
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#090d14]/80 text-[#38bdf8] border border-[#38bdf8]/40 rounded text-[9px] font-mono">
                    RAW EVIDENCE (RIGHT)
                  </div>
                </div>
              )}

              {/* FORENSIC SVG OVERLAYS (Analysis Mode) */}
              {studioMode !== 'raw' && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  preserveAspectRatio="none"
                  viewBox="0 0 1650 928"
                  style={
                    studioMode === 'split'
                      ? { clipPath: `polygon(0 0, ${splitPosition}% 0, ${splitPosition}% 100%, 0 100%)` }
                      : undefined
                  }
                >
                  <defs>
                    <radialGradient id="jawHeatGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.65" />
                      <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                    </radialGradient>
                    <pattern id="telemetrySub" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="0.75" />
                    </pattern>
                  </defs>

                  <rect width="1650" height="928" fill="url(#telemetrySub)" opacity="0.4" />

                  {/* Target Crosshairs over Center Face */}
                  <circle cx="800" cy="225" r="14" fill="none" stroke="#35c6a0" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.7" />
                  <line x1="780" y1="225" x2="820" y2="225" stroke="#35c6a0" strokeWidth="0.75" opacity="0.7" />
                  <line x1="800" y1="205" x2="800" y2="245" stroke="#35c6a0" strokeWidth="0.75" opacity="0.7" />

                  {/* LAYER 1: FACE TRACKING BOUNDING BOX */}
                  {showTracking && (
                    <g id="layer-tracking-box">
                      <rect x="685" y="70" width="230" height="300" rx="3" fill="none" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.85" />
                      {/* Corner Tick Accents */}
                      <path d="M 685 95 L 685 70 L 710 70" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                      <path d="M 890 70 L 915 70 L 915 95" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                      <path d="M 685 345 L 685 370 L 710 370" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                      <path d="M 890 370 L 915 370 L 915 345" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                      <rect x="685" y="48" width="225" height="18" rx="2" fill="#111722" stroke="#a855f7" strokeWidth="1" />
                      <text x="692" y="61" fill="#c084fc" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600">
                        ROI: FACIAL_CONTOUR [FRAME {String(currentFrame).padStart(6, '0')}]
                      </text>
                    </g>
                  )}

                  {/* LAYER 2: 68-PT LANDMARK MESH */}
                  {showMesh && (
                    <g id="layer-landmark-mesh" fill="none" stroke="#a855f7" strokeWidth="0.8" opacity="0.8">
                      {/* Left Eye & Brow */}
                      <polygon points="735,160 755,152 775,155 760,165" />
                      {/* Right Eye & Brow */}
                      <polygon points="815,155 835,152 855,160 835,165" />
                      {/* Left Eye Contour */}
                      <polygon points="745,178 762,174 778,180 762,185" />
                      {/* Right Eye Contour */}
                      <polygon points="815,180 830,174 848,178 830,185" />
                      {/* Nose Bridge */}
                      <polyline points="795,165 795,215 780,238 808,238 795,215" />
                      {/* Mouth Outer Contour */}
                      <polygon points="765,270 782,264 796,265 810,264 827,270 812,285 796,287 780,285" />
                      {/* Landmark Points */}
                      <circle cx="745" cy="178" r="1.8" fill="#a855f7" />
                      <circle cx="778" cy="180" r="1.8" fill="#a855f7" />
                      <circle cx="815" cy="180" r="1.8" fill="#a855f7" />
                      <circle cx="848" cy="178" r="1.8" fill="#a855f7" />
                      <circle cx="795" cy="238" r="1.8" fill="#a855f7" />
                      <circle cx="796" cy="265" r="1.8" fill="#a855f7" />
                      <circle cx="796" cy="287" r="1.8" fill="#a855f7" />
                    </g>
                  )}

                  {/* LAYER 3: MANIPULATION HEATMAP & RESIDUAL */}
                  {showHeat && (
                    <g id="layer-manipulation-heat">
                      <ellipse cx="796" cy="300" rx="65" ry="42" fill="url(#jawHeatGrad)" />
                      <path
                        d="M 740 270 Q 796 295 850 270 Q 840 345 796 355 Q 750 345 740 270 Z"
                        fill="rgba(244, 63, 94, 0.12)"
                        stroke="#f43f5e"
                        strokeWidth="1.4"
                        strokeDasharray="4 3"
                      />
                      <rect x="825" y="350" width="150" height="18" rx="2" fill="#090d14" stroke="#f43f5e" strokeWidth="0.8" />
                      <circle cx="834" cy="359" r="2.5" fill="#f43f5e" />
                      <text x="842" y="363" fill="#f43f5e" fontFamily="JetBrains Mono" fontSize="8.5" fontWeight="600">
                        LR ~ 10^3.6 (MANDIBULAR)
                      </text>
                    </g>
                  )}

                  {/* LAYER 4: TEMPORAL JITTER VECTORS */}
                  {showJitter && (
                    <g id="layer-temporal-jitter" stroke="#f59e0b" strokeWidth="1.2">
                      <line x1="750" y1="300" x2="736" y2="318" />
                      <circle cx="736" cy="318" r="1.8" fill="#f59e0b" />
                      <line x1="770" y1="320" x2="758" y2="340" />
                      <circle cx="758" cy="340" r="1.8" fill="#f59e0b" />
                      <line x1="825" y1="320" x2="838" y2="340" />
                      <circle cx="838" cy="340" r="1.8" fill="#f59e0b" />
                    </g>
                  )}

                  {/* LAYER 5: VISEME SYNC HUD MARKER */}
                  {showViseme && (
                    <g id="layer-viseme-sync">
                      <rect x="705" y="348" width="95" height="18" rx="2" fill="#111722" stroke="#38bdf8" strokeWidth="0.8" />
                      <text x="710" y="360" fill="#38bdf8" fontFamily="JetBrains Mono" fontSize="8" fontWeight="500">
                        OFFSET: -180ms
                      </text>
                    </g>
                  )}
                </svg>
              )}

              {/* 5X PIXEL LOUPE (When Loupe Tool Active) */}
              {activeTool === 'loupe' && mousePos && (
                <div
                  className="absolute pointer-events-none z-40 w-32 h-32 rounded-full border-2 border-[#38bdf8] bg-black/90 shadow-2xl overflow-hidden flex flex-col items-center justify-center text-[9px] font-mono text-[#38bdf8]"
                  style={{
                    left: `${mousePos.x - 64}px`,
                    top: `${mousePos.y - 64}px`,
                  }}
                >
                  <div className="w-full h-full flex items-center justify-center relative">
                    <div className="w-px h-full bg-[#38bdf8]/40 absolute" />
                    <div className="h-px w-full bg-[#38bdf8]/40 absolute" />
                    <span className="bg-[#090d14]/80 px-1 py-0.5 rounded border border-[#38bdf8]/30">5.0x ZOOM</span>
                  </div>
                </div>
              )}
            </div>

            {/* FLOATING BOTTOM TRANSPORT DOCK */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#111722]/95 border border-[#1c2433] px-3 py-1.5 rounded-[4px] shadow-2xl backdrop-blur-sm">
              {/* Prev Keyframe */}
              <button
                onClick={() => stepFrame(-60)}
                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#171d29] transition-colors"
                title="Previous Keyframe"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {/* Step -10 Frames */}
              <button
                onClick={() => stepFrame(-10)}
                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#171d29] transition-colors"
                title="Step -10 Frames"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              {/* Step -1 Frame */}
              <button
                onClick={() => stepFrame(-1)}
                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#171d29] transition-colors text-[10px] font-mono"
                title="Step -1 Frame (-1f)"
              >
                -1f
              </button>

              {/* PLAY / PAUSE (MINT ACCENT) */}
              <button
                onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center bg-[#35c6a0] text-[#00382a] hover:bg-[#20e3b2] rounded-[3px] transition-transform active:scale-95 shadow font-bold mx-1"
                title="Play / Pause (Space)"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Step +1 Frame */}
              <button
                onClick={() => stepFrame(1)}
                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#171d29] transition-colors text-[10px] font-mono"
                title="Step +1 Frame (+1f)"
              >
                +1f
              </button>
              {/* Step +10 Frames */}
              <button
                onClick={() => stepFrame(10)}
                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#171d29] transition-colors"
                title="Step +10 Frames"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              {/* Next Keyframe */}
              <button
                onClick={() => stepFrame(60)}
                className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] rounded hover:bg-[#171d29] transition-colors"
                title="Next Keyframe"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="w-px h-4 bg-[#253043] mx-1"></span>

              {/* Speed Switcher */}
              <div className="flex items-center gap-0.5 font-mono text-[10px]">
                {[0.25, 0.5, 1.0, 2.0].map(spd => (
                  <button
                    key={spd}
                    onClick={() => changeSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded-[2px] ${
                      playbackSpeed === spd
                        ? 'bg-[#171d29] text-[#35c6a0] font-bold border border-[#1c2433]'
                        : 'text-[#64748b] hover:text-[#e2e8f0]'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <span className="w-px h-4 bg-[#253043] mx-1"></span>

              {/* Loop A/B Button */}
              <button
                onClick={() => setIsLoopingAB(!isLoopingAB)}
                className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] flex items-center gap-1 border transition-colors ${
                  isLoopingAB
                    ? 'bg-[#35c6a0]/20 text-[#35c6a0] border-[#35c6a0]/40'
                    : 'bg-[#171d29] text-[#64748b] hover:text-[#e2e8f0] border-[#1c2433]'
                }`}
                title="Loop Active Anomaly Interval"
              >
                <RotateCcw className="w-3 h-3" />
                <span>LOOP A/B</span>
              </button>
            </div>
          </div>

          {/* ==================== SYNCHRONIZED MULTI-TRACK FORENSIC SCRUBBER ==================== */}
          <div className="h-56 bg-[#111722] border-t border-[#1c2433] flex flex-col shrink-0 select-none">
            {/* Timeline Bar Header */}
            <div className="h-6 bg-[#171d29] px-3 flex items-center justify-between border-b border-[#1c2433] shrink-0 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span className="text-[#e2e8f0] font-semibold uppercase text-[10px] tracking-wider">
                  SYNCHRONIZED MULTI-TRACK FORENSIC SCRUBBER
                </span>
                <span className="text-[#64748b] text-[10px]">
                  | {totalFrames} TOTAL FRAMES · {fps.toFixed(3)} FPS NTSC
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#38bdf8] font-semibold">
                  PLAYHEAD: {formatSMPTE(currentTime, fps)} (FRAME #{currentFrame})
                </span>
              </div>
            </div>

            {/* Timeline Tracks Body */}
            <div
              ref={timelineRef}
              onClick={handleTimelineClick}
              className="relative flex-1 p-2 bg-[#090d14] overflow-hidden flex flex-col gap-1 cursor-pointer"
            >
              {/* MASTER PLAYHEAD SCRUBBER NEEDLE */}
              <div
                className="absolute top-0 bottom-0 w-px bg-[#38bdf8] z-30 pointer-events-none transition-all duration-75"
                style={{ left: `${playheadPercent}%` }}
              >
                {/* Top Diamond Flag */}
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-[#38bdf8] rotate-45 rounded-[1px] shadow" />
                {/* Bottom Flag */}
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-[#38bdf8] rotate-45 rounded-[1px]" />
              </div>

              {/* TRACK 0: SMPTE TIME RULER */}
              <div className="h-5 w-full flex items-center font-mono text-[9px] text-[#64748b] border-b border-[#1c2433] pb-0.5">
                <div className="w-32 shrink-0 text-[#94a3b8] uppercase text-[9.5px] tracking-wide font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#64748b]" />
                  <span>SMPTE RULER</span>
                </div>
                <div className="relative flex-1 flex justify-between items-center px-1">
                  <span>00:00:00</span>
                  <span>00:00:30</span>
                  <span>00:01:00</span>
                  <span className="text-[#38bdf8] font-bold bg-[#1f2737] px-1 rounded border border-[#38bdf8]/30">
                    {formatSMPTE(currentTime, fps)}
                  </span>
                  <span>00:01:30</span>
                  <span>00:02:00</span>
                  <span>00:02:30</span>
                  <span>00:02:48</span>
                </div>
              </div>

              {/* TRACK 1: VIDEO FILMSTRIP KEYFRAME RIBBON */}
              <div className="h-8 w-full flex items-center bg-[#111722] rounded-[3px] border border-[#1c2433] overflow-hidden">
                <div className="w-32 shrink-0 px-2 font-mono text-[10px] text-[#e2e8f0] flex items-center gap-1 bg-[#171d29]/60 h-full border-r border-[#1c2433]">
                  <Film className="w-3 h-3 text-[#64748b]" />
                  <span>VIDEO STRIP</span>
                </div>
                <div className="relative flex-1 h-full flex gap-1 p-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(0); }}
                    className="flex-1 bg-[#171d29] rounded-[2px] relative overflow-hidden flex items-center justify-center font-mono text-[8px] text-[#64748b] border border-[#1c2433]/50 hover:border-[#35c6a0]"
                  >
                    <span className="absolute left-1 top-0.5 text-[#64748b]">KF 0001</span>
                    <span>[INTRO]</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(29.7); }}
                    className="flex-1 bg-[#171d29] rounded-[2px] relative overflow-hidden flex items-center justify-center font-mono text-[8px] text-[#64748b] border border-[#1c2433]/50 hover:border-[#35c6a0]"
                  >
                    <span className="absolute left-1 top-0.5 text-[#64748b]">KF 0890</span>
                    <span>[PODIUM]</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(60.0); }}
                    className="flex-1 bg-[#171d29] rounded-[2px] relative overflow-hidden flex items-center justify-center font-mono text-[8px] text-[#64748b] border border-[#1c2433]/50 hover:border-[#35c6a0]"
                  >
                    <span className="absolute left-1 top-0.5 text-[#64748b]">KF 1798</span>
                    <span>[CLOSE-UP]</span>
                  </button>
                  {/* Current Active Keyframe Frame 2238 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(74.6); }}
                    className="flex-1 bg-[#1f2737] rounded-[2px] relative overflow-hidden flex items-center justify-center font-mono text-[8px] text-[#35c6a0] border border-[#35c6a0]/50 shadow-sm"
                  >
                    <span className="absolute left-1 top-0.5 font-bold text-[#38bdf8]">KF 2238</span>
                    <span className="font-bold">[CURRENT]</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(103.4); }}
                    className="flex-1 bg-[#171d29] rounded-[2px] relative overflow-hidden flex items-center justify-center font-mono text-[8px] text-[#64748b] border border-[#1c2433]/50 hover:border-[#35c6a0]"
                  >
                    <span className="absolute left-1 top-0.5 text-[#64748b]">KF 3100</span>
                    <span>[GESTURE]</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); seekTo(147.5); }}
                    className="flex-1 bg-[#171d29] rounded-[2px] relative overflow-hidden flex items-center justify-center font-mono text-[8px] text-[#64748b] border border-[#1c2433]/50 hover:border-[#35c6a0]"
                  >
                    <span className="absolute left-1 top-0.5 text-[#64748b]">KF 4420</span>
                    <span>[CUT]</span>
                  </button>
                </div>
              </div>

              {/* TRACK 2: DUAL-CHANNEL AUDIO WAVEFORM */}
              <div className="h-6 w-full flex items-center bg-[#111722] rounded-[3px] border border-[#1c2433] overflow-hidden">
                <div className="w-32 shrink-0 px-2 font-mono text-[10px] text-[#e2e8f0] flex items-center gap-1 bg-[#171d29]/60 h-full border-r border-[#1c2433]">
                  <AudioWaveform className="w-3 h-3 text-[#64748b]" />
                  <span>AUDIO L/R</span>
                </div>
                <div className="relative flex-1 h-full flex items-center px-1">
                  <svg className="w-full h-4 text-[#475569]" preserveAspectRatio="none" viewBox="0 0 1000 40">
                    <path
                      d="M 0,20 Q 20,4 40,20 T 80,20 T 120,34 T 160,20 T 200,8 T 240,20 T 280,36 T 320,20 T 360,4 T 400,20 T 440,26 T 480,20 T 520,6 T 560,20 T 600,36 T 640,20 T 680,12 T 720,20 T 760,28 T 800,20 T 840,4 T 880,20 T 920,32 T 960,20 T 1000,20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  {/* Audio Lag Marker at 61% (00:01:43) */}
                  <div
                    className="absolute left-[61%] w-[2.8%] top-0 bottom-0 bg-[#f59e0b]/25 border-x border-[#f59e0b]/60 flex items-center justify-center pointer-events-none"
                    title="Audio Phase Desync (-180ms)"
                  >
                    <span className="w-0.5 h-full bg-[#f59e0b]"></span>
                  </div>
                </div>
              </div>

              {/* TRACK 3: VIDEO ANOMALIES TRACK */}
              <div className="h-6 w-full flex items-center bg-[#111722] rounded-[3px] border border-[#1c2433] overflow-hidden">
                <div className="w-32 shrink-0 px-2 font-mono text-[10px] text-[#f43f5e] flex items-center gap-1 bg-[#171d29]/60 h-full border-r border-[#1c2433] font-semibold">
                  <AlertTriangle className="w-3 h-3 text-[#f43f5e]" />
                  <span>ANOMALIES</span>
                </div>
                <div className="relative flex-1 h-full bg-[#090d14]/50">
                  {/* VID-FND-001 (00:01:12 – 00:01:15, 43% – 45%) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(74.6);
                      const f = videoFindings.find(vf => vf.finding_type === 'temporal_boundary_inconsistency');
                      if (f) onSelectFinding(f.finding_id);
                    }}
                    className="absolute left-[43%] w-[3.2%] top-0.5 bottom-0.5 bg-[#f43f5e] text-black rounded-[2px] px-1 flex items-center justify-between text-[8px] font-mono font-bold cursor-pointer hover:brightness-125 shadow"
                    title="VID-FND-001: Mandibular Boundary Inconsistency"
                  >
                    <span className="truncate">VID-001</span>
                  </div>
                  {/* VID-FND-003 (00:02:06, 75%) */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(126.0);
                      const f = videoFindings.find(vf => vf.finding_type === 'encoding_profile_transition');
                      if (f) onSelectFinding(f.finding_id);
                    }}
                    className="absolute left-[75%] w-[1.5%] top-0.5 bottom-0.5 bg-[#f59e0b] text-black rounded-[2px] text-[8px] font-mono font-bold cursor-pointer hover:brightness-125"
                    title="VID-FND-003: GOP QP Anomaly"
                  >
                    <span className="truncate px-0.5">003</span>
                  </div>
                </div>
              </div>

              {/* TRACK 4: A/V DESYNC TRACK */}
              <div className="h-5 w-full flex items-center bg-[#111722] rounded-[3px] border border-[#1c2433] overflow-hidden">
                <div className="w-32 shrink-0 px-2 font-mono text-[10px] text-[#f59e0b] flex items-center gap-1 bg-[#171d29]/60 h-full border-r border-[#1c2433] font-semibold">
                  <Sparkles className="w-3 h-3 text-[#f59e0b]" />
                  <span>A/V DESYNC</span>
                </div>
                <div className="relative flex-1 h-full bg-[#090d14]/50">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(103.5);
                      const f = videoFindings.find(vf => vf.finding_type === 'audio_video_synchronisation_discrepancy');
                      if (f) onSelectFinding(f.finding_id);
                    }}
                    className="absolute left-[61%] w-[3%] top-0.5 bottom-0.5 bg-[#f59e0b]/90 text-black rounded-[2px] px-1 flex items-center text-[8px] font-mono font-bold cursor-pointer hover:brightness-125"
                    title="VID-FND-002: Viseme Decoupling (-180ms)"
                  >
                    <span className="truncate">VID-002 (-180ms)</span>
                  </div>
                </div>
              </div>

              {/* TRACK 5: BIOMETRIC FACE TRACK */}
              <div className="h-5 w-full flex items-center bg-[#111722] rounded-[3px] border border-[#1c2433] overflow-hidden">
                <div className="w-32 shrink-0 px-2 font-mono text-[10px] text-[#a855f7] flex items-center gap-1 bg-[#171d29]/60 h-full border-r border-[#1c2433] font-semibold">
                  <UserCheck className="w-3 h-3 text-[#a855f7]" />
                  <span>FACE TRACKS</span>
                </div>
                <div className="relative flex-1 h-full bg-[#090d14]/50">
                  <div className="absolute left-[2%] right-[4%] top-0.5 bottom-0.5 bg-[#a855f7]/20 rounded-[2px] flex items-center px-1.5 text-[8px] font-mono text-[#a855f7] border border-[#a855f7]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] mr-1 shrink-0"></span>
                    <span className="truncate">FT-01: SPEAKER_A (CANONICAL IDENTITY CLUSTER · UNCORROBORATED LEAD)</span>
                  </div>
                </div>
              </div>

              {/* TRACK 6: ANNOTATIONS TRACK */}
              <div className="h-5 w-full flex items-center bg-[#111722] rounded-[3px] border border-[#1c2433] overflow-hidden">
                <div className="w-32 shrink-0 px-2 font-mono text-[10px] text-[#38bdf8] flex items-center gap-1 bg-[#171d29]/60 h-full border-r border-[#1c2433] font-semibold">
                  <MapPin className="w-3 h-3 text-[#38bdf8]" />
                  <span>ANNOTATIONS</span>
                </div>
                <div className="relative flex-1 h-full bg-[#090d14]/50">
                  {annotations.map((ann) => {
                    const annPct = duration > 0 ? (ann.x / totalFrames) * 100 : 44.5;
                    return (
                      <div
                        key={ann.annotation_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(ann.x / fps);
                        }}
                        className="absolute -translate-x-1/2 top-0.5 bottom-0.5 px-1.5 bg-[#1f2737] rounded-[2px] flex items-center gap-1 font-mono text-[8px] text-[#38bdf8] border border-[#38bdf8]/40 shadow hover:brightness-125"
                        style={{ left: `${annPct}%` }}
                        title={`${ann.label}: ${ann.notes || ''}`}
                      >
                        <MapPin className="w-2.5 h-2.5 text-[#38bdf8]" />
                        <span className="truncate max-w-[80px]">#{ann.x}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT RAIL: CONTEXTUAL FORENSIC INSPECTOR ==================== */}
        <aside className="bg-[#111722] flex flex-col shrink-0 overflow-hidden font-sans border-l border-[#1c2433] w-80">
          {/* Header */}
          <div className="h-10 px-3 bg-[#171d29] border-b border-[#1c2433] flex items-center justify-between shrink-0 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#35c6a0]" />
              <span className="font-bold text-[12px] text-white uppercase tracking-wide">INSPECTOR</span>
              <span className="text-[#64748b]">//</span>
              <span className="text-[11px] text-[#35c6a0] font-semibold">
                {selectedFindingId ? selectedFindingId.slice(-6) : 'VID_01'}
              </span>
            </div>
            <span className="text-[10px] text-[#94a3b8] px-1.5 py-0.5 bg-[#090d14] rounded border border-[#1c2433]">
              {evidence.evidence_id}
            </span>
          </div>

          {/* Inspector Tabs */}
          <div className="flex bg-[#090d14] p-1 gap-1 border-b border-[#1c2433] text-[11px]">
            <button
              onClick={() => setInspectorTab('findings')}
              className={`flex-1 py-1 px-2 rounded-[3px] text-center font-medium transition-colors ${
                inspectorTab === 'findings'
                  ? 'bg-[#1f2737] text-[#35c6a0] font-semibold border border-[#35c6a0]/30 shadow-sm'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              Findings ({videoFindings.length})
            </button>
            <button
              onClick={() => setInspectorTab('metadata')}
              className={`flex-1 py-1 px-2 rounded-[3px] text-center font-medium transition-colors ${
                inspectorTab === 'metadata'
                  ? 'bg-[#1f2737] text-[#38bdf8] font-semibold border border-[#38bdf8]/30 shadow-sm'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              Metadata
            </button>
            <button
              onClick={() => setInspectorTab('roi')}
              className={`flex-1 py-1 px-2 rounded-[3px] text-center font-medium transition-colors ${
                inspectorTab === 'roi'
                  ? 'bg-[#1f2737] text-[#a855f7] font-semibold border border-[#a855f7]/30 shadow-sm'
                  : 'text-[#64748b] hover:text-[#e2e8f0]'
              }`}
            >
              ROI / Face
            </button>
          </div>

          {/* TAB CONTENT */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            {/* TAB 1: FINDINGS */}
            {inspectorTab === 'findings' && (
              <div className="flex flex-col gap-3">
                {/* Trigger pipelines banner if no findings yet */}
                {videoFindings.length === 0 && (
                  <div className="p-3 bg-[#171d29] rounded border border-[#1c2433] text-center">
                    <p className="text-xs text-[#94a3b8] mb-2">No video pipeline findings registered.</p>
                    <button
                      onClick={() => onTriggerAnalysis(['video_container_analysis', 'video_temporal_cadence', 'video_viseme_sync'])}
                      className="px-3 py-1 bg-[#35c6a0] text-[#00382a] rounded text-xs font-semibold hover:bg-[#20e3b2]"
                    >
                      Run Video Forensic Pipelines
                    </button>
                  </div>
                )}

                {/* Finding 1: Mandibular Boundary Discontinuity */}
                <div
                  onClick={() => {
                    seekTo(74.6);
                    onSelectFinding('FND-VID-TEMP');
                  }}
                  className={`bg-[#171d29] rounded-[4px] border p-2.5 flex flex-col gap-2 relative shadow-lg cursor-pointer transition-all ${
                    selectedFindingId === 'FND-VID-TEMP' || selectedFindingId?.includes('TEMP')
                      ? 'border-[#f43f5e] ring-1 ring-[#f43f5e]/50'
                      : 'border-[#f43f5e]/40 hover:border-[#f43f5e]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[#f43f5e]/20 border border-[#f43f5e]/50 text-[#f43f5e] font-mono text-[9px] font-bold tracking-wide uppercase">
                      ILLUSTRATIVE MODEL OUTPUT // VID-FND-001
                    </span>
                    <span className="font-mono text-[10px] text-[#f43f5e] font-bold">00:01:12 – 00:01:15</span>
                  </div>
                  <div className="font-semibold text-[12.5px] text-white">
                    Potential temporal boundary inconsistency
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-[#090d14] p-2 rounded-[3px] border border-[#1c2433] font-mono text-[10px]">
                    <div>
                      <div className="text-[#64748b] text-[8.5px]">ILLUSTRATIVE SCORE</div>
                      <div className="text-[#f43f5e] font-bold text-[9.5px]">Non-calibrated LR ~ 10^3.6</div>
                    </div>
                    <div>
                      <div className="text-[#64748b] text-[8.5px]">MODEL STACK</div>
                      <div className="text-[#e2e8f0] font-semibold text-[9.5px]">TemporalFace_v2.4</div>
                    </div>
                    <div>
                      <div className="text-[#64748b] text-[8.5px]">TIME INTERVAL</div>
                      <div className="text-[#cbd5e1] text-[9.5px]">FRM 2158–2248</div>
                    </div>
                    <div>
                      <div className="text-[#64748b] text-[8.5px]">RESIDUAL VECTOR</div>
                      <div className="text-[#f59e0b] font-semibold text-[9.5px]">1.42 px Jaw Discontinuity</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    Inter-frame boundary discontinuity and phase drift observed along mandibular region during articulation.
                  </p>
                  <div className="p-1.5 bg-[#090d14] rounded-[3px] border border-[#1c2433] flex items-start gap-1 font-mono text-[8.5px] text-[#64748b]">
                    <Info className="w-3 h-3 text-[#f59e0b] shrink-0 mt-0.5" />
                    <span>Illustrative model output; benchmark reference only. Does not establish legal proof of synthetic generation.</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); seekTo(74.6); }}
                      className="h-5 px-2 bg-[#1f2737] hover:bg-[#353942] rounded-[3px] border border-[#1c2433] text-[10px] font-mono text-white flex items-center gap-1 transition-colors"
                    >
                      <span>Jump to TC (00:01:14:18)</span>
                    </button>
                    <span className="text-[9px] font-mono text-[#f43f5e] uppercase">Flagged for Dossier</span>
                  </div>
                </div>

                {/* Finding 2: Viseme Audio/Video Desynchronization */}
                <div
                  onClick={() => {
                    seekTo(103.5);
                    onSelectFinding('FND-VID-VIS');
                  }}
                  className={`bg-[#171d29] rounded-[4px] border p-2.5 flex flex-col gap-2 cursor-pointer transition-all ${
                    selectedFindingId === 'FND-VID-VIS' || selectedFindingId?.includes('VIS')
                      ? 'border-[#f59e0b] ring-1 ring-[#f59e0b]/50'
                      : 'border-[#f59e0b]/40 hover:border-[#f59e0b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[#f59e0b] font-mono text-[9px] font-bold uppercase">
                      ILLUSTRATIVE MODEL OUTPUT // VID-FND-002
                    </span>
                    <span className="font-mono text-[10px] text-[#f59e0b] font-bold">00:01:43 – 00:01:46</span>
                  </div>
                  <div className="font-semibold text-[12.5px] text-white">
                    Possible audio-video synchronisation discrepancy
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-[#090d14] p-2 rounded-[3px] border border-[#1c2433] font-mono text-[10px]">
                    <div>
                      <div className="text-[#64748b] text-[8.5px]">MODEL STACK</div>
                      <div className="text-[#e2e8f0] text-[9.5px]">SyncNet_Lite_v1.8</div>
                    </div>
                    <div>
                      <div className="text-[#64748b] text-[8.5px]">MEASURED OFFSET</div>
                      <div className="text-[#f59e0b] font-bold text-[9.5px]">-180 ms (Audio Lags)</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    Acoustic onset of plosive consonant precedes visual lip closure by ~5.4 frames. May indicate re-multiplexing or capture latency.
                  </p>
                </div>

                {/* Finding 3: Encoding Profile Transition */}
                <div
                  onClick={() => {
                    seekTo(126.0);
                    onSelectFinding('FND-VID-QP');
                  }}
                  className={`bg-[#171d29] rounded-[4px] border p-2.5 flex flex-col gap-2 cursor-pointer transition-all ${
                    selectedFindingId === 'FND-VID-QP' || selectedFindingId?.includes('QP')
                      ? 'border-[#38bdf8] ring-1 ring-[#38bdf8]/50'
                      : 'border-[#1c2433] hover:border-[#38bdf8]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[#1f2737] border border-[#1c2433] text-[#38bdf8] font-mono text-[9px] font-bold uppercase">
                      ILLUSTRATIVE MODEL OUTPUT // VID-FND-003
                    </span>
                    <span className="font-mono text-[10px] text-[#64748b] font-bold">Frame 3780 / 00:02:06</span>
                  </div>
                  <div className="font-semibold text-[12.5px] text-white">
                    Encoding-profile transition requiring review
                  </div>
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    Abrupt QP variance from 18 to 34 across non-scene-cut I-frame boundary (Frame 3780).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: METADATA & PROVENANCE */}
            {inspectorTab === 'metadata' && (
              <div className="flex flex-col gap-3 font-mono text-[10.5px]">
                <div className="bg-[#171d29] rounded-[4px] border border-[#1c2433] p-3 flex flex-col gap-2">
                  <span className="font-semibold text-white uppercase text-[11px]">
                    Cryptographic Integrity &amp; Provenance
                  </span>

                  {/* SHA-256 Bitstream Digest */}
                  <div className="p-2 bg-[#090d14] rounded-[3px] border border-[#1c2433]">
                    <div className="flex items-center justify-between text-[#64748b] text-[9px] mb-0.5">
                      <span>SHA-256 BITSTREAM DIGEST</span>
                      <button
                        onClick={copyDigest}
                        className="text-[#35c6a0] hover:underline flex items-center gap-0.5"
                      >
                        {copiedHash ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedHash ? 'COPIED' : 'COPY'}</span>
                      </button>
                    </div>
                    <div className="text-[#35c6a0] text-[9.5px] break-all font-mono">
                      {evidence.sha256_digest}
                    </div>
                  </div>

                  {/* C2PA Manifest Status */}
                  <div className="p-2 bg-[#090d14] rounded-[3px] border border-[#1c2433] flex items-center justify-between">
                    <div>
                      <div className="text-[#64748b] text-[9px]">C2PA MANIFEST STATUS</div>
                      <div className="text-[#f59e0b] font-semibold text-[10.5px]">Missing / Stripped at source</div>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />
                  </div>

                  {/* Container Details */}
                  <div className="p-2 bg-[#090d14] rounded-[3px] border border-[#1c2433] space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#64748b]">ENCODER TOOL:</span>
                      <span className="text-white">Lavf 60.16.100 (ffmpeg)</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#64748b]">CONTAINER:</span>
                      <span className="text-white">ISO/IEC 14496-14 (MP4)</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#64748b]">COLOR SPACE:</span>
                      <span className="text-white">yuv420p · BT.709</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#64748b]">METADATA FLAGS:</span>
                      <span className="text-[#f43f5e]">Non-Camera Exif Structure</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ROI / FACE TRACKS */}
            {inspectorTab === 'roi' && (
              <div className="flex flex-col gap-3 font-mono text-[10px]">
                <div className="bg-[#171d29] rounded-[4px] border border-[#1c2433] p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-[11px]">TRACK: FT-01 (SPEAKER A)</span>
                    <span className="px-1.5 py-0.5 rounded-[2px] bg-[#a855f7]/20 text-[#a855f7] text-[9px] font-bold">
                      99.4% CONF
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8] font-sans leading-relaxed">
                    Continuous biometric tracking across 4,740 frames. Facial geometry topologically corresponds with target individual, but exhibits mandibular mesh shearing between frames 2158–2248.
                  </p>
                  <div className="p-2 bg-[#090d14] rounded-[3px] border border-[#1c2433] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Gaze Vector:</span>
                      <span className="text-white">[-0.04, 0.12, 0.98]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Head Pose (Yaw/Pitch):</span>
                      <span className="text-white">-4.2° / +1.8°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Interpupillary Dist:</span>
                      <span className="text-white">63.2 mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Blink Frequency:</span>
                      <span className="text-[#35c6a0]">16 / min (Typical)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QUICK ANNOTATION DOCKET AT RAIL BASE */}
          <div className="p-3 bg-[#171d29] border-t border-[#1c2433] flex flex-col gap-1.5 shrink-0 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#64748b] uppercase">ACTIVE ANNOTATION PIN</span>
              <span className="text-[#38bdf8] font-bold">
                #{currentFrame} ({formatSMPTE(currentTime, fps)})
              </span>
            </div>
            <textarea
              value={annotationNote}
              onChange={e => setAnnotationNote(e.target.value)}
              placeholder="Append observation for current frame..."
              className="w-full h-14 bg-[#090d14] border border-[#1c2433] rounded-[3px] p-1.5 text-white text-[10.5px] placeholder:text-[#64748b] focus:outline-none focus:border-[#35c6a0]"
            />
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-[#64748b]">
                {annotations.length} pins registered
              </span>
              <button
                disabled={isSubmittingNote || !annotationNote.trim()}
                onClick={handleCommitNote}
                className="h-6 px-2.5 bg-[#38bdf8] text-black font-semibold rounded-[3px] text-[10.5px] hover:bg-[#7dd3fc] transition-colors disabled:opacity-50"
              >
                {isSubmittingNote ? 'Saving...' : 'Commit Note'}
              </button>
            </div>

            {/* Recent annotations list in dock */}
            {annotations.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 mt-1 pt-1 border-t border-[#1c2433]/60">
                {annotations.map(a => (
                  <div key={a.annotation_id} className="p-1 bg-[#090d14] rounded border border-[#1c2433] flex items-center justify-between text-[9px]">
                    <div className="truncate flex items-center gap-1">
                      <span className="text-[#38bdf8]">#{a.x}:</span>
                      <span className="text-[#cbd5e1] truncate">{a.notes || a.label}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteNote(a.annotation_id)}
                      className="text-[#64748b] hover:text-[#f43f5e] p-0.5"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ==================== BOTTOM STATUS BAR ==================== */}
      <footer className="h-7 bg-[#090d14] border-t border-[#1c2433] px-3 flex items-center justify-between font-mono text-[10px] shrink-0 z-40">
        <div className="flex items-center gap-2 text-[#64748b]">
          <span className="text-[#cbd5e1] font-bold uppercase tracking-wider text-[9.5px]">SPECTRIX PIPELINE:</span>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded-[2px] border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>Ingestion 0.4s</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded-[2px] border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>ISOBMFF 0.8s</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded-[2px] border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>Frame-Cadence 2.1s</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded-[2px] border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>TemporalFace 4.2s</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded-[2px] border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>SyncNet 3.6s</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[#64748b]">
          <span>INTEGRITY: SHA-256 MATCH</span>
          <span className="text-[#253043]">|</span>
          <span className="text-[#35c6a0]">ALL WORKSTATIONS SYNCHRONIZED</span>
        </div>
      </footer>
    </div>
  );
};
