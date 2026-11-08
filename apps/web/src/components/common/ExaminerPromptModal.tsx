import React, { useState, useEffect } from 'react';
import { UserCheck, AlertCircle, Shield } from 'lucide-react';
import { Case } from '../../types';
import { updateCase } from '../../services/api';

interface ExaminerPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Case | null;
  onExaminerSaved: (updatedCase: Case) => void;
  isInitialPrompt?: boolean;
}

export const ExaminerPromptModal: React.FC<ExaminerPromptModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  onExaminerSaved,
  isInitialPrompt = false,
}) => {
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeCase?.examiner_name && activeCase.examiner_name !== 'Forensic Analyst') {
      setName(activeCase.examiner_name);
    } else {
      setName('');
    }
    setErrorMsg(null);
  }, [activeCase, isOpen]);

  if (!isOpen || !activeCase) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Examiner name cannot be empty or whitespace only.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateCase(activeCase.case_id, { examiner_name: trimmed });
      onExaminerSaved(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update examiner identity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="bg-surface-panel border border-border-default rounded-lg max-w-md w-full flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="h-12 px-4 border-b border-border-default bg-surface-container flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-accent-mint/20 border border-accent-mint/40 flex items-center justify-center text-accent-mint">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-content-primary uppercase tracking-wider">
                {isInitialPrompt ? 'EXAMINER ATTESTATION REQUIRED' : 'UPDATE LEAD EXAMINER'}
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="p-3 bg-surface-canvas rounded border border-border-default space-y-1.5 font-mono text-xs">
            <div className="text-[11px] text-content-muted">
              Case Dossier: <span className="text-accent-amber font-bold">{activeCase.case_number}</span>
            </div>
            <div className="text-[11px] text-content-secondary truncate">
              {activeCase.title}
            </div>
          </div>

          <p className="text-xs text-content-secondary leading-relaxed">
            {isInitialPrompt
              ? 'Pursuant to ISO/IEC 27037 forensic standards, please specify the legal identity of the Lead Forensic Examiner responsible for custody verification, evidence findings, and affidavit generation for this case.'
              : 'Modify the Lead Examiner name recorded in custody logs and formal affidavit exports.'}
          </p>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-content-secondary flex items-center gap-1">
              <span>Examiner Full Name: *</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g. Dr. Eleanor Vance / Special Agent M. Torres"
              className="w-full bg-surface-canvas border border-border-default rounded px-3 py-2 text-xs font-mono text-content-primary focus:outline-none focus:border-accent-mint"
            />
          </div>

          {errorMsg && (
            <div className="p-2 rounded bg-accent-crimson/10 border border-accent-crimson/30 flex items-center gap-2 text-accent-crimson text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-hairpin font-mono">
            {!isInitialPrompt && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-elevated text-content-muted hover:text-content-primary text-xs cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-4 py-1.5 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{submitting ? 'Registering...' : 'Confirm Examiner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

