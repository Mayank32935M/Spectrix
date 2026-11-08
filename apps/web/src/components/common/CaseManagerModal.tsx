import React, { useState } from 'react';
import { 
  X, 
  FolderLock, 
  Plus, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  Calendar, 
  Files, 
  AlertCircle,
  Edit2,
  Check
} from 'lucide-react';
import { Case } from '../../types';
import { createCase, updateCase } from '../../services/api';

interface CaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: Case[];
  activeCase: Case | null;
  onSelectCase: (caseItem: Case) => void;
  onCaseCreated: (newCase: Case) => void;
  onCaseUpdated: (updatedCase: Case) => void;
}

export const CaseManagerModal: React.FC<CaseManagerModalProps> = ({
  isOpen,
  onClose,
  cases,
  activeCase,
  onSelectCase,
  onCaseCreated,
  onCaseUpdated,
}) => {
  const [tab, setTab] = useState<'list' | 'create'>('list');
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editExaminerName, setEditExaminerName] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // New Case form state
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newExaminerName, setNewExaminerName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStartEdit = (c: Case) => {
    setEditingCaseId(c.case_id);
    setEditExaminerName(c.examiner_name || '');
    setEditTitle(c.title || '');
  };

  const handleSaveEdit = async (caseId: string) => {
    if (!editExaminerName.trim()) {
      setErrorMsg('Examiner name cannot be empty or whitespace only.');
      return;
    }
    if (!editTitle.trim()) {
      setErrorMsg('Case title cannot be empty.');
      return;
    }

    try {
      const updated = await updateCase(caseId, {
        title: editTitle.trim(),
        examiner_name: editExaminerName.trim(),
      });
      onCaseUpdated(updated);
      setEditingCaseId(null);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update case.');
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cNum = newCaseNumber.trim();
    const title = newTitle.trim();
    const examiner = newExaminerName.trim();

    if (!cNum) {
      setErrorMsg('Case Number is required.');
      return;
    }
    if (!title) {
      setErrorMsg('Case Title is required.');
      return;
    }
    if (!examiner) {
      setErrorMsg('Examiner Name is required and cannot be whitespace only.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCase({
        case_number: cNum,
        title,
        description: newDescription.trim() || undefined,
        examiner_name: examiner,
      });
      onCaseCreated(created);
      onSelectCase(created);
      setTab('list');
      setNewCaseNumber('');
      setNewTitle('');
      setNewDescription('');
      setNewExaminerName('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-surface-panel border border-border-default rounded-lg max-w-3xl w-full flex flex-col h-[80vh] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="h-12 px-4 border-b border-border-default bg-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent-amber/20 border border-accent-amber/40 flex items-center justify-center text-accent-amber">
              <FolderLock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-content-primary uppercase tracking-wider flex items-center gap-2">
                SPECTRIX CASE MANAGEMENT
                <span className="text-[10px] text-accent-mint font-normal px-1.5 py-0.2 rounded bg-accent-mint/15 border border-accent-mint/30">
                  ISOLATED VAULTS
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

        {/* Tab Controls */}
        <div className="px-4 py-2 border-b border-border-default bg-surface-canvas flex items-center justify-between shrink-0 font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTab('list'); setErrorMsg(null); }}
              className={`px-3 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1.5 ${
                tab === 'list'
                  ? 'bg-surface-elevated text-accent-amber border border-accent-amber/40 font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
              }`}
            >
              <Files className="w-3.5 h-3.5" />
              <span>Existing Cases ({cases.length})</span>
            </button>
            <button
              onClick={() => { setTab('create'); setErrorMsg(null); }}
              className={`px-3 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1.5 ${
                tab === 'create'
                  ? 'bg-surface-elevated text-accent-mint border border-accent-mint/40 font-semibold'
                  : 'text-content-muted hover:text-content-primary hover:bg-surface-container'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Case</span>
            </button>
          </div>

          {activeCase && (
            <div className="text-[11px] text-content-secondary hidden sm:flex items-center gap-1.5 font-mono">
              <span className="text-content-muted">ACTIVE:</span>
              <span className="text-accent-amber font-bold">{activeCase.case_number}</span>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="px-4 py-2 bg-accent-crimson/10 border-b border-accent-crimson/30 flex items-center gap-2 text-accent-crimson text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tab === 'list' ? (
            cases.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <FolderLock className="w-10 h-10 text-content-muted" />
                <div className="text-sm font-semibold text-content-secondary">No Cases Registered</div>
                <p className="text-xs text-content-muted max-w-sm">
                  Create a new forensic case container to begin evidence ingestion, analysis, and report generation.
                </p>
                <button
                  onClick={() => setTab('create')}
                  className="px-4 py-2 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-mono font-bold text-xs transition cursor-pointer"
                >
                  Create First Case
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cases.map((c) => {
                  const isActive = activeCase?.case_id === c.case_id;
                  const isEditing = editingCaseId === c.case_id;

                  return (
                    <div
                      key={c.case_id}
                      className={`p-3.5 rounded border transition-all ${
                        isActive
                          ? 'bg-surface-container border-accent-amber/50 shadow-md'
                          : 'bg-surface-canvas border-border-default hover:border-border-active hover:bg-surface-container/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Case Number & Status */}
                          <div className="flex items-center gap-2 flex-wrap font-mono">
                            <span className="text-xs font-bold text-accent-amber tracking-wide">
                              {c.case_number}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-elevated border border-border-hairpin text-content-muted uppercase">
                              {c.status || 'open'}
                            </span>
                            {isActive && (
                              <span className="text-[10px] px-2 py-0.2 rounded bg-accent-mint/15 text-accent-mint border border-accent-mint/40 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-mint animate-pulse"></span>
                                ACTIVE INVESTIGATION
                              </span>
                            )}
                          </div>

                          {/* Title & Description */}
                          {isEditing ? (
                            <div className="space-y-2 pt-1 font-sans">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Case Title"
                                className="w-full bg-surface-canvas border border-border-default rounded px-2.5 py-1 text-xs text-content-primary focus:outline-none focus:border-accent-mint"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono text-content-muted">Examiner:</span>
                                <input
                                  type="text"
                                  value={editExaminerName}
                                  onChange={(e) => setEditExaminerName(e.target.value)}
                                  placeholder="Examiner Name"
                                  className="flex-1 bg-surface-canvas border border-border-default rounded px-2.5 py-1 text-xs text-content-primary focus:outline-none focus:border-accent-mint"
                                />
                                <button
                                  onClick={() => handleSaveEdit(c.case_id)}
                                  className="px-2.5 py-1 rounded bg-accent-mint text-surface-canvas font-bold text-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={() => setEditingCaseId(null)}
                                  className="px-2 py-1 rounded bg-surface-elevated text-content-muted hover:text-content-primary text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-xs font-semibold text-content-primary truncate">
                                {c.title}
                              </div>
                              {c.description && (
                                <p className="text-[11px] text-content-muted line-clamp-1">
                                  {c.description}
                                </p>
                              )}
                            </>
                          )}

                          {/* Metadata Ribbon */}
                          {!isEditing && (
                            <div className="flex items-center gap-4 text-[10.5px] text-content-secondary font-mono pt-1">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-accent-cyan" />
                                <span>{c.examiner_name || 'Unassigned'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Files className="w-3 h-3 text-content-muted" />
                                <span>{c.evidence_count ?? 0} Assets</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-content-muted" />
                                <span>
                                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!isEditing && (
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="p-1.5 rounded hover:bg-surface-elevated text-content-muted hover:text-content-primary transition cursor-pointer"
                              title="Edit Case Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isActive ? (
                            <div className="px-3 py-1.5 rounded bg-surface-elevated border border-border-default text-content-muted text-xs font-mono flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent-mint" />
                              <span>Current</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                onSelectCase(c);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded bg-accent-amber hover:bg-accent-amber-bright text-surface-canvas font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                            >
                              <span>Open Case</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Create New Case Form */
            <form onSubmit={handleCreateCase} className="p-4 bg-surface-canvas rounded border border-border-default space-y-4 max-w-xl mx-auto">
              <div className="text-xs font-mono font-bold text-accent-mint uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-border-hairpin">
                <Plus className="w-3.5 h-3.5" />
                <span>New Case Dossier Intake</span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-content-secondary flex items-center justify-between">
                  <span>Case Number (ID): *</span>
                  <span className="text-[10px] text-content-muted">e.g. SPX-2026-0143</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  placeholder="SPX-2026-XXXX"
                  className="w-full bg-surface-panel border border-border-default rounded px-3 py-1.5 text-xs font-mono text-content-primary focus:outline-none focus:border-accent-mint"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-content-secondary">Case Title: *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Press Briefing Deepfake Verification"
                  className="w-full bg-surface-panel border border-border-default rounded px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:border-accent-mint"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-content-secondary">
                  Lead Examiner Name: *
                </label>
                <input
                  type="text"
                  required
                  value={newExaminerName}
                  onChange={(e) => setNewExaminerName(e.target.value)}
                  placeholder="e.g. Agent J. Miller / Dr. E. Vance"
                  className="w-full bg-surface-panel border border-border-default rounded px-3 py-1.5 text-xs font-mono text-content-primary focus:outline-none focus:border-accent-mint"
                />
                <p className="text-[10px] text-content-muted">
                  Used in ISO/IEC 27037 attestation records and formal affidavit exports.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-content-secondary">
                  Investigation Description (Optional):
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Incident overview, source of media, forensic objectives..."
                  className="w-full bg-surface-panel border border-border-default rounded px-3 py-1.5 text-xs text-content-primary focus:outline-none focus:border-accent-mint"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-hairpin">
                <button
                  type="button"
                  onClick={() => setTab('list')}
                  className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-elevated text-content-muted hover:text-content-primary text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Creating Case...' : 'Create & Open Case'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

