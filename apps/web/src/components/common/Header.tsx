import React from 'react';
import { 
  ShieldCheck, 
  Network, 
  Image as ImageIcon, 
  Film, 
  AudioWaveform, 
  FileText, 
  CheckCircle2,
  Sparkles,
  FolderLock,
  FolderOpen,
  ChevronDown,
  Edit2,
  Plus
} from 'lucide-react';
import { Case, EvidenceAsset, ActiveWorkspace } from '../../types';

interface HeaderProps {
  currentWorkspace: ActiveWorkspace;
  onSelectWorkspace: (workspace: ActiveWorkspace) => void;
  activeCase: Case | null;
  activeEvidence: EvidenceAsset | null;
  caseEvidenceCount: number;
  onOpenExportModal: () => void;
  onOpenCopilot: () => void;
  onOpenCaseManager: () => void;
  onOpenEvidenceVault: () => void;
  onOpenExaminerModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentWorkspace,
  onSelectWorkspace,
  activeCase,
  activeEvidence,
  caseEvidenceCount,
  onOpenExportModal,
  onOpenCopilot,
  onOpenCaseManager,
  onOpenEvidenceVault,
  onOpenExaminerModal,
}) => {
  const getInitials = (name?: string) => {
    if (!name) return 'EX';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="h-12 border-b border-border-default bg-surface-panel px-3 flex items-center justify-between shrink-0 z-40 select-none overflow-x-hidden min-w-0 gap-2">
      {/* Zone 1: Branding & Case / Evidence Context (Flexible min-w-0) */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        {/* Branding */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-border-hairpin shrink-0">
          <div className="w-6 h-6 rounded bg-accent-mint/15 border border-accent-mint/40 flex items-center justify-center text-accent-mint">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <span className="font-sans font-bold text-xs text-content-primary tracking-tight">
            SPECTRIX
          </span>
          <span className="text-[9px] font-mono font-medium px-1 py-0.2 rounded bg-surface-canvas border border-border-hairpin text-content-muted hidden lg:inline">
            v1.0
          </span>
        </div>

        {/* Case Badge (Interactive Case Selector) */}
        <button
          onClick={onOpenCaseManager}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-elevated border border-border-default hover:border-accent-amber/50 font-mono text-xs transition cursor-pointer shrink-0"
          title="Click to Switch or Create Cases"
        >
          <FolderLock className="w-3 h-3 text-accent-amber" />
          <span className="text-content-muted text-[10px]">CASE:</span>
          <span className="text-accent-amber font-bold">
            {activeCase?.case_number || 'SELECT CASE'}
          </span>
          <ChevronDown className="w-2.5 h-2.5 text-content-muted" />
        </button>

        {/* Active Evidence Badge (Interactive Evidence Vault Selector) */}
        {activeEvidence ? (
          <button
            onClick={onOpenEvidenceVault}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-elevated border border-border-default hover:border-accent-cyan/50 font-mono text-[10.5px] transition cursor-pointer min-w-0 max-w-[200px]"
            title={`Evidence ID: ${activeEvidence.evidence_id} (${activeEvidence.filename}) - Click to browse all evidence`}
          >
            <FolderOpen className="w-3 h-3 text-accent-cyan shrink-0" />
            <span className="text-accent-cyan font-bold shrink-0">{activeEvidence.evidence_id}</span>
            <span className="text-content-secondary truncate hidden sm:inline">{activeEvidence.filename}</span>
            <ChevronDown className="w-2.5 h-2.5 text-content-muted shrink-0" />
          </button>
        ) : (
          <button
            onClick={onOpenEvidenceVault}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-canvas hover:bg-surface-container border border-dashed border-border-default hover:border-accent-mint/50 font-mono text-[10.5px] text-content-muted transition cursor-pointer shrink-0"
            title="Browse or Ingest Evidence"
          >
            <Plus className="w-3 h-3 text-accent-mint" />
            <span>Vault ({caseEvidenceCount})</span>
          </button>
        )}
      </div>

      {/* Zone 2: Workspace Navigation Switcher (Compact & Centered) */}
      <nav className="flex items-center bg-surface-canvas p-0.5 rounded border border-border-default shrink-0">
        <button
          onClick={() => onSelectWorkspace('canvas')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium cursor-pointer ${
            currentWorkspace === 'canvas'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Evidence Intelligence Canvas"
        >
          <Network className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Canvas</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('image')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium cursor-pointer ${
            currentWorkspace === 'image'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Image Examination Studio"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Image</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('video')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium cursor-pointer ${
            currentWorkspace === 'video'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Video Examination Studio"
        >
          <Film className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Video</span>
        </button>

        <button
          onClick={() => onSelectWorkspace('audio')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium cursor-pointer ${
            currentWorkspace === 'audio'
              ? 'bg-surface-elevated text-accent-mint border border-accent-mint/30 shadow-sm'
              : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
          }`}
          title="Audio Examination Studio"
        >
          <AudioWaveform className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Audio</span>
        </button>
      </nav>

      {/* Zone 3: Verification HUD, Sync & Actions (Non-Overflowing & Fully Grouped) */}
      <div className="flex items-center gap-2 font-mono text-xs shrink-0">
        {/* SHA-256 Verification Badge */}
        {activeEvidence ? (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-border-default"
            title="Registered SHA-256 digest match. File integrity only — does not establish content authenticity or provenance."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-mint"></span>
            <span className="text-[10px] text-accent-mint font-semibold uppercase tracking-wider">
              MATCH
            </span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-border-default text-content-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-content-muted"></span>
            <span className="text-[10px] uppercase">NO ASSET</span>
          </div>
        )}

        <div className="hidden 2xl:flex items-center gap-1 text-[10px] text-content-muted px-1.5 py-0.5 bg-surface-canvas rounded border border-border-hairpin">
          <CheckCircle2 className="w-3 h-3 text-accent-mint" />
          <span>SYNCED</span>
        </div>

        {/* Forensic Copilot Button */}
        <button
          onClick={onOpenCopilot}
          className="h-7 px-2 sm:px-2.5 rounded bg-surface-container hover:bg-surface-elevated border border-border-default hover:border-accent-cyan/50 text-content-primary text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Evidence-Grounded Forensic Copilot Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="hidden sm:inline">Copilot</span>
        </button>

        {/* Affidavit Export Button */}
        <button
          onClick={onOpenExportModal}
          className="h-7 px-2 sm:px-2.5 rounded bg-surface-container hover:bg-surface-elevated border border-border-default hover:border-accent-mint/50 text-content-primary text-xs font-sans font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Export ISO/IEC 27037 Forensic Affidavit"
        >
          <FileText className="w-3.5 h-3.5 text-accent-mint" />
          <span className="hidden sm:inline">Affidavit</span>
        </button>

        {/* Examiner Profile Avatar & Name (Interactive Edit Button) */}
        <button
          onClick={onOpenExaminerModal}
          className="flex items-center gap-1.5 pl-2 border-l border-border-hairpin hover:opacity-90 transition cursor-pointer text-left"
          title="Click to edit Lead Examiner identity"
        >
          <div className="w-6 h-6 rounded bg-surface-elevated border border-border-default flex items-center justify-center font-mono text-[10px] font-bold text-accent-mint shrink-0">
            {getInitials(activeCase?.examiner_name)}
          </div>
          <div className="hidden xl:block leading-none">
            <div className="text-[11px] font-semibold text-content-primary truncate max-w-[90px]">
              {activeCase?.examiner_name || 'Unassigned'}
            </div>
            <div className="text-[8.5px] font-mono text-content-muted flex items-center gap-0.5">
              <span>EXAMINER</span>
              <Edit2 className="w-2 h-2 text-accent-mint" />
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};
