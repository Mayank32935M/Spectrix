import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Search,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Case, EvidenceAsset } from '../../types';
import { queryCopilot, CopilotResponse } from '../../services/api';

interface ForensicCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: Case | null;
  activeEvidence: EvidenceAsset | null;
  onSelectEvidence?: (evidenceId: string) => void;
  onSelectFinding?: (findingId: string) => void;
}

export const ForensicCopilotModal: React.FC<ForensicCopilotModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  activeEvidence,
  onSelectEvidence,
  onSelectFinding,
}) => {
  const [queryInput, setQueryInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponse | null>(null);
  const [history, setHistory] = useState<Array<{ query: string; response: CopilotResponse }>>([]);

  if (!isOpen) return null;

  const handleSendQuery = async (queryText?: string) => {
    const q = (queryText || queryInput).trim();
    if (!q || !activeCase) return;

    setLoading(true);
    try {
      const res = await queryCopilot(activeCase.case_id, q, activeEvidence?.evidence_id);
      setCopilotResponse(res);
      setHistory(prev => [...prev, { query: q, response: res }]);
      setQueryInput('');
    } catch (err) {
      console.error('Copilot query failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED_QUERIES = [
    'Summarize all detected anomalies across modalities in this case',
    'Assess the mandibular boundary discontinuity and lip retargeting',
    'Evaluate audio vocoder phase banding and viseme latency correlation',
    'Check bitstream cryptographic integrity and C2PA credentials',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-[#111722] border border-[#25303d] rounded-lg max-w-3xl w-full flex flex-col h-[85vh] shadow-2xl overflow-hidden font-mono text-[11px]">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#25303d] bg-[#171d29] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#35c6a0]/20 border border-[#35c6a0]/50 flex items-center justify-center text-[#35c6a0]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                SPECTRIX FORENSIC COPILOT
                <span className="text-[#35c6a0]">// EVIDENCE-GROUNDED ASSISTANT</span>
              </h2>
              <div className="text-[9px] text-[#94a3b8]">
                CASE: {activeCase?.case_number} · LOCAL EVIDENCE STORE · NO EXTERNAL CLOUD TRANSMISSION
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94a3b8] hover:text-white hover:bg-[#1f2737] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Introductory Notice Banner */}
          <div className="p-2.5 bg-[#090d14] rounded border border-[#25303d] flex items-start gap-2 text-[10px] text-[#94a3b8]">
            <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
            <div className="leading-relaxed font-sans">
              <strong className="text-white">Strict Evidence Grounding Principle:</strong> The SPECTRIX Copilot is an investigative assistant that retrieves and correlates empirical database findings, custody digests, and graph relationships. It does not fabricate detections and explains limitations explicitly.
            </div>
          </div>

          {/* Suggested Queries */}
          {!copilotResponse && history.length === 0 && (
            <div className="space-y-2">
              <div className="text-[10px] text-[#64748b] uppercase tracking-wider font-semibold">
                Suggested Investigative Queries:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED_QUERIES.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(sq)}
                    className="p-2.5 rounded bg-[#171d29] border border-[#25303d] text-left hover:border-[#35c6a0]/60 hover:bg-[#1f2737] text-white transition text-[10.5px] leading-snug flex items-center justify-between group"
                  >
                    <span>{sq}</span>
                    <Search className="w-3.5 h-3.5 text-[#64748b] group-hover:text-[#35c6a0] shrink-0 ml-1.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Copilot Response */}
          {copilotResponse && (
            <div className="space-y-3 animate-fadeIn">
              {/* Question Header */}
              <div className="p-2 bg-[#171d29] rounded border border-[#25303d] text-[#38bdf8] text-xs font-semibold">
                Q: {copilotResponse.query}
              </div>

              {/* Structured Markdown Answer */}
              <div className="p-3 bg-[#090d14] rounded border border-[#25303d] text-[#cbd5e1] font-sans text-xs leading-relaxed space-y-2 whitespace-pre-wrap">
                {copilotResponse.answer}
              </div>

              {/* Grounding References Badges */}
              {copilotResponse.grounding_references.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-[#64748b] uppercase font-semibold">
                    Grounding References ({copilotResponse.grounding_references.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {copilotResponse.grounding_references.map((ref, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (ref.reference_type === 'evidence' && onSelectEvidence) onSelectEvidence(ref.reference_id);
                          if (ref.reference_type === 'finding' && onSelectFinding) onSelectFinding(ref.reference_id);
                        }}
                        className="px-2 py-0.5 rounded bg-[#171d29] border border-[#25303d] text-[10px] text-[#35c6a0] hover:border-[#35c6a0] flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{ref.label}</span>
                        {ref.timestamp_or_frame && <span className="text-[#64748b]">[{ref.timestamp_or_frame}]</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations vs Inferences Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
                {/* Empirical Observations */}
                <div className="p-2.5 bg-[#171d29] rounded border border-[#25303d] space-y-1">
                  <div className="flex items-center gap-1 text-[#35c6a0] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>EMPIRICAL OBSERVATIONS</span>
                  </div>
                  <ul className="space-y-1 text-[#cbd5e1] font-sans list-disc list-inside">
                    {copilotResponse.observations.map((obs, idx) => (
                      <li key={idx} className="leading-snug">{obs}</li>
                    ))}
                  </ul>
                </div>

                {/* Analytical Inferences */}
                <div className="p-2.5 bg-[#171d29] rounded border border-[#25303d] space-y-1">
                  <div className="flex items-center gap-1 text-[#f59e0b] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ANALYTICAL INFERENCES</span>
                  </div>
                  <ul className="space-y-1 text-[#cbd5e1] font-sans list-disc list-inside">
                    {copilotResponse.inferences.map((inf, idx) => (
                      <li key={idx} className="leading-snug">{inf}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Forensic Limitations Box */}
              <div className="p-2.5 bg-[#f43f5e]/10 rounded border border-[#f43f5e]/30 space-y-1 text-[10px]">
                <div className="flex items-center gap-1 text-[#f43f5e] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>MANDATORY FORENSIC LIMITATIONS</span>
                </div>
                <ul className="space-y-1 text-[#fda4af] font-sans list-disc list-inside">
                  {copilotResponse.forensic_limitations.map((lim, idx) => (
                    <li key={idx} className="leading-snug">{lim}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#171d29] border-t border-[#25303d] flex items-center gap-2">
          <input
            type="text"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSendQuery();
            }}
            placeholder="Ask Copilot about evidence findings, anomalies, or custody..."
            className="flex-1 bg-[#090d14] border border-[#25303d] rounded p-2 text-white text-xs placeholder:text-[#64748b] focus:outline-none focus:border-[#35c6a0]"
          />
          <button
            disabled={loading || !queryInput.trim()}
            onClick={() => handleSendQuery()}
            className="h-8 px-4 rounded bg-[#35c6a0] hover:bg-[#20e3b2] text-[#00382a] font-bold text-xs uppercase flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Analyzing...' : 'Inquire'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
