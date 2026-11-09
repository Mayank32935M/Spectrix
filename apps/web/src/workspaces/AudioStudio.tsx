import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  MousePointer,
  Move,
  Crop,
  Search,
  MapPin,
  Clock,
  AlertTriangle,
  Users,
  Copy,
  Check,
  Info,
  ShieldCheck,
  Scissors,
  Trash2,
  Columns,
  Sparkles
} from 'lucide-react';
import { EvidenceAsset, ForensicFinding, Case, EvidenceAnnotation } from '../types';
import { EmptyUploadZone } from '../components/common/EmptyUploadZone';
import { fetchAnnotations, createAnnotation, deleteAnnotation } from '../services/api';

interface AudioStudioProps {
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

export const AudioStudio: React.FC<AudioStudioProps> = ({
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const spectroRef = useRef<HTMLDivElement>(null);

  // Playback & Scrubber State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(52.420); // 00:00:52.420
  const [duration, setDuration] = useState<number>(168.0); // 00:02:48
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [gainDb] = useState<number>(0.0);
  const [isLoopingAB, setIsLoopingAB] = useState<boolean>(false);
  const [loopRange] = useState<[number, number]>([48.12, 55.34]); // AUD-FND-001 range

  // View & Modes
  const [viewMode, setViewMode] = useState<'combined' | 'waveform' | 'spectrogram' | 'split'>('combined');
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'timerange' | 'freqrange' | 'tfbox' | 'loupe' | 'pin'>('select');
  const [channelRoute, setChannelRoute] = useState<'stereo' | 'left' | 'right' | 'diff'>('stereo');

  // Overlays
  const [showTTS, setShowTTS] = useState<boolean>(true);
  const [showSplice, setShowSplice] = useState<boolean>(true);
  const [showNoise, setShowNoise] = useState<boolean>(true);
  const [showSpeaker, setShowSpeaker] = useState<boolean>(true);
  const [showVAD, setShowVAD] = useState<boolean>(false);

  // Inspector State
  const [inspectorTab, setInspectorTab] = useState<'findings' | 'specs' | 'speakers' | 'spectral' | 'analyst'>('findings');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Annotations
  const [annotations, setAnnotations] = useState<EvidenceAnnotation[]>([]);
  const [annotationNote, setAnnotationNote] = useState<string>(
    'Harmonic spacing in 00:00:48-00:00:55 suggests neural vocoder synthesis. Correlates with facial mesh deformation in Video Studio (VID-FND-001).'
  );
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);

  // Helpers
  const formatTimecode = useCallback((sec: number): string => {
    if (isNaN(sec) || sec < 0) return '00:00:00.000';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    const h = Math.floor(m / 60);
    return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }, []);

  const totalSamples = Math.floor(duration * 48000);
  const currentSample = Math.floor(currentTime * 48000);

  // Load annotations
  useEffect(() => {
    if (evidence) {
      fetchAnnotations(evidence.evidence_id)
        .then(setAnnotations)
        .catch(console.error);
    }
  }, [evidence]);

  // Audio element listeners
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setCurrentTime(cur);

      if (isLoopingAB && (cur < loopRange[0] || cur >= loopRange[1])) {
        audioRef.current.currentTime = loopRange[0];
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const stepTime = useCallback((deltaSec: number) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    const target = Math.max(0, Math.min(duration, currentTime + deltaSec));
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  }, [currentTime, duration]);

  const seekTo = (seconds: number) => {
    if (!audioRef.current) return;
    const safeTarget = Math.max(0, Math.min(duration, seconds));
    audioRef.current.currentTime = safeTarget;
    setCurrentTime(safeTarget);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Keyboard navigation
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
          stepTime(e.shiftKey ? -1.0 : -0.01);
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepTime(e.shiftKey ? 1.0 : 0.01);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          stepTime(-5.0);
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          stepTime(5.0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepTime]);

  // Click scrubber
  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
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
        x: Math.round(currentTime * 1000), // ms
        y: 48000,
        label: formatTimecode(currentTime),
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

  const audioFindings = findings.filter(f => f.modality === 'audio' || f.evidence_id === evidence?.evidence_id);

  if (!evidence) {
    return (
      <EmptyUploadZone
        onFileUpload={onUploadEvidence}
        modalityFilter="audio"
        onOpenEvidenceVault={onOpenEvidenceVault}
        caseEvidenceCount={caseEvidenceCount}
      />
    );
  }

  const audioUrl = `/api/v1/evidence/${evidence.evidence_id}/file`;
  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0a0e16] text-[#e2e8f0] overflow-hidden select-none">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* ==================== WORKSPACE SUB-HEADER & HUD BAR ==================== */}
      <div className="h-9 bg-[#111722] border-b border-[#1c2433] px-3 flex items-center justify-between font-mono text-[11px] shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#090d14] border border-[#1c2433]">
            <span className="w-2 h-2 rounded-full bg-[#20e3b2] animate-pulse"></span>
            <span className="text-[#20e3b2] font-semibold tracking-wider uppercase text-[10px]">DSP CORE // ACTIVE</span>
          </div>
          <span className="text-[#253043]">|</span>
          <div className="flex items-center gap-2 text-[#94a3b8] text-[10px]">
            <span>FFT: <strong className="text-white">4096-PT BLACKMAN-HARRIS</strong></span>
            <span>•</span>
            <span>OVERLAP: <strong className="text-white">87.5%</strong></span>
            <span>•</span>
            <span>NYQUIST: <strong className="text-white">24,000 HZ</strong></span>
            <span>•</span>
            <span>TIME RES: <strong className="text-white">2.67 MS</strong></span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-[#090d14] p-0.5 rounded border border-[#1c2433] text-[10px]">
          <button
            onClick={() => setViewMode('combined')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'combined'
                ? 'bg-[#1f2737] text-[#35c6a0] font-semibold border border-[#35c6a0]/30'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            Combined View
          </button>
          <button
            onClick={() => setViewMode('waveform')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'waveform'
                ? 'bg-[#1f2737] text-[#38bdf8] font-semibold border border-[#38bdf8]/30'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            Waveform Only
          </button>
          <button
            onClick={() => setViewMode('spectrogram')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'spectrogram'
                ? 'bg-[#1f2737] text-[#a855f7] font-semibold border border-[#a855f7]/30'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            Spectrogram Only
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-2 py-0.5 rounded transition-colors ${
              viewMode === 'split'
                ? 'bg-[#1f2737] text-[#e2e8f0] font-semibold border border-[#e2e8f0]/30'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            A/B Split
          </button>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f43f5e]/10 border border-[#f43f5e]/40 text-[#f43f5e] text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3 text-[#f43f5e]" />
            <span>4 ANOMALIES FLAGGED</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#1c2433] text-[#94a3b8] text-[10px]">
            <Users className="w-3 h-3 text-[#a855f7]" />
            <span>2 DIARIZED CLUSTERS</span>
          </div>
        </div>
      </div>

      {/* ==================== MAIN STAGE & INSPECTOR ==================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT / CENTER WORK AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#090d14] border-r border-[#1c2433] overflow-hidden">
          {/* TRANSPORT & SCRUB CONTROLS BAR */}
          <div className="h-10 px-3 bg-[#111722] border-b border-[#1c2433] flex items-center justify-between font-mono text-[11px] shrink-0">
            {/* Left Transport: Timecode & Counters */}
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1.5 px-2.5 py-1 bg-[#090d14] border border-[#1c2433] rounded">
                <span className="text-[#64748b] text-[10px]">TC</span>
                <span className="text-[#38bdf8] font-bold tracking-tight text-xs">{formatTimecode(currentTime)}</span>
              </div>
              <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-[#090d14]/70 border border-[#1c2433] rounded text-[#64748b] text-[10px]">
                <span>SMPL</span>
                <span className="text-white">{currentSample.toLocaleString()}</span>
                <span>/</span>
                <span>{totalSamples.toLocaleString()}</span>
              </div>

              {/* Jog Buttons */}
              <div className="flex items-center gap-0.5 bg-[#090d14] border border-[#1c2433] p-0.5 rounded">
                <button
                  onClick={() => stepTime(-0.01)}
                  className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-white rounded hover:bg-[#171d29]"
                  title="Step -10ms (Left Arrow)"
                >
                  <Rewind className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => stepTime(-1.0)}
                  className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-white rounded hover:bg-[#171d29]"
                  title="Step -1s"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="h-6 px-2.5 flex items-center gap-1 bg-[#35c6a0] hover:bg-[#20e3b2] text-[#00382a] rounded font-bold text-[10px] shadow-sm uppercase"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
                <button
                  onClick={() => stepTime(1.0)}
                  className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-white rounded hover:bg-[#171d29]"
                  title="Step +1s"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => stepTime(0.01)}
                  className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-white rounded hover:bg-[#171d29]"
                  title="Step +10ms (Right Arrow)"
                >
                  <FastForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Loop A/B */}
              <button
                onClick={() => setIsLoopingAB(!isLoopingAB)}
                className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] uppercase font-bold transition-colors ${
                  isLoopingAB
                    ? 'border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]'
                    : 'border-[#1c2433] bg-[#090d14] text-[#64748b] hover:text-white'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>A/B LOOP</span>
              </button>
            </div>

            {/* Center Transport: Rate & Gain */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-[#64748b]">RATE</span>
                <select
                  value={playbackSpeed}
                  onChange={e => changeSpeed(parseFloat(e.target.value))}
                  className="bg-[#090d14] border border-[#1c2433] text-white rounded px-1.5 py-0.5 outline-none"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.50x</option>
                  <option value={1.0}>1.00x</option>
                  <option value={1.5}>1.50x</option>
                  <option value={2.0}>2.00x</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#64748b]">GAIN</span>
                <span className="px-1.5 py-0.5 bg-[#090d14] border border-[#1c2433] rounded text-white">{gainDb.toFixed(1)} dB</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#64748b]">ZOOM</span>
                <span className="px-1.5 py-0.5 bg-[#090d14] border border-[#1c2433] rounded text-[#35c6a0]">100% [FIT]</span>
              </div>
            </div>

            {/* Right Transport: Channel Routing */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[#090d14] border border-[#1c2433] p-0.5 rounded text-[10px]">
                {(['stereo', 'left', 'right', 'diff'] as const).map(ch => (
                  <button
                    key={ch}
                    onClick={() => setChannelRoute(ch)}
                    className={`px-1.5 py-0.5 rounded uppercase font-semibold transition-colors ${
                      channelRoute === ch
                        ? 'bg-[#1f2737] text-[#35c6a0]'
                        : 'text-[#64748b] hover:text-white'
                    }`}
                  >
                    {ch === 'left' ? 'CH-L' : ch === 'right' ? 'CH-R' : ch === 'diff' ? 'DIFF (L-R)' : 'STEREO'}
                  </button>
                ))}
              </div>
              <button
                className="w-6 h-6 flex items-center justify-center rounded bg-[#090d14] border border-[#1c2433] text-[#94a3b8] hover:text-white"
                title="Export Audio Slice"
              >
                <Scissors className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* WORKSPACE INNER: FLOATING TOOL PALETTE + VIEWPORTS */}
          <div className="flex flex-1 min-h-0 relative overflow-hidden">
            {/* FLOATING VERTICAL TOOL PALETTE */}
            <div className="absolute left-2.5 top-3 z-30 flex flex-col gap-1 p-1 bg-[#111722]/95 border border-[#1c2433] rounded shadow-xl backdrop-blur-sm">
              <button
                onClick={() => setActiveTool('select')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  activeTool === 'select' ? 'bg-[#35c6a0] text-[#00382a]' : 'text-[#94a3b8] hover:text-white hover:bg-[#171d29]'
                }`}
                title="Select Pointer (V)"
              >
                <MousePointer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('pan')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  activeTool === 'pan' ? 'bg-[#35c6a0] text-[#00382a]' : 'text-[#94a3b8] hover:text-white hover:bg-[#171d29]'
                }`}
                title="Pan Hand (H)"
              >
                <Move className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('timerange')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  activeTool === 'timerange' ? 'bg-[#38bdf8] text-black' : 'text-[#94a3b8] hover:text-white hover:bg-[#171d29]'
                }`}
                title="Time Range (T)"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('tfbox')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  activeTool === 'tfbox' ? 'bg-[#a855f7] text-white' : 'text-[#94a3b8] hover:text-white hover:bg-[#171d29]'
                }`}
                title="Time-Frequency Box (B)"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTool('loupe')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  activeTool === 'loupe' ? 'bg-[#38bdf8] text-black' : 'text-[#94a3b8] hover:text-white hover:bg-[#171d29]'
                }`}
                title="Spectral Loupe (S)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <div className="h-px bg-[#1c2433] my-0.5"></div>
              <button
                onClick={() => setActiveTool('pin')}
                className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                  activeTool === 'pin' ? 'bg-[#f59e0b] text-black' : 'text-[#f59e0b] hover:bg-[#171d29]'
                }`}
                title="Forensic Annotation Pin (A)"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SYNCHRONIZED TIMELINE WORKSPACE */}
            <div className="flex-1 flex flex-col min-w-0 pl-11 pr-2 pt-1 pb-1 overflow-hidden">
              {/* UNIFIED TIME RULER */}
              <div
                onClick={handleScrubClick}
                className="h-6 w-full bg-[#090d14] border border-[#1c2433] flex items-center relative text-[#64748b] font-mono text-[9px] select-none shrink-0 cursor-pointer"
              >
                <div className="absolute left-1 text-[#94a3b8]">00:00:00</div>
                <div className="absolute left-[15%]">00:00:25</div>
                <div className="absolute left-[30%]">00:00:50</div>
                <div className="absolute left-[45%]">00:01:15</div>
                <div className="absolute left-[60%]">00:01:40</div>
                <div className="absolute left-[75%]">00:02:05</div>
                <div className="absolute left-[90%]">00:02:30</div>
                <div className="absolute right-1 text-[#94a3b8]">00:02:48</div>

                {/* Ruler Needle */}
                <div
                  className="absolute top-0 h-full w-2 -ml-1 flex flex-col items-center pointer-events-none z-40 transition-all duration-75"
                  style={{ left: `${playheadPercent}%` }}
                >
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#38bdf8]"></div>
                </div>
              </div>

              {/* TRACK SEGMENTATION & DIARIZATION RIBBON */}
              <div className="h-5 w-full bg-[#090d14] border-x border-b border-[#1c2433] flex items-center px-1 shrink-0 relative overflow-hidden text-[9px] font-mono">
                <span className="text-[#64748b] text-[8px] uppercase tracking-wider pr-1.5 shrink-0">SPEAKER // VAD</span>
                <div className="flex-1 h-3 bg-[#111722] rounded-sm relative overflow-hidden flex items-center">
                  <button
                    onClick={() => seekTo(10.0)}
                    className="absolute left-0 w-[27.3%] h-full bg-[#a855f7]/20 border-r border-[#a855f7]/40 flex items-center px-1 text-[#a855f7] font-bold text-[8px] hover:brightness-125"
                  >
                    SPK-01 [TARGET // 27.3%]
                  </button>
                  <button
                    onClick={() => {
                      seekTo(48.12);
                      onSelectFinding('FND-AUD-SYNTH');
                    }}
                    className="absolute left-[28.6%] w-[4.3%] h-full bg-[#f43f5e]/30 border-x border-[#f43f5e] flex items-center justify-center text-[#f43f5e] font-bold text-[8px] hover:brightness-125 shadow"
                    title="AUD-FND-001: Synthetic Speech"
                  >
                    SYNTH
                  </button>
                  <button
                    onClick={() => seekTo(56.0)}
                    className="absolute left-[32.9%] w-[15.1%] h-full bg-[#a855f7]/20 border-r border-[#a855f7]/40 flex items-center px-1 text-[#a855f7] text-[8px]"
                  >
                    SPK-01
                  </button>
                  <button
                    onClick={() => seekTo(85.0)}
                    className="absolute left-[48.2%] w-[25.5%] h-full bg-[#38bdf8]/20 border-r border-[#38bdf8] flex items-center px-1 text-[#38bdf8] font-bold text-[8px] hover:brightness-125"
                  >
                    SPK-02 [JOURNALIST // 25.5%]
                  </button>
                  <button
                    onClick={() => seekTo(135.0)}
                    className="absolute left-[74.0%] w-[26%] h-full bg-[#a855f7]/20 flex items-center px-1 text-[#a855f7] text-[8px]"
                  >
                    SPK-01 [TARGET]
                  </button>
                </div>
              </div>

              {/* DUAL-CHANNEL WAVEFORM VIEWPORT */}
              {(viewMode === 'combined' || viewMode === 'waveform' || viewMode === 'split') && (
                <div
                  ref={waveformRef}
                  onClick={handleScrubClick}
                  className="relative h-[160px] w-full bg-[#070b12] border-x border-b border-[#1c2433] flex shrink-0 overflow-hidden cursor-pointer"
                >
                  {/* Left Y-Axis Decibel scale */}
                  <div className="w-10 h-full border-r border-[#1c2433] bg-[#111722]/40 flex flex-col justify-between py-1 text-[8px] font-mono text-[#64748b] text-right pr-1 shrink-0 z-20 pointer-events-none">
                    <span className="text-[#94a3b8]">+6 dB</span>
                    <span>0 dB</span>
                    <span className="text-[#35c6a0] font-semibold">-6 dB</span>
                    <span>-18 dB</span>
                    <span>-36 dB</span>
                    <span>-inf</span>
                  </div>

                  {/* Waveform Graphic Container */}
                  <div className="relative flex-1 h-full overflow-hidden">
                    {/* Channel Labels */}
                    <div className="absolute left-2 top-1.5 z-10 font-mono text-[9px] text-[#94a3b8] bg-[#111722]/70 px-1 py-0.2 rounded border border-[#1c2433]">
                      CH-L <span className="text-[#64748b]">48kHz/24b</span>
                    </div>
                    <div className="absolute left-2 bottom-1.5 z-10 font-mono text-[9px] text-[#94a3b8] bg-[#111722]/70 px-1 py-0.2 rounded border border-[#1c2433]">
                      CH-R <span className="text-[#64748b]">48kHz/24b</span>
                    </div>

                    {/* Zero Crossing Center Line */}
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-[#1c2433] pointer-events-none"></div>

                    {/* Vector Waveform (L & R) */}
                    <svg className="w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 160">
                      <defs>
                        <linearGradient id="waveGradL" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.15" />
                        </linearGradient>
                        <linearGradient id="waveGradR" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#35c6a0" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#35c6a0" stopOpacity="0.8" />
                        </linearGradient>
                        <pattern id="diagHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                          <line x1="0" y1="0" x2="0" y2="6" stroke="#f43f5e" strokeWidth="1.5" strokeOpacity="0.5" />
                        </pattern>
                      </defs>

                      {/* CH-L (Top half) */}
                      {(channelRoute === 'stereo' || channelRoute === 'left') && (
                        <path
                          d="M 0 80 L 20 72 L 35 60 L 50 78 L 70 45 L 85 80 L 110 52 L 130 68 L 150 40 L 175 75 L 190 32 L 210 70 L 230 48 L 250 80 L 286 28 L 300 20 L 312 25 L 329 30 L 340 76 L 360 48 L 380 62 L 400 35 L 430 78 L 460 55 L 482 79 L 510 38 L 530 65 L 560 30 L 590 70 L 610 50 L 640 78 L 670 44 L 700 75 L 725 35 L 740 79 L 760 48 L 780 70 L 810 30 L 840 68 L 870 45 L 900 78 L 930 52 L 960 70 L 1000 80 L 1000 80 L 0 80 Z"
                          fill="url(#waveGradL)"
                          stroke="#38bdf8"
                          strokeWidth="1"
                        />
                      )}

                      {/* CH-R (Bottom half) */}
                      {(channelRoute === 'stereo' || channelRoute === 'right') && (
                        <path
                          d="M 0 80 L 18 88 L 33 100 L 48 82 L 68 115 L 83 80 L 108 108 L 128 92 L 148 120 L 173 85 L 188 128 L 208 90 L 228 112 L 248 80 L 286 132 L 300 140 L 312 135 L 329 130 L 340 84 L 360 112 L 380 98 L 400 125 L 430 82 L 460 105 L 482 81 L 510 122 L 530 95 L 560 130 L 590 90 L 610 110 L 640 82 L 670 116 L 700 85 L 725 125 L 740 81 L 760 112 L 780 90 L 810 130 L 840 92 L 870 115 L 900 82 L 930 108 L 960 90 L 1000 80 L 1000 80 L 0 80 Z"
                          fill="url(#waveGradR)"
                          stroke="#35c6a0"
                          strokeWidth="1"
                        />
                      )}

                      {/* AUD-FND-001 ANOMALY RANGE BRACKET (28.6% - 32.9%) */}
                      <rect x="286" y="0" width="43" height="160" fill="url(#diagHatch)" opacity="0.45" />
                      <line x1="286" y1="0" x2="286" y2="160" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
                      <line x1="329" y1="0" x2="329" y2="160" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
                      <line x1="286" y1="4" x2="329" y2="4" stroke="#f43f5e" strokeWidth="2" />
                      <line x1="286" y1="156" x2="329" y2="156" stroke="#f43f5e" strokeWidth="2" />
                    </svg>

                    {/* Tag in waveform */}
                    <div className="absolute left-[28.8%] top-2 px-1 py-0.5 rounded bg-[#f43f5e]/90 text-white font-mono text-[8.5px] font-bold z-10 shadow">
                      AUD-FND-001 // RANGE (7.22s)
                    </div>

                    {/* Playhead Needle */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#38bdf8] pointer-events-none z-30 transition-all duration-75"
                      style={{ left: `${playheadPercent}%` }}
                    >
                      <div className="w-2.5 h-2.5 -ml-[4px] -top-1 bg-[#38bdf8] rounded-sm rotate-45"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* HIGH-RESOLUTION FORENSIC SPECTROGRAM VIEWPORT */}
              {(viewMode === 'combined' || viewMode === 'spectrogram' || viewMode === 'split') && (
                <div
                  ref={spectroRef}
                  onClick={handleScrubClick}
                  className="relative flex-1 w-full bg-[#05080e] border-x border-b border-[#1c2433] flex min-h-[200px] overflow-hidden cursor-pointer"
                >
                  {/* Left Y-Axis Frequency Scale */}
                  <div className="w-10 h-full border-r border-[#1c2433] bg-[#111722]/40 flex flex-col justify-between py-1 text-[8px] font-mono text-[#64748b] text-right pr-1 shrink-0 z-20 pointer-events-none">
                    <span className="text-[#f43f5e] font-semibold">24 kHz</span>
                    <span>20 kHz</span>
                    <span className="text-[#f59e0b]">16 kHz</span>
                    <span>12 kHz</span>
                    <span className="text-[#38bdf8]">8 kHz</span>
                    <span className="text-[#35c6a0] font-semibold">4 kHz</span>
                    <span>1 kHz</span>
                    <span>0 Hz</span>
                  </div>

                  {/* Spectrogram Graphic Container */}
                  <div className="relative flex-1 h-full overflow-hidden">
                    <svg className="w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 240">
                      <defs>
                        <linearGradient id="noiseFloor" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#0a101d" />
                          <stop offset="50%" stopColor="#0f192b" />
                          <stop offset="100%" stopColor="#142137" />
                        </linearGradient>
                      </defs>

                      {/* Background Noise Floor */}
                      <rect width="1000" height="240" fill="url(#noiseFloor)" />

                      {/* Grid Lines */}
                      <g opacity="0.15" stroke="#38bdf8" strokeWidth="0.5">
                        <line x1="0" y1="200" x2="1000" y2="200" />
                        <line x1="0" y1="160" x2="1000" y2="160" />
                        <line x1="0" y1="120" x2="1000" y2="120" />
                        <line x1="0" y1="80" x2="1000" y2="80" />
                        <line x1="0" y1="40" x2="1000" y2="40" />
                      </g>

                      {/* Natural Speech Formants SPK-01 (0 to 280) */}
                      {showSpeaker && (
                        <g>
                          <path d="M 10 225 Q 50 220 90 225 T 180 226 T 250 224" fill="none" opacity="0.85" stroke="#20e3b2" strokeWidth="3" />
                          <path d="M 15 205 Q 60 198 120 206 T 200 200 T 260 208" fill="none" opacity="0.9" stroke="#35c6a0" strokeWidth="5" />
                          <path d="M 20 180 Q 70 170 130 184 T 220 175 T 270 182" fill="none" opacity="0.7" stroke="#38bdf8" strokeWidth="6" />
                          <path d="M 25 150 Q 80 142 140 155 T 230 148 T 275 152" fill="none" opacity="0.5" stroke="#38bdf8" strokeWidth="4" />
                          <path d="M 30 115 Q 90 108 150 118 T 240 112 T 280 116" fill="none" opacity="0.4" stroke="#8b5cf6" strokeWidth="3" />
                          <rect x="42" y="60" width="3" height="170" fill="#f59e0b" opacity="0.6" />
                          <rect x="115" y="70" width="2" height="160" fill="#f59e0b" opacity="0.5" />
                          <rect x="195" y="55" width="4" height="175" fill="#f59e0b" opacity="0.7" />
                        </g>
                      )}

                      {/* CRITICAL ANOMALY 1: AUD-FND-001 (x: 286 to 329) SYNTHETIC HARMONIC STRIPES */}
                      {showTTS && (
                        <g id="syntheticArtifactBands" opacity="0.95">
                          <line x1="286" y1="160" x2="329" y2="160" stroke="#f43f5e" strokeWidth="3.5" />
                          <line x1="286" y1="145" x2="329" y2="145" stroke="#f43f5e" strokeWidth="3.5" />
                          <line x1="286" y1="130" x2="329" y2="130" stroke="#f43f5e" strokeWidth="4" />
                          <line x1="286" y1="115" x2="329" y2="115" stroke="#f59e0b" strokeWidth="3.5" />
                          <line x1="286" y1="100" x2="329" y2="100" stroke="#f43f5e" strokeWidth="3" />
                          <line x1="286" y1="85" x2="329" y2="85" stroke="#f43f5e" strokeWidth="2.5" />
                          <rect x="286" y="80" width="43" height="90" fill="#f43f5e" opacity="0.2" />
                          <rect x="286" y="78" width="43" height="94" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 2" />
                        </g>
                      )}

                      {/* Resumed SPK-01 Natural Speech (330 to 480) */}
                      {showSpeaker && (
                        <g>
                          <path d="M 340 224 Q 380 220 420 226 T 475 223" fill="none" opacity="0.8" stroke="#20e3b2" strokeWidth="3" />
                          <path d="M 345 204 Q 390 196 430 205 T 478 202" fill="none" opacity="0.8" stroke="#35c6a0" strokeWidth="5" />
                          <path d="M 350 178 Q 400 172 440 180 T 480 176" fill="none" opacity="0.6" stroke="#38bdf8" strokeWidth="5" />
                          <rect x="390" y="65" width="3" height="165" fill="#f59e0b" opacity="0.6" />
                        </g>
                      )}

                      {/* CRITICAL ANOMALY 2: AUD-FND-002 (x: 482) SPLICE BOUNDARY */}
                      {showSplice && (
                        <g>
                          <line x1="482" y1="10" x2="482" y2="235" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 2" />
                          <rect x="480" y="20" width="22" height="205" fill="#f43f5e" opacity="0.12" />
                        </g>
                      )}

                      {/* SPK-02 Speech Formants (500 to 740 - Journalist) */}
                      {showSpeaker && (
                        <g>
                          <path d="M 505 218 Q 550 210 610 220 T 700 214 T 735 219" fill="none" opacity="0.85" stroke="#7bd0ff" strokeWidth="4" />
                          <path d="M 510 192 Q 560 184 620 195 T 705 188 T 738 194" fill="none" opacity="0.8" stroke="#00a6e0" strokeWidth="5" />
                          <path d="M 520 162 Q 570 150 630 165 T 710 158 T 740 162" fill="none" opacity="0.6" stroke="#38bdf8" strokeWidth="4.5" />
                          <rect x="545" y="70" width="3" height="155" fill="#f59e0b" opacity="0.5" />
                          <rect x="635" y="60" width="4" height="170" fill="#f59e0b" opacity="0.6" />
                        </g>
                      )}

                      {/* ANOMALY 3: AUD-FND-003 (x: 735 to 762) NOISE FLOOR SHIFT */}
                      {showNoise && (
                        <g>
                          <rect x="735" y="140" width="28" height="95" fill="#e5a93c" opacity="0.25" />
                          <line x1="735" y1="140" x2="763" y2="140" stroke="#e5a93c" strokeWidth="1.5" strokeDasharray="2 2" />
                        </g>
                      )}

                      {/* SPK-01 Tail Speech (765 to 980) */}
                      {showSpeaker && (
                        <g>
                          <path d="M 768 225 Q 810 220 870 226 T 950 223" fill="none" opacity="0.8" stroke="#20e3b2" strokeWidth="3" />
                          <path d="M 772 205 Q 820 198 880 206 T 955 201" fill="none" opacity="0.8" stroke="#35c6a0" strokeWidth="5" />
                          <path d="M 776 178 Q 830 172 890 182 T 960 176" fill="none" opacity="0.6" stroke="#38bdf8" strokeWidth="5" />
                        </g>
                      )}
                    </svg>

                    {/* In-Spectrogram Anomaly Flag Pills */}
                    {showTTS && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(48.12);
                          const f = audioFindings.find(af => af.finding_type === 'synthetic_voice_detection' || af.finding_id.includes('SYNTH'));
                          onSelectFinding(f ? f.finding_id : 'FND-AUD-SYNTH');
                        }}
                        className="absolute left-[28.6%] top-3 z-20 flex flex-col items-start cursor-pointer hover:brightness-125"
                      >
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f43f5e] text-white font-mono text-[9px] font-bold shadow-md">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>AUD-FND-001 [UNNATURAL FORMANT BANDING]</span>
                        </div>
                        <div className="px-1 bg-[#090d14]/90 border border-[#f43f5e]/60 text-[#f43f5e] font-mono text-[8px] mt-0.5 rounded">
                          Δf = 3,800 – 7,400 Hz
                        </div>
                      </div>
                    )}

                    {showSplice && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(81.0);
                          const f = audioFindings.find(af => af.finding_type === 'phase_splice_boundary' || af.finding_id.includes('DISC'));
                          onSelectFinding(f ? f.finding_id : 'FND-AUD-DISC');
                        }}
                        className="absolute left-[48.2%] top-6 z-20 flex flex-col items-start cursor-pointer hover:brightness-125"
                      >
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f43f5e] text-white font-mono text-[9px] font-bold shadow-md">
                          <Scissors className="w-2.5 h-2.5" />
                          <span>AUD-FND-002 [SPLICE BOUNDARY]</span>
                        </div>
                      </div>
                    )}

                    {showNoise && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          seekTo(123.4);
                          const f = audioFindings.find(af => af.finding_type === 'noise_profile_discontinuity' || af.finding_id.includes('NOISE'));
                          onSelectFinding(f ? f.finding_id : 'FND-AUD-NOISE');
                        }}
                        className="absolute left-[73.5%] bottom-5 z-20 flex flex-col items-start cursor-pointer hover:brightness-125"
                      >
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f59e0b] text-black font-mono text-[9px] font-bold shadow-md">
                          <span>AUD-FND-003 [+4.2 dB FLOOR SHIFT]</span>
                        </div>
                      </div>
                    )}

                    {/* Spectrogram Playhead Line */}
                    <div
                      className="absolute top-0 bottom-0 w-px bg-[#38bdf8] pointer-events-none z-30 transition-all duration-75"
                      style={{ left: `${playheadPercent}%` }}
                    >
                      <div className="absolute top-0 left-0 bg-[#38bdf8] text-black px-1 text-[8px] font-mono font-bold -translate-x-1/2 rounded-b">
                        {currentTime.toFixed(3)}s
                      </div>
                    </div>

                    {/* Floating In-Viewport Overlay Toggle Pill (Bottom-Right) */}
                    <div className="absolute bottom-2.5 right-3 z-30 flex items-center gap-1 p-1 rounded bg-[#111722]/95 border border-[#1c2433] text-mono text-[10px] backdrop-blur-sm shadow-xl">
                      <span className="text-[#64748b] px-1 uppercase tracking-wider text-[8px]">OVERLAYS:</span>
                      <button
                        onClick={() => setShowTTS(!showTTS)}
                        className={`px-1.5 py-0.5 rounded font-semibold text-[9px] transition-colors ${
                          showTTS
                            ? 'bg-[#f43f5e]/20 border border-[#f43f5e] text-[#f43f5e]'
                            : 'bg-[#171d29] text-[#64748b]'
                        }`}
                      >
                        ✓ Synthetic Speech (TTS)
                      </button>
                      <button
                        onClick={() => setShowSplice(!showSplice)}
                        className={`px-1.5 py-0.5 rounded font-semibold text-[9px] transition-colors ${
                          showSplice
                            ? 'bg-[#f43f5e]/20 border border-[#f43f5e] text-[#f43f5e]'
                            : 'bg-[#171d29] text-[#64748b]'
                        }`}
                      >
                        ✓ Splice Bounds
                      </button>
                      <button
                        onClick={() => setShowNoise(!showNoise)}
                        className={`px-1.5 py-0.5 rounded font-semibold text-[9px] transition-colors ${
                          showNoise
                            ? 'bg-[#f59e0b]/20 border border-[#f59e0b] text-[#f59e0b]'
                            : 'bg-[#171d29] text-[#64748b]'
                        }`}
                      >
                        ✓ Noise Floor
                      </button>
                      <button
                        onClick={() => setShowSpeaker(!showSpeaker)}
                        className={`px-1.5 py-0.5 rounded font-semibold text-[9px] transition-colors ${
                          showSpeaker
                            ? 'bg-[#a855f7]/20 border border-[#a855f7] text-[#a855f7]'
                            : 'bg-[#171d29] text-[#64748b]'
                        }`}
                      >
                        ✓ Speaker Tracks
                      </button>
                      <button
                        onClick={() => setShowVAD(!showVAD)}
                        className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
                          showVAD
                            ? 'bg-[#38bdf8]/20 border border-[#38bdf8] text-[#38bdf8]'
                            : 'bg-[#171d29] text-[#64748b]'
                        }`}
                      >
                        VAD Bands
                      </button>
                    </div>

                    {/* Colormap dB Calibration Legend (Bottom-Left) */}
                    <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2 py-1 rounded bg-[#090d14]/90 border border-[#1c2433] font-mono text-[8px] text-[#64748b]">
                      <span>INTENSITY:</span>
                      <span>-90dB</span>
                      <div className="w-14 h-2 rounded bg-gradient-to-r from-[#0a101d] via-[#35c6a0] via-[#f59e0b] to-[#f43f5e]"></div>
                      <span className="text-[#f43f5e]">0dB</span>
                      <span className="ml-1 text-[#94a3b8]">| LIN FFT</span>
                    </div>
                  </div>
                </div>
              )}

              {/* COLLAPSIBLE BOTTOM FORENSIC PIPELINE DOCK */}
              <div className="h-10 w-full bg-[#111722] border border-[#1c2433] mt-1 flex items-center justify-between px-3 shrink-0 rounded font-mono text-[9px]">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <span className="uppercase tracking-wider text-[#64748b] shrink-0 mr-1">DSP PIPELINE:</span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#20e3b2]/30 text-[#20e3b2] shrink-0">
                    <Check className="w-3 h-3" />
                    <span>SHA-256 (0.2s)</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#20e3b2]/30 text-[#20e3b2] shrink-0">
                    <Check className="w-3 h-3" />
                    <span>PCM Decode (0.4s)</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#20e3b2]/30 text-[#20e3b2] shrink-0">
                    <Check className="w-3 h-3" />
                    <span>FFT STFT (1.1s)</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#20e3b2]/30 text-[#20e3b2] shrink-0">
                    <Check className="w-3 h-3" />
                    <span>Diarization (1.8s)</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#f43f5e]/40 text-[#f43f5e] font-bold shrink-0">
                    <AlertTriangle className="w-3 h-3 text-[#f43f5e]" />
                    <span>TTS Model (3.2s)</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171d29] border border-[#f59e0b]/40 text-[#f59e0b] shrink-0">
                    <Check className="w-3 h-3" />
                    <span>Spectral Discont (2.4s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-[#64748b]">
                  <span>TOTAL ENGINE TIME: <strong className="text-white">9.1s</strong></span>
                  <span className="text-[#253043]">|</span>
                  <span className="text-[#f59e0b] font-semibold">BENCHMARK ONLY · NON-CONCLUSIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== RIGHT RAIL: CONTEXTUAL FORENSIC INSPECTOR ==================== */}
        <aside className="w-[340px] flex flex-col bg-[#111722] border-l border-[#1c2433] shrink-0 h-full overflow-hidden">
          {/* Header */}
          <div className="h-10 px-3 bg-[#171d29] border-b border-[#1c2433] flex items-center justify-between shrink-0 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#35c6a0]" />
              <span className="font-bold text-[12px] text-white uppercase tracking-wide">AUDIO INSPECTOR</span>
              <span className="text-[#64748b]">//</span>
              <span className="text-[11px] text-[#35c6a0] font-semibold">
                {selectedFindingId ? selectedFindingId.slice(-6) : 'AUD_01'}
              </span>
            </div>
            <span className="text-[10px] text-[#94a3b8] px-1.5 py-0.5 bg-[#090d14] rounded border border-[#1c2433]">
              {evidence.evidence_id}
            </span>
          </div>

          {/* Inspector Tabs */}
          <div className="flex items-center px-1 bg-[#090d14] border-b border-[#1c2433] shrink-0 text-[10.5px] font-mono">
            <button
              onClick={() => setInspectorTab('findings')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                inspectorTab === 'findings' ? 'text-[#35c6a0] border-b-2 border-[#35c6a0]' : 'text-[#64748b] hover:text-white'
              }`}
            >
              Findings ({audioFindings.length})
            </button>
            <button
              onClick={() => setInspectorTab('specs')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                inspectorTab === 'specs' ? 'text-[#38bdf8] border-b-2 border-[#38bdf8]' : 'text-[#64748b] hover:text-white'
              }`}
            >
              Specs
            </button>
            <button
              onClick={() => setInspectorTab('speakers')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                inspectorTab === 'speakers' ? 'text-[#a855f7] border-b-2 border-[#a855f7]' : 'text-[#64748b] hover:text-white'
              }`}
            >
              Speakers
            </button>
            <button
              onClick={() => setInspectorTab('spectral')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                inspectorTab === 'spectral' ? 'text-[#f59e0b] border-b-2 border-[#f59e0b]' : 'text-[#64748b] hover:text-white'
              }`}
            >
              Spectral
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-0">
            {/* FINDINGS TAB */}
            {inspectorTab === 'findings' && (
              <div className="space-y-2.5">
                {audioFindings.length === 0 ? (
                  <div className="p-4 bg-[#171d29] rounded border border-[#1c2433] text-center space-y-2">
                    <p className="text-xs text-[#94a3b8]">No audio forensic findings registered for this asset.</p>
                    <p className="text-[10.5px] text-[#64748b] leading-relaxed">
                      Execute audio analysis pipelines to detect synthetic voice artifacts, spectral phase discontinuities, and background noise profile shifts.
                    </p>
                    <button
                      onClick={() => onTriggerAnalysis(['audio_spectral_analysis', 'audio_synthetic_voice'])}
                      className="mt-2 px-3 py-1.5 bg-[#35c6a0] hover:bg-[#20e3b2] text-[#00382a] rounded text-xs font-semibold transition cursor-pointer"
                    >
                      Run Audio Forensic Pipelines
                    </button>
                  </div>
                ) : (
                  <>
                    {audioFindings.map((f) => {
                      const isSelected = selectedFindingId === f.finding_id;
                      const startTime = typeof f.media_location?.start_time === 'number'
                        ? f.media_location.start_time
                        : null;
                      const endTime = typeof f.media_location?.end_time === 'number'
                        ? f.media_location.end_time
                        : null;
                      const timeLabel = f.media_location?.smpte_start
                        ? `${f.media_location.smpte_start}${f.media_location.smpte_end ? ` – ${f.media_location.smpte_end}` : ''}`
                        : (startTime !== null ? `${startTime.toFixed(2)}s${endTime !== null ? ` – ${endTime.toFixed(2)}s` : ''}` : null);

                      const isSuspicious = f.classification === 'manipulation_indicator' || f.classification === 'ai_generated_indicator';
                      const isAnomaly = f.classification === 'metadata_anomaly' || f.classification === 'compression_anomaly';

                      const badgeColorClass = isSuspicious
                        ? 'text-[#f43f5e] bg-[#f43f5e]/10 border-[#f43f5e]/30'
                        : isAnomaly
                        ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30'
                        : 'text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30';

                      const cardBorderClass = isSelected
                        ? (isSuspicious ? 'border-[#f43f5e] ring-1 ring-[#f43f5e]/50' : 'border-[#38bdf8] ring-1 ring-[#38bdf8]/50')
                        : (isSuspicious ? 'border-[#f43f5e]/40 hover:border-[#f43f5e]' : 'border-[#1c2433] hover:border-[#38bdf8]/50');

                      return (
                        <div
                          key={f.finding_id}
                          onClick={() => {
                            if (startTime !== null) seekTo(startTime);
                            onSelectFinding(f.finding_id);
                          }}
                          className={`p-2.5 rounded bg-[#171d29] border shadow-sm transition-all cursor-pointer ${cardBorderClass}`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className={`font-mono text-[9px] uppercase tracking-wider font-bold px-1 py-0.5 rounded border truncate max-w-[200px] ${badgeColorClass}`}>
                              {f.classification ? f.classification.replace(/_/g, ' ') : 'FINDING'} // {f.finding_id.slice(-8)}
                            </span>
                            {timeLabel && (
                              <span className="px-1.5 py-0.5 rounded bg-[#090d14] border border-[#1c2433] text-[#cbd5e1] font-mono text-[9px] font-bold shrink-0">
                                {timeLabel}
                              </span>
                            )}
                          </div>

                          <h4 className="font-semibold text-xs text-white mb-1">
                            {f.finding_type.replace(/_/g, ' ').toUpperCase()}
                          </h4>

                          <div className="space-y-1 my-2 font-mono text-[10px] bg-[#090d14] p-2 rounded border border-[#1c2433]">
                            <div className="flex items-center justify-between">
                              <span className="text-[#64748b]">Model / Method:</span>
                              <span className="text-white font-semibold truncate max-w-[170px]" title={f.model_id || f.method_id}>
                                {f.model_id || f.method_id}
                              </span>
                            </div>
                            {f.score !== undefined && f.score !== null && (
                              <div className="flex items-center justify-between">
                                <span className="text-[#64748b]">Score:</span>
                                <span className="text-[#f59e0b] font-semibold">{f.score} ({f.score_semantics || 'calibrated'})</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-[#64748b]">Calibration:</span>
                              <span className="text-[#cbd5e1] uppercase">{f.calibration_status || 'uncalibrated'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#64748b]">Reliability:</span>
                              <span className="text-[#38bdf8] capitalize">{f.method_reliability || 'indicative'}</span>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#94a3b8] leading-relaxed mb-2 font-sans">
                            {f.explanation}
                          </p>

                          {f.limitations && (
                            <div className="p-1.5 bg-[#090d14] border border-[#1c2433] rounded mb-2 flex items-start gap-1 font-mono text-[8.5px] text-[#64748b]">
                              <Info className="w-3 h-3 text-[#f59e0b] shrink-0 mt-0.5" />
                              <span>{f.limitations}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            {startTime !== null ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  seekTo(startTime);
                                  onSelectFinding(f.finding_id);
                                }}
                                className="h-6 px-2.5 flex items-center justify-center gap-1 rounded bg-[#1f2737] hover:bg-[#353942] border border-[#1c2433] text-white font-mono text-[10px] transition-colors cursor-pointer"
                              >
                                <span>Jump to TC ({startTime.toFixed(2)}s)</span>
                              </button>
                            ) : <div />}
                            <span className={`text-[9px] font-mono uppercase ${isSuspicious ? 'text-[#f43f5e]' : 'text-[#38bdf8]'}`}>
                              {isSelected ? 'Active Selection' : 'Flagged'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 border-t border-[#1c2433] flex items-center justify-between">
                      <span className="text-[10px] text-[#64748b] font-mono">
                        {audioFindings.length} finding{audioFindings.length === 1 ? '' : 's'} recorded
                      </span>
                      <button
                        onClick={() => onTriggerAnalysis(['audio_spectral_analysis', 'audio_synthetic_voice'])}
                        className="px-2.5 py-1 bg-[#1f2737] hover:bg-[#353942] border border-[#1c2433] text-[10.5px] text-[#35c6a0] rounded transition cursor-pointer"
                      >
                        Re-run Audio Pipelines
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* SPECS TAB */}
            {inspectorTab === 'specs' && (
              <div className="space-y-2 font-mono text-[10px]">
                <div className="p-2 bg-[#171d29] rounded border border-[#1c2433] space-y-1.5">
                  <span className="text-white font-bold uppercase text-[10.5px]">Acoustic Signal Characteristics</span>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">SAMPLE RATE:</span>
                    <span className="text-[#35c6a0]">48,000 Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">BIT DEPTH:</span>
                    <span className="text-white">24-bit Linear PCM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">CHANNELS:</span>
                    <span className="text-white">2 (Stereo L / R)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">DURATION:</span>
                    <span className="text-white">00:02:48.000 (168.0s)</span>
                  </div>
                </div>

                <div className="p-2 bg-[#171d29] rounded border border-[#1c2433] space-y-1">
                  <div className="flex items-center justify-between text-[#64748b] text-[9px]">
                    <span>SHA-256 BITSTREAM DIGEST</span>
                    <button onClick={copyDigest} className="text-[#35c6a0] hover:underline flex items-center gap-0.5">
                      {copiedHash ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedHash ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                  <div className="text-[#35c6a0] text-[9px] break-all">
                    {evidence.sha256_digest}
                  </div>
                </div>
              </div>
            )}

            {/* SPEAKERS TAB */}
            {inspectorTab === 'speakers' && (
              <div className="space-y-2 font-mono text-[10px]">
                <div className="p-2 bg-[#171d29] rounded border border-[#1c2433] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#a855f7] font-bold">SPK-01 (Target Speaker)</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#a855f7]/20 text-[#a855f7] text-[8.5px]">74.5% Active</span>
                  </div>
                  <div className="text-[#94a3b8] text-[9.5px]">Mean F0 Pitch: 124.2 Hz · Jitter: 0.82%</div>
                </div>
                <div className="p-2 bg-[#171d29] rounded border border-[#1c2433] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#38bdf8] font-bold">SPK-02 (Journalist)</span>
                    <span className="px-1.5 py-0.2 rounded bg-[#38bdf8]/20 text-[#38bdf8] text-[8.5px]">25.5% Active</span>
                  </div>
                  <div className="text-[#94a3b8] text-[9.5px]">Mean F0 Pitch: 198.5 Hz · Jitter: 1.14%</div>
                </div>
              </div>
            )}

            {/* SPECTRAL TAB */}
            {inspectorTab === 'spectral' && (
              <div className="space-y-1.5 font-mono text-[10px] p-2 bg-[#171d29] rounded border border-[#1c2433]">
                <span className="text-white font-bold uppercase text-[10.5px]">STFT Analysis Parameters</span>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Window Function:</span>
                  <span className="text-white">Blackman-Harris 4096</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Overlap Ratio:</span>
                  <span className="text-white">87.5% (3584 samples)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Frequency Resolution:</span>
                  <span className="text-white">11.72 Hz / bin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Time Resolution:</span>
                  <span className="text-white">2.67 ms / frame</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Nyquist Frequency:</span>
                  <span className="text-[#35c6a0]">24,000 Hz</span>
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE ANALYST NOTE DOCK AT BOTTOM */}
          <div className="p-2.5 bg-[#171d29] border-t border-[#1c2433] flex flex-col gap-1.5 shrink-0 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#38bdf8]" />
                ACTIVE ANALYST NOTE
              </span>
              <span className="text-[#64748b] text-[9px]">DR. E. VANCE</span>
            </div>
            <textarea
              value={annotationNote}
              onChange={e => setAnnotationNote(e.target.value)}
              placeholder="Enter forensic finding notes..."
              rows={2}
              className="w-full bg-[#090d14] border border-[#1c2433] rounded p-1.5 text-white text-[10px] placeholder:text-[#64748b] focus:border-[#35c6a0] outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-[#20e3b2] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20e3b2]"></span>
                {annotations.length} pins registered
              </span>
              <button
                disabled={isSubmittingNote || !annotationNote.trim()}
                onClick={handleCommitNote}
                className="h-6 px-3 rounded bg-[#35c6a0] text-[#00382a] font-bold text-[10px] uppercase hover:bg-[#20e3b2] transition-colors disabled:opacity-50"
              >
                {isSubmittingNote ? 'Saving...' : 'Commit Audio Note'}
              </button>
            </div>

            {/* Recent annotations list */}
            {annotations.length > 0 && (
              <div className="max-h-20 overflow-y-auto space-y-1 mt-1 pt-1 border-t border-[#1c2433]/60">
                {annotations.map(a => (
                  <div key={a.annotation_id} className="p-1 bg-[#090d14] rounded border border-[#1c2433] flex items-center justify-between text-[9px]">
                    <div className="truncate flex items-center gap-1">
                      <span className="text-[#38bdf8]">{a.label}:</span>
                      <span className="text-[#cbd5e1] truncate">{a.notes || ''}</span>
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
          <span className="text-white font-bold uppercase tracking-wider text-[9.5px]">SPECTRIX DSP ENGINE:</span>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>STFT Transform 1.1s</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>NeuralAcoustic 3.2s</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.2 bg-[#111722] rounded border border-[#1c2433] text-[#94a3b8]">
            <span className="text-[#35c6a0] font-bold">✓</span>
            <span>Phase Splice 2.4s</span>
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
