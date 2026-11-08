import React from 'react';
import { EvidenceAsset, Case, ForensicFinding } from '../types';
import { EmptyUploadZone } from '../components/common/EmptyUploadZone';

interface VideoStudioProps {
  evidence: EvidenceAsset | null;
  activeCase: Case | null;
  findings: ForensicFinding[];
  onUploadEvidence: (file: File, precomputedSha256: string) => Promise<void>;
}

export const VideoStudio: React.FC<VideoStudioProps> = ({
  evidence,
  activeCase: _activeCase,
  findings: _findings,
  onUploadEvidence,
}) => {
  if (!evidence) {
    return (
      <EmptyUploadZone
        onFileUpload={onUploadEvidence}
        modalityFilter="video"
      />
    );
  }

  const videoUrl = `/api/v1/evidence/${evidence.evidence_id}/file`;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-canvas overflow-hidden select-none">
      {/* Telemetry Bar */}
      <div className="h-8 border-b border-border-default bg-surface-panel px-3 flex items-center justify-between text-xs font-mono z-20">
        <div className="flex items-center gap-3 text-content-muted">
          <div className="flex items-center gap-1">
            <span>TC:</span>
            <span className="text-accent-cyan font-semibold">00:01:14:18</span>
          </div>
          <span className="text-border-hairpin">|</span>
          <div className="flex items-center gap-1">
            <span>FRM:</span>
            <span className="text-content-primary">002238</span>
            <span className="text-content-muted">/ 005035</span>
          </div>
          <span className="text-border-hairpin">|</span>
          <span>1920×1080 @ 29.97 FPS (CFR)</span>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative overflow-hidden bg-tech-grid flex items-center justify-center p-4">
        <div className="relative max-w-4xl w-full aspect-video bg-black rounded border border-border-default shadow-2xl overflow-hidden flex items-center justify-center">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Scrubber / Timeline Footer */}
      <footer className="h-32 border-t border-border-default bg-surface-panel flex flex-col shrink-0 font-mono text-xs">
        <div className="h-7 px-3 border-b border-border-hairpin bg-surface-container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-content-primary font-bold">TIMELINE &amp; FRAMES</span>
            <span className="text-[10px] text-accent-crimson bg-accent-crimson/10 px-1.5 py-0.2 rounded border border-accent-crimson/30">
              FRAME 2,238 FLAGGED
            </span>
          </div>
          <div className="text-content-muted text-[10px]">
            H.264 (avc1) / AAC 48kHz
          </div>
        </div>

        <div className="flex-1 px-4 py-2 flex flex-col justify-center space-y-2">
          {/* Timeline Track with Anomaly Spans */}
          <div className="relative w-full h-8 bg-surface-canvas rounded border border-border-default overflow-hidden flex items-center">
            {/* Anomaly Marker */}
            <div
              className="absolute h-full bg-accent-crimson/40 border-l border-r border-accent-crimson"
              style={{ left: '42%', width: '6%' }}
              title="Viseme & Inpaint Anomaly (Frame 2,238)"
            />
            {/* Playhead */}
            <div
              className="absolute h-full w-0.5 bg-accent-cyan"
              style={{ left: '44%' }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-content-muted">
            <span>00:00:00:00</span>
            <span>00:01:14:18 (Active Needle)</span>
            <span>00:02:48:00</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
