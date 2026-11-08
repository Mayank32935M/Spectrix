import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Scale, 
  Clock, 
  RefreshCw, 
  History, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Info,
  Shield
} from 'lucide-react';
import { EvidenceAssessment, AssessmentVerdict } from '../../types';

interface ForensicAssessmentCardProps {
  assessment: EvidenceAssessment | null;
  loading?: boolean;
  onReevaluate?: () => void;
  onSelectFinding?: (findingId: string) => void;
  history?: EvidenceAssessment[];
}

export const ForensicAssessmentCard: React.FC<ForensicAssessmentCardProps> = ({
  assessment,
  loading = false,
  onReevaluate,
  onSelectFinding,
  history = [],
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showLimitations, setShowLimitations] = useState(false);

  if (loading) {
    return (
      <div className="p-4 rounded bg-surface-panel border border-border-default space-y-2 animate-pulse font-mono text-xs text-content-muted">
        <div className="h-4 bg-surface-container rounded w-1/3"></div>
        <div className="h-8 bg-surface-container rounded w-full"></div>
        <div className="h-12 bg-surface-container rounded w-full"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-4 rounded bg-surface-panel border border-border-default font-mono text-xs text-center space-y-2">
        <div className="text-content-muted">No forensic assessment generated for this evidence asset.</div>
        {onReevaluate && (
          <button
            onClick={onReevaluate}
            className="px-3 py-1 rounded bg-accent-mint text-surface-canvas font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Generate Assessment</span>
          </button>
        )}
      </div>
    );
  }

  const getVerdictStyle = (verdict: AssessmentVerdict) => {
    switch (verdict) {
      case 'AUTHENTICITY_SUPPORTED':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-accent-mint" />,
          title: 'AUTHENTICITY SUPPORTED',
          subtitle: 'Within physical limitations of completed pipelines',
          badgeBg: 'bg-accent-mint/15 text-accent-mint border-accent-mint/40',
          border: 'border-accent-mint/30',
        };
      case 'LIKELY_MANIPULATED':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-accent-crimson" />,
          title: 'LIKELY MANIPULATED',
          subtitle: 'Corroborated structural or pixel alteration detected',
          badgeBg: 'bg-accent-crimson/15 text-accent-crimson border-accent-crimson/40',
          border: 'border-accent-crimson/30',
        };
      case 'LIKELY_AI_GENERATED':
        return {
          icon: <Sparkles className="w-4 h-4 text-accent-violet" />,
          title: 'LIKELY AI GENERATED',
          subtitle: 'Empirical synthetic generative artifacts detected',
          badgeBg: 'bg-accent-violet/15 text-accent-violet border-accent-violet/40',
          border: 'border-accent-violet/30',
        };
      case 'SUSPICIOUS_INCONCLUSIVE':
        return {
          icon: <Scale className="w-4 h-4 text-accent-amber" />,
          title: 'SUSPICIOUS / INCONCLUSIVE',
          subtitle: 'Anomalies present but contradict or lack full corroboration',
          badgeBg: 'bg-accent-amber/15 text-accent-amber border-accent-amber/40',
          border: 'border-accent-amber/30',
        };
      case 'INSUFFICIENT_ANALYSIS':
      default:
        return {
          icon: <Clock className="w-4 h-4 text-content-muted" />,
          title: 'INSUFFICIENT ANALYSIS',
          subtitle: 'Required examinations unperformed, failed, or incomplete',
          badgeBg: 'bg-surface-elevated text-content-muted border-border-default',
          border: 'border-border-default',
        };
    }
  };

  const vStyle = getVerdictStyle(assessment.verdict);

  return (
    <div className={`rounded border bg-surface-panel overflow-hidden shadow-lg font-sans text-xs ${vStyle.border}`}>
      {/* 1. Header Banner */}
      <div className="p-3 bg-surface-container border-b border-border-default flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded bg-surface-elevated border border-border-default shrink-0 mt-0.5">
            {vStyle.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-content-primary">
                {vStyle.title}
              </span>
              <span className={`px-2 py-0.2 rounded font-mono text-[9px] uppercase font-bold border ${vStyle.badgeBg}`}>
                {assessment.verdict}
              </span>
              <span className="text-[9.5px] font-mono text-content-muted px-1.5 py-0.2 rounded bg-surface-canvas border border-border-hairpin">
                v{assessment.assessment_version}
              </span>
            </div>
            <div className="text-[11px] text-content-secondary mt-0.5">
              {vStyle.subtitle}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          {history.length > 1 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1 rounded bg-surface-elevated hover:bg-surface-container text-content-muted hover:text-content-primary border border-border-hairpin transition cursor-pointer"
              title="View Assessment Version History"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}
          {onReevaluate && (
            <button
              onClick={onReevaluate}
              className="p-1 rounded bg-surface-elevated hover:bg-surface-container text-content-muted hover:text-accent-mint border border-border-hairpin transition cursor-pointer"
              title="Re-evaluate Forensic Assessment"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Version History Drawer (Collapsible) */}
      {showHistory && history.length > 1 && (
        <div className="p-2.5 bg-surface-canvas border-b border-border-default space-y-1.5 font-mono text-[10.5px]">
          <div className="text-[10px] uppercase font-semibold text-content-muted flex items-center gap-1">
            <History className="w-3 h-3 text-accent-cyan" />
            <span>Forensic Assessment History ({history.length} versions)</span>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {history.map((h) => (
              <div
                key={h.assessment_id}
                className={`p-1.5 rounded border flex items-center justify-between ${
                  h.status === 'active'
                    ? 'bg-surface-elevated border-accent-mint/40 text-accent-mint'
                    : 'bg-surface-container border-border-hairpin text-content-muted'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold">v{h.assessment_version}</span>
                  <span>[{h.verdict}]</span>
                  {h.status === 'active' && <span className="text-[9px] uppercase px-1 rounded bg-accent-mint/20 font-bold">CURRENT</span>}
                </div>
                <div className="text-[9.5px]">
                  {new Date(h.generated_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Three-Pillar Dimensional Assessment Grid */}
      <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-surface-canvas border-b border-border-default font-mono text-[10px]">
        {/* AI Generation */}
        <div className="p-2 rounded bg-surface-container border border-border-hairpin space-y-0.5">
          <div className="text-content-muted flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-accent-violet" />
            <span>AI SYNTHESIS</span>
          </div>
          <div className="font-bold text-content-primary text-[10.5px] truncate">
            {assessment.ai_generation_assessment.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Manipulation */}
        <div className="p-2 rounded bg-surface-container border border-border-hairpin space-y-0.5">
          <div className="text-content-muted flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5 text-accent-amber" />
            <span>MANIPULATION</span>
          </div>
          <div className="font-bold text-content-primary text-[10.5px] truncate">
            {assessment.manipulation_assessment.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Authenticity */}
        <div className="p-2 rounded bg-surface-container border border-border-hairpin space-y-0.5">
          <div className="text-content-muted flex items-center gap-1">
            <Shield className="w-2.5 h-2.5 text-accent-mint" />
            <span>AUTHENTICITY</span>
          </div>
          <div className="font-bold text-content-primary text-[10.5px] truncate">
            {assessment.authenticity_assessment.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {/* 4. Structured Forensic Explanation */}
      <div className="p-3 space-y-2 border-b border-border-hairpin">
        <div className="text-[10px] font-mono font-semibold text-content-muted uppercase tracking-wider">
          Forensic Explanation & Synthesis:
        </div>
        <p className="text-xs text-content-secondary leading-relaxed font-sans whitespace-pre-wrap">
          {assessment.explanation}
        </p>
      </div>

      {/* 5. Supporting Findings & Contradictions */}
      {(assessment.supporting_findings.length > 0 || assessment.conflicting_findings.length > 0) && (
        <div className="p-3 border-b border-border-hairpin space-y-2.5">
          {/* Supporting Findings */}
          {assessment.supporting_findings.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-semibold text-accent-amber uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-accent-amber" />
                <span>Supporting Anomaly Findings ({assessment.supporting_findings.length}):</span>
              </div>
              <div className="space-y-1">
                {assessment.supporting_findings.map((sf: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onSelectFinding && onSelectFinding(sf.finding_id)}
                    className="p-1.5 rounded bg-surface-container border border-border-hairpin hover:border-accent-amber/50 font-mono text-[10.5px] flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-accent-amber font-bold">{sf.finding_type}</span>
                      <span className="text-content-muted">via {sf.method_id}</span>
                    </div>
                    <div className="flex items-center gap-1 text-content-secondary shrink-0">
                      {sf.score !== null && sf.score !== undefined && (
                        <span>Score: {sf.score}</span>
                      )}
                      <ExternalLink className="w-2.5 h-2.5 text-content-muted" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conflicting / Mitigated Findings */}
          {assessment.conflicting_findings.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-semibold text-content-muted uppercase tracking-wider flex items-center gap-1">
                <XCircle className="w-3 h-3 text-content-muted" />
                <span>Conflicting / Dismissed / Baseline Findings ({assessment.conflicting_findings.length}):</span>
              </div>
              <div className="space-y-1">
                {assessment.conflicting_findings.map((cf: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => onSelectFinding && onSelectFinding(cf.finding_id)}
                    className="p-1.5 rounded bg-surface-container border border-border-hairpin font-mono text-[10px] text-content-muted flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate">{cf.finding_type} [{cf.classification}]</span>
                    <span>{cf.review_status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Analytical Coverage Ribbon */}
      <div className="p-3 border-b border-border-hairpin font-mono text-[10.5px] space-y-1.5">
        <div className="text-[10px] font-semibold text-content-muted uppercase">
          Analytical Coverage:
        </div>
        <div className="flex flex-wrap gap-1">
          {assessment.examinations_performed.map((pipe) => (
            <span
              key={pipe}
              className="px-1.5 py-0.5 rounded bg-accent-mint/10 border border-accent-mint/30 text-accent-mint text-[9.5px] flex items-center gap-1"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>{pipe}</span>
            </span>
          ))}
          {assessment.unavailable_or_failed_examinations.map((pipe) => (
            <span
              key={pipe}
              className="px-1.5 py-0.5 rounded bg-surface-container border border-border-hairpin text-content-muted text-[9.5px] line-through"
              title="Not executed or failed"
            >
              {pipe}
            </span>
          ))}
        </div>
      </div>

      {/* 7. Collapsible Mandatory Limitations */}
      <div className="p-3 bg-surface-canvas/50 space-y-2">
        <button
          onClick={() => setShowLimitations(!showLimitations)}
          className="w-full flex items-center justify-between text-[10px] font-mono text-content-muted hover:text-content-primary uppercase tracking-wider cursor-pointer"
        >
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3 text-accent-cyan" />
            <span>Forensic Limitations & Legal Caveats ({assessment.limitations.length})</span>
          </div>
          {showLimitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showLimitations && (
          <ul className="space-y-1 font-sans text-[11px] text-content-secondary list-disc list-inside leading-relaxed animate-fadeIn">
            {assessment.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 8. Footer Telemetry */}
      <div className="px-3 py-1.5 bg-surface-container border-t border-border-default flex items-center justify-between font-mono text-[9.5px] text-content-muted">
        <div>
          Policy: <span className="text-content-secondary">{assessment.fusion_policy_id}:v{assessment.fusion_policy_version}</span>
        </div>
        <div>
          Assessed: <span className="text-content-secondary">{new Date(assessment.generated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

