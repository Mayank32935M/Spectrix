import React from 'react';
import { 
  ShieldCheck, 
  Network, 
  Image as ImageIcon, 
  Film, 
  AudioWaveform, 
  FileText, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Case, EvidenceAsset, ActiveWorkspace } from '../../types';

interface HeaderProps {
  currentWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  activeCase: Case | null;
  activeEvidence: EvidenceAsset | null;
  onOpenExportModal: () => void;
  onOpenCopilot: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  onSelectWorkspace,
  activeCase,
  activeEvidence,
  onOpenExportModal,
  onOpenCopilot,
}) => {
  return (
    <header className="h-12 border-b border-border-default bg-surface-panel px-3 flex items-center justify-between shrink-0 z-40 select-none">
      {/* Zone 1: Branding & Case Context */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 pr-3 border-r border-border-hairpin">
          <div className="w-6 h-6 rounded bg-accent-mint/15 border border-accent-mint/40 flex items-center justify-center text-accent-mint">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-sans font-bold text-xs text-content-primary tracking-tight">
              SPECTRIX
            </span>
            <span className="text-[9px] font-mono font-medium px-1 py-0.5 rounded bg-surface-canvas border border-border-hairpin text-content-muted">
              v1.0
            </span>
          </div>
        </div>

        {/* Case Badge */}
        {activeCase && (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-border-default">
              <span className="text-content-muted text-[10px]">CASE:</span>
              <span className="text-accent-amber font-semibold">{activeCase.case_number}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse"></span>
            </div>
            <span className="text-content-secondary font-sans text-xs hidden md:inline truncate max-w-[180px]">
              {activeCase.title}
            </span>
          </div>
        )}

        {/* Active Evidence Badge */}
        {activeEvidence && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border-hairpin font-mono text-[10px]">
            <span className="px-1.5 py-0.5 bg-surface-container border border-border-default text-accent-cyan rounded">
              {activeEvidence.evidence_id}
            </span>
            <span className="text-content-secondary truncate max-w-[140px]">
              {activeEvidence.filename}
            </span>
          </div>
        )}
      </div>

      {/* Zone 2: Workspace Navigation Switcher */}
      <nav className="flex items-center bg-surface-canvas p-0.5 rounded border border-border-default shrink-0">
        <button
          onClick={() => onSelectWorkspace('canvas')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            currentWorkspace === 'canvas'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Evidence Intelligence Canvas"
        >
          <Network className="w-3.5 h-3.5" />
          <span>Canvas</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('image')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            currentWorkspace === 'image'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Image Examination Studio"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image Studio</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('video')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            currentWorkspace === 'video'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Video Examination Studio"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Video Studio</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('audio')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium ${
            currentWorkspace === 'audio'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Audio Examination Studio"
        >
          <AudioWaveform className="w-3.5 h-3.5" />
          <span>Audio Studio</span>
        </button>
      </nav>

      {/* Zone 3: Verification HUD, Sync & Actions */}
      <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
        {/* SHA-256 Verification Badge */}
        {activeEvidence ? (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container border border-border-default"
            title="Registered SHA-256 digest match. File integrity only — does not establish content authenticity or provenance."
          >
            <span className="w-2 h-2 rounded-full bg-accent-mint"></span>
            <span className="text-[10px] text-accent-mint font-semibold uppercase tracking-wider">
              DIGEST MATCH
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container border border-border-default text-content-muted">
            <span className="w-2 h-2 rounded-full bg-content-muted"></span>
            <span className="text-[10px] uppercase">NO EVIDENCE LOADED</span>
          </div>
        )}

        <div className="hidden xl:flex items-center gap-1 text-[10px] text-content-muted px-1.5 py-0.5 bg-surface-canvas rounded border border-border-hairpin">
          <CheckCircle2 className="w-3 h-3 text-accent-mint" />
          <span>SYNCED</span>
        </div>

        {/* Forensic Copilot Button */}
        <button
          onClick={onOpenCopilot}
          className="h-7 px-2.5 rounded bg-surface-container hover:bg-surface-elevated border border-border-default hover:border-accent-cyan/50 text-content-primary text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Evidence-Grounded Forensic Copilot Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Copilot</span>
        </button>

        {/* Affidavit Export Button */}
        <button
          onClick={onOpenExportModal}
          className="h-7 px-2.5 rounded bg-surface-container hover:bg-surface-elevated border border-border-default hover:border-accent-mint/50 text-content-primary text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-accent-mint" />
          <span>Affidavit Export</span>
        </button>

        {/* Examiner Profile Avatar */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-border-hairpin">
          <div className="w-6 h-6 rounded bg-surface-elevated border border-border-default flex items-center justify-center font-mono text-[10px] font-bold text-accent-mint">
            EV
          </div>
          <div className="hidden 2xl:block text-left leading-none">
            <div className="text-[11px] font-semibold text-content-primary">
              {activeCase?.examiner_name || 'Dr. E. Vance'}
            </div>
            <div className="text-[8.5px] font-mono text-content-muted">EXAMINER</div>
          </div>
        </div>
      </div>
    </header>
  );
};
