import React from 'react';
import { AudioWaveform, Activity } from 'lucide-react';
import { EvidenceAsset, Case, ForensicFinding } from '../types';
import { EmptyUploadZone } from '../components/common/EmptyUploadZone';

interface AudioStudioProps {
  evidence: EvidenceAsset | null;
  activeCase: Case | null;
  findings: ForensicFinding[];
  onUploadEvidence: (file: File, precomputedSha256: string) => Promise<void>;
}

export const AudioStudio: React.FC<AudioStudioProps> = ({
  evidence,
  activeCase: _activeCase,
  findings: _findings,
  onUploadEvidence,
}) => {
  if (!evidence) {
    return (
      <EmptyUploadZone
        onFileUpload={onUploadEvidence}
        modalityFilter="audio"
      />
    );
  }

  const audioUrl = `/api/v1/evidence/${evidence.evidence_id}/file`;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-canvas overflow-hidden select-none">
      {/* HUD Telemetry Bar */}
      <div className="h-8 border-b border-border-default bg-surface-panel px-3 flex items-center justify-between text-xs font-mono z-20">
        <div className="flex items-center gap-3 text-content-muted">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-border-default">
            <span className="w-2 h-2 rounded-full bg-accent-mint animate-pulse"></span>
            <span className="text-accent-mint font-semibold uppercase text-[10px]">DSP CORE // READY</span>
          </div>
          <span className="text-border-hairpin">|</span>
          <span>4096-PT BLACKMAN-HARRIS</span>
          <span>•</span>
          <span>48 kHz / 24-bit PCM</span>
          <span>•</span>
          <span>NYQUIST: 24,000 HZ</span>
        </div>

        <div className="flex items-center gap-2 text-accent-crimson font-mono text-[10px] bg-accent-crimson/10 px-2 py-0.5 rounded border border-accent-crimson/30">
          <span>ACOUSTIC ANOMALY DETECTED</span>
        </div>
      </div>

      {/* Main Dual-Pane Viewport (Waveform & Spectrogram) */}
      <div className="flex-1 flex flex-col p-4 gap-3 bg-tech-grid overflow-hidden">
        {/* Waveform Viewport */}
        <div className="flex-1 bg-surface-panel rounded border border-border-default p-3 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono text-content-muted">
            <span className="font-bold text-content-primary flex items-center gap-1.5">
              <AudioWaveform className="w-3.5 h-3.5 text-accent-cyan" />
              DUAL-CHANNEL WAVEFORM (CH-L / CH-R)
            </span>
            <span>GAIN: 0.0 dB</span>
          </div>

          {/* Simulated Waveform Canvas graphic */}
          <div className="relative w-full h-32 bg-surface-canvas rounded border border-border-hairpin flex items-center justify-center overflow-hidden">
            <div className="w-full flex items-center justify-between px-4 h-24 gap-0.5">
              {Array.from({ length: 64 }).map((_, i) => {
                const height = Math.abs(Math.sin(i * 0.2)) * 60 + 10;
                const isAnomaly = i >= 24 && i <= 30;
                return (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition ${
                      isAnomaly ? 'bg-accent-crimson animate-pulse' : 'bg-accent-cyan/70'
                    }`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>

            {/* Playhead */}
            <div className="absolute top-0 bottom-0 left-[42%] w-0.5 bg-accent-mint shadow" />
          </div>

          <div className="flex items-center justify-between font-mono text-[10px] text-content-muted">
            <span>00:00:00.000</span>
            <span className="text-accent-mint font-semibold">00:00:52.420</span>
            <span>00:02:48.000</span>
          </div>
        </div>

        {/* Spectrogram Viewport */}
        <div className="flex-1 bg-surface-panel rounded border border-border-default p-3 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono text-content-muted">
            <span className="font-bold text-content-primary flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-accent-violet" />
              HIGH-RESOLUTION STFT SPECTROGRAM
            </span>
            <span className="text-accent-amber">Synthetic Formant Cutoff</span>
          </div>

          {/* Spectrogram Display Matrix */}
          <div className="relative w-full h-32 bg-surface-canvas rounded border border-border-hairpin overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-canvas via-accent-violet/20 to-accent-crimson/30 opacity-70" />
            <div
              className="absolute top-6 left-[38%] w-24 h-12 border border-dashed border-accent-crimson bg-accent-crimson/15 rounded flex items-center justify-center font-mono text-[9px] text-accent-crimson"
            >
              FORMANT DISCONTINUITY
            </div>
          </div>

          <div className="flex items-center justify-between font-mono text-[10px] text-content-muted">
            <span>0 Hz (DC)</span>
            <span>FREQ RANGE: 20 Hz - 20 kHz</span>
            <span>24,000 Hz (Nyquist)</span>
          </div>
        </div>
      </div>

      {/* Audio Transport Controls */}
      <footer className="h-16 border-t border-border-default bg-surface-panel px-4 flex items-center justify-between shrink-0 font-mono text-xs">
        <audio controls src={audioUrl} className="w-full max-w-xl h-10 accent-accent-mint" />
      </footer>
    </div>
  );
};
