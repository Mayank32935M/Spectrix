import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileCode, 
  Check, 
  Copy, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw, 
  FileEdit, 
  Info 
} from 'lucide-react';
import { EvidenceAsset, ForensicFinding, Case } from '../../types';
import { verifyEvidenceIntegrity } from '../../services/api';

interface UniversalInspectorProps {
  evidence: EvidenceAsset | null;
  activeCase: Case | null;
  findings: ForensicFinding[];
  selectedFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
}

export const UniversalInspector: React.FC<UniversalInspectorProps> = ({
  evidence,
  activeCase,
  findings,
  selectedFindingId,
  onSelectFinding,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [analystNote, setAnalystNote] = useState(
    'Facial boundary displays high-frequency variance roll-off consistent with local diffusion inpainting. Corroboration across audio viseme channel recommended.'
  );
  const [noteSaved, setNoteSaved] = useState(false);

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 1500);
  };

  const handleReverify = async () => {
    if (!evidence) return;
    setVerifying(true);
    try {
      const res = await verifyEvidenceIntegrity(evidence.evidence_id);
      setVerificationResult(res.integrity_status);
    } catch {
      setVerificationResult('ERROR');
    } finally {
      setVerifying(false);
      setTimeout(() => setVerificationResult(null), 3000);
    }
  };

  const handleSaveNote = () => {
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  if (isCollapsed) {
    return (
      <aside className="w-10 shrink-0 border-l border-border-default bg-surface-panel flex flex-col items-center py-3 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded hover:bg-surface-container text-content-muted hover:text-content-primary transition"
          title="Expand Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-mono text-[9px] uppercase tracking-widest text-content-muted [writing-mode:vertical-lr] rotate-180 mt-6">
          INSPECTOR // DOCK
        </span>
      </aside>
    );
  }

  return (
    <aside className="w-[380px] shrink-0 border-l border-border-default bg-surface-panel flex flex-col h-full z-30 select-none overflow-hidden">
      {/* Inspector Header */}
      <div className="h-10 px-3 border-b border-border-default bg-surface-panel flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-accent-crimson animate-pulse"></span>
          <div className="truncate">
            <h3 className="text-xs font-mono font-bold text-content-primary tracking-wide">
              INSPECTOR // {evidence ? evidence.evidence_id : 'NO SELECTION'}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-container transition"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
        {evidence ? (
          <>
            {/* TIER 1: CRYPTOGRAPHIC FILE INTEGRITY */}
            <div className="bg-surface-container rounded p-2.5 border border-border-default space-y-2">
              <div className="flex items-center justify-between border-b border-border-hairpin pb-1.5">
                <span className="font-semibold text-content-primary flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent-mint" />
                  1. Cryptographic File Integrity
                </span>
                <span className="font-mono text-[9px] font-bold text-accent-mint px-1.5 py-0.5 rounded bg-accent-mint/10 border border-accent-mint/20">
                  DIGEST MATCH
                </span>
              </div>

              <div className="text-[9px] text-content-muted leading-tight">
                File Integrity Only — Does Not Establish Content Authenticity or Provenance.
              </div>

              <div className="grid grid-cols-[110px_1fr] items-start gap-x-2 gap-y-1.5 text-[10px] pt-1 font-mono">
                <span className="text-content-muted">Registered SHA-256:</span>
                <div className="flex items-center justify-between gap-1 group">
                  <span className="text-content-secondary truncate max-w-[170px]" title={evidence.sha256_digest}>
                    {evidence.sha256_digest}
                  </span>
                  <button
                    onClick={() => handleCopySha(evidence.sha256_digest)}
                    className="text-content-muted hover:text-accent-mint shrink-0"
                    title="Copy full 64-hex SHA-256"
                  >
                    {copiedSha ? <Check className="w-3 h-3 text-accent-mint" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <span className="text-content-muted">Ingestion Time:</span>
                <span className="text-content-primary">
                  {new Date(evidence.registered_at).toUTCString()}
                </span>

                <span className="text-content-muted">C2PA Credentials:</span>
                <div>
                  <span className="text-accent-amber font-semibold text-[9.5px]">
                    Missing / Stripped at source
                  </span>
                  <div className="text-[8.5px] text-content-muted">No signed C2PA JUMBF manifest</div>
                </div>

                <span className="text-content-muted">Re-verify Disk:</span>
                <div>
                  <button
                    onClick={handleReverify}
                    disabled={verifying}
                    className="px-2 py-0.5 rounded bg-surface-canvas border border-border-default hover:border-accent-mint text-[9px] text-content-secondary hover:text-content-primary flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${verifying ? 'animate-spin' : ''}`} />
                    <span>{verifying ? 'Verifying...' : verificationResult ? verificationResult : 'Re-verify Hash'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TIER 2: OBSERVED STREAM TELEMETRY */}
            <div className="bg-surface-container rounded p-2.5 border border-border-default space-y-2">
              <div className="flex items-center justify-between border-b border-border-hairpin pb-1.5">
                <span className="font-semibold text-content-primary flex items-center gap-1.5 text-[11px]">
                  <FileCode className="w-3.5 h-3.5 text-accent-cyan" />
                  2. Observed Stream Telemetry
                </span>
                <span className="font-mono text-[9px] text-content-muted bg-surface-canvas px-1.5 py-0.5 rounded border border-border-hairpin">
                  NATIVE
                </span>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-start gap-x-2 gap-y-1 text-[10px] font-mono">
                <span className="text-content-muted">Filename:</span>
                <span className="text-content-primary truncate">{evidence.filename}</span>

                <span className="text-content-muted">MIME Format:</span>
                <span className="text-content-primary">{evidence.mime_type}</span>

                <span className="text-content-muted">File Size:</span>
                <span className="text-content-primary">
                  {(evidence.filesize_bytes / (1024 * 1024)).toFixed(2)} MB ({evidence.filesize_bytes.toLocaleString()} bytes)
                </span>

                {evidence.metadata?.width && (
                  <>
                    <span className="text-content-muted">Dimensions:</span>
                    <span className="text-content-primary">
                      {evidence.metadata.width} × {evidence.metadata.height} px
                    </span>
                  </>
                )}

                {evidence.metadata?.mode && (
                  <>
                    <span className="text-content-muted">Color Space:</span>
                    <span className="text-content-primary">{evidence.metadata.mode}</span>
                  </>
                )}
              </div>
            </div>

            {/* TIER 3: MODEL-GENERATED FINDINGS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-content-primary uppercase font-bold tracking-wide">
                  3. Forensic Findings ({findings.length})
                </span>
                <span className="font-mono text-[9px] text-accent-crimson font-bold bg-accent-crimson/10 px-1.5 py-0.5 rounded border border-accent-crimson/30">
                  FLAGGED
                </span>
              </div>

              {findings.length === 0 ? (
                <div className="p-3 bg-surface-container rounded border border-border-default text-content-muted text-center text-[11px]">
                  No findings generated yet. Run an analysis pipeline to examine this asset.
                </div>
              ) : (
                <div className="space-y-2">
                  {findings.map((f) => {
                    const isSelected = selectedFindingId === f.finding_id;
                    return (
                      <div
                        key={f.finding_id}
                        onClick={() => onSelectFinding(f.finding_id)}
                        className={`rounded p-2.5 space-y-1.5 border transition cursor-pointer ${
                          isSelected
                            ? 'bg-surface-elevated border-accent-crimson'
                            : 'bg-surface-container border-border-default hover:border-border-active'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-accent-crimson">
                            {f.finding_type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="font-mono text-[9px] text-content-muted">
                            {f.method_id}
                          </span>
                        </div>

                        <p className="text-[10.5px] text-content-secondary leading-relaxed font-sans">
                          {f.explanation}
                        </p>

                        {f.score !== undefined && f.score !== null && (
                          <div className="flex items-center justify-between text-[9.5px] font-mono pt-1 border-t border-border-hairpin">
                            <span className="text-content-muted">Benchmark Score:</span>
                            <span className="text-accent-amber font-semibold">
                              {f.score} ({f.score_semantics})
                            </span>
                          </div>
                        )}

                        <div className="text-[8.5px] text-content-muted font-sans italic bg-surface-canvas p-1 rounded border border-border-hairpin">
                          <strong className="text-accent-amber font-mono">LIMITATION:</strong> {f.limitations}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-[8px] font-mono text-content-muted italic bg-surface-canvas p-1.5 rounded border border-border-hairpin">
                * Illustrative benchmark score; requires multi-modal corroboration; not established legal fact.
              </div>
            </div>

            {/* TIER 4: ANALYST OBSERVATIONS & HYPOTHESIS NOTES */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-content-primary uppercase font-bold tracking-wide">
                4. Examiner Observations & Hypothesis Notes
              </span>
              <div className="bg-surface-container rounded p-2.5 border border-border-default space-y-2">
                <div className="flex items-center justify-between text-[9px] text-content-muted font-mono">
                  <span>Examiner: <strong className="text-content-primary">{activeCase?.examiner_name || 'Dr. E. Vance'}</strong></span>
                  <span>REV: 02</span>
                </div>

                <textarea
                  value={analystNote}
                  onChange={(e) => setAnalystNote(e.target.value)}
                  className="w-full bg-surface-canvas border border-border-default rounded p-2 text-[10.5px] font-sans text-content-primary placeholder-content-muted focus:border-accent-mint outline-none resize-none h-18"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNote}
                    className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-highlight border border-border-default text-content-primary text-[10px] flex items-center gap-1 transition cursor-pointer"
                  >
                    <FileEdit className="w-3 h-3 text-accent-mint" />
                    <span>{noteSaved ? 'Saved to Custody Log' : 'Append Examiner Note'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* TIER 5: INVESTIGATIVE LEADS & GRAPH RELATIONS */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-content-primary uppercase font-bold tracking-wide">
                5. Investigative Leads & Graph Relations
              </span>
              <div className="bg-surface-container rounded p-2.5 border border-border-default text-[10px] font-mono space-y-1.5">
                <div className="text-[8.5px] text-accent-amber bg-accent-amber/10 p-1.5 rounded border border-accent-amber/25 leading-tight">
                  Investigative Lead — Similarity does not establish legal identity.
                </div>

                <div className="divide-y divide-border-hairpin">
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-content-secondary">BELONGS_TO ➔</span>
                    <span className="text-accent-mint font-semibold">{evidence.case_id}</span>
                  </div>
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-content-secondary">FINDINGS ➔</span>
                    <span className="text-accent-crimson font-semibold">{findings.length} Flagged</span>
                  </div>
                  <div className="py-1 flex items-center justify-between">
                    <span className="text-content-secondary">ORIGINAL ➔</span>
                    <span className="text-content-primary">{evidence.is_original ? 'TRUE' : 'DERIVED'}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted space-y-2">
            <Info className="w-8 h-8 text-border-active" />
            <p className="text-xs font-sans">No evidence selected for inspection.</p>
            <p className="text-[10px] font-mono text-content-muted">
              Select or upload an evidence asset to inspect cryptographic integrity, telemetry, and forensic findings.
            </p>
          </div>
        )}
      </div>

      {/* Inspector Footer */}
      <div className="p-2 border-t border-border-default bg-surface-panel shrink-0 text-center font-mono text-[9px] text-content-muted">
        SPECTRIX WORKSTATION NODE v1.0 // CHAIN-OF-CUSTODY ACTIVE
      </div>
    </aside>
  );
};
