import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  AudioWaveform, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  HardDrive, 
  Hash, 
  AlertCircle,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { Case, EvidenceAsset, Modality } from '../../types';

interface EvidenceVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Case | null;
  evidenceList: EvidenceAsset[];
  activeEvidence: EvidenceAsset | null;
  onSelectEvidence: (evidence: EvidenceAsset) => void;
  onUploadFiles: (files: File[]) => Promise<void>;
}

export const EvidenceVaultModal: React.FC<EvidenceVaultModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  evidenceList,
  activeEvidence,
  onSelectEvidence,
  onUploadFiles,
}) => {
  const [filterModality, setFilterModality] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredList = evidenceList.filter((item) => {
    if (filterModality === 'all') return true;
    return item.modality === filterModality;
  });

  const counts = {
    all: evidenceList.length,
    image: evidenceList.filter((e) => e.modality === 'image').length,
    video: evidenceList.filter((e) => e.modality === 'video').length,
    audio: evidenceList.filter((e) => e.modality === 'audio').length,
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    await processFiles(files);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    await processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = async (files: File[]) => {
    setUploading(true);
    setUploadStatus(`Ingesting ${files.length} evidence asset(s) into vault...`);
    try {
      await onUploadFiles(files);
      setUploadStatus(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Evidence intake failed');
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getModalityIcon = (mod: Modality | string) => {
    switch (mod) {
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-accent-cyan" />;
      case 'video': return <Film className="w-3.5 h-3.5 text-accent-violet" />;
      case 'audio': return <AudioWaveform className="w-3.5 h-3.5 text-accent-mint" />;
      default: return <FileText className="w-3.5 h-3.5 text-content-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-surface-panel border border-border-default rounded-lg max-w-4xl w-full flex flex-col h-[85vh] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="h-12 px-4 border-b border-border-default bg-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center text-accent-cyan">
              <FolderOpen className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-content-primary uppercase tracking-wider flex items-center gap-2">
                EVIDENCE VAULT & INTAKE
                <span className="text-[10px] text-accent-mint font-normal px-1.5 py-0.2 rounded bg-accent-mint/15 border border-accent-mint/30">
                  CASE: {activeCase?.case_number || 'UNSET'}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-content-muted hover:text-content-primary hover:bg-surface-elevated transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls Bar & Modality Filters */}
        <div className="px-4 py-2 border-b border-border-default bg-surface-canvas flex items-center justify-between shrink-0 font-mono text-xs flex-wrap gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterModality('all')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                filterModality === 'all'
                  ? 'bg-surface-elevated text-accent-mint border border-accent-mint/40 font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilterModality('image')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                filterModality === 'image'
                  ? 'bg-surface-elevated text-accent-cyan border border-accent-cyan/40 font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              <span>Images ({counts.image})</span>
            </button>
            <button
              onClick={() => setFilterModality('video')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                filterModality === 'video'
                  ? 'bg-surface-elevated text-accent-violet border border-accent-violet/40 font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Videos ({counts.video})</span>
            </button>
            <button
              onClick={() => setFilterModality('audio')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1 ${
                filterModality === 'audio'
                  ? 'bg-surface-elevated text-accent-mint border border-accent-mint/40 font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
              }`}
            >
              <AudioWaveform className="w-3 h-3" />
              <span>Audio ({counts.audio})</span>
            </button>
          </div>

          {/* Quick Upload Trigger */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload More Evidence</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>

        {/* Error / Upload Status Notification */}
        {errorMsg && (
          <div className="px-4 py-2 bg-accent-crimson/10 border-b border-accent-crimson/30 flex items-center gap-2 text-accent-crimson text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {uploading && (
          <div className="px-4 py-2 bg-accent-cyan/10 border-b border-accent-cyan/30 flex items-center gap-2 text-accent-cyan text-xs font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {/* Multi-file Drop Zone & Evidence Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Collapsible Drop Banner */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer ${
              isDragging
                ? 'border-accent-mint bg-accent-mint/10'
                : 'border-border-default hover:border-border-active bg-surface-canvas/50 hover:bg-surface-container/30'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              <Upload className="w-5 h-5 text-accent-mint" />
              <div className="text-xs font-semibold text-content-primary">
                Drag and drop multiple files to ingest additional evidence
              </div>
              <p className="text-[10px] text-content-muted font-mono">
                Supports Images (.jpg, .png, .webp), Videos (.mp4, .mov), and Audio (.wav, .mp3, .flac) · Precomputed SHA-256 seal
              </p>
            </div>
          </div>

          {/* Evidence List */}
          {filteredList.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="text-xs font-mono text-content-muted">
                No evidence items match filter &quot;{filterModality}&quot; in this case dossier.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((item) => {
                const isSelected = activeEvidence?.evidence_id === item.evidence_id;

                return (
                  <div
                    key={item.evidence_id}
                    className={`p-3.5 rounded border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-surface-container border-accent-mint/50 shadow-md'
                        : 'bg-surface-canvas border-border-default hover:border-border-active hover:bg-surface-container/50'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="p-1 rounded bg-surface-elevated border border-border-default">
                            {getModalityIcon(item.modality)}
                          </span>
                          <span className="text-[11px] font-bold text-accent-cyan">
                            {item.evidence_id}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-elevated border border-border-hairpin text-content-muted">
                            {item.modality}
                          </span>
                        </div>

                        {isSelected && (
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-accent-mint/15 text-accent-mint border border-accent-mint/40 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>

                      {/* Filename */}
                      <div className="text-xs font-semibold text-content-primary truncate font-mono" title={item.filename}>
                        {item.filename}
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-content-secondary font-mono pt-1">
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-content-muted" />
                          <span>{formatBytes(item.filesize_bytes)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-content-muted" />
                          <span>{new Date(item.registered_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* SHA-256 Digest */}
                      <div className="text-[9.5px] font-mono text-content-muted flex items-center gap-1 truncate bg-surface-panel p-1.5 rounded border border-border-hairpin">
                        <Hash className="w-3 h-3 text-accent-mint shrink-0" />
                        <span className="truncate text-content-secondary">{item.sha256_digest}</span>
                      </div>
                    </div>

                    {/* Footer Action */}
                    <div className="pt-2 border-t border-border-hairpin flex items-center justify-between font-mono text-xs">
                      <span className="text-[10px] text-content-muted">
                        Custody Chain: {item.custody_chain_length ?? 1} event(s)
                      </span>

                      {isSelected ? (
                        <div className="px-2.5 py-1 rounded bg-surface-elevated text-accent-mint text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Examining</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectEvidence(item);
                            onClose();
                          }}
                          className="px-3 py-1 rounded bg-surface-elevated hover:bg-accent-mint hover:text-surface-canvas text-content-primary border border-border-default hover:border-transparent text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <span>Examine in Studio</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

