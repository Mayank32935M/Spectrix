import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/common/Header';
import { UniversalInspector } from './components/common/UniversalInspector';
import { AffidavitExportModal } from './components/common/AffidavitExportModal';
import { ForensicCopilotModal } from './components/common/ForensicCopilotModal';
import { CaseManagerModal } from './components/common/CaseManagerModal';
import { ExaminerPromptModal } from './components/common/ExaminerPromptModal';
import { EvidenceVaultModal } from './components/common/EvidenceVaultModal';
import { EvidenceCanvas } from './workspaces/EvidenceCanvas';
import { ImageStudio } from './workspaces/ImageStudio';
import { VideoStudio } from './workspaces/VideoStudio';
import { AudioStudio } from './workspaces/AudioStudio';
import { Case, EvidenceAsset, ForensicFinding, ActiveWorkspace } from './types';
import { 
  fetchCases, 
  createCase, 
  fetchEvidence, 
  uploadEvidence, 
  triggerAnalysis, 
  fetchFindings,
  fetchJob,
  reevaluateEvidenceAssessment
} from './services/api';
import { Loader2 } from 'lucide-react';

const STORAGE_KEY_CASE = 'spectrix_active_case_id';
const STORAGE_KEY_EVIDENCE = 'spectrix_active_evidence_id';

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<ActiveWorkspace>(() => {
    const params = new URLSearchParams(window.location.search);
    const ws = params.get('workspace');
    if (ws === 'canvas' || ws === 'image' || ws === 'video' || ws === 'audio') return ws;
    return 'image';
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<EvidenceAsset[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceAsset | null>(null);
  const [findings, setFindings] = useState<ForensicFinding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Modals
  const [isCaseManagerOpen, setIsCaseManagerOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'cases';
  });
  const [isEvidenceVaultOpen, setIsEvidenceVaultOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'vault';
  });
  const [isExaminerPromptOpen, setIsExaminerPromptOpen] = useState(false);
  const [isInitialExaminerPrompt, setIsInitialExaminerPrompt] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'affidavit';
  });
  const [isCopilotOpen, setIsCopilotOpen] = useState(() => {
    return new URLSearchParams(window.location.search).get('modal') === 'copilot';
  });
  const [loading, setLoading] = useState(true);

  // Helper: Compute client SHA-256 for a file
  const calculateSha256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Select an evidence asset and load its findings & workspace
  const handleSelectEvidenceAsset = useCallback(async (ev: EvidenceAsset) => {
    if (!activeCase) return;
    setActiveEvidence(ev);
    localStorage.setItem(STORAGE_KEY_EVIDENCE, ev.evidence_id);

    // Switch workspace to match modality
    if (ev.modality === 'image') setWorkspace('image');
    else if (ev.modality === 'video') setWorkspace('video');
    else if (ev.modality === 'audio') setWorkspace('audio');

    try {
      const fList = await fetchFindings(activeCase.case_id, ev.evidence_id);
      setFindings(fList);
      if (fList.length > 0) {
        setSelectedFindingId(fList[0].finding_id);
      } else {
        setSelectedFindingId(null);
      }
    } catch (e) {
      console.error('Failed to load findings for selected evidence:', e);
      setFindings([]);
    }
  }, [activeCase]);

  // Switch Active Case with strict data isolation
  const handleSelectCase = useCallback(async (selectedCase: Case) => {
    setActiveCase(selectedCase);
    localStorage.setItem(STORAGE_KEY_CASE, selectedCase.case_id);

    // Strict Case Isolation: Clear out prior case data
    setActiveEvidence(null);
    setFindings([]);
    setSelectedFindingId(null);
    localStorage.removeItem(STORAGE_KEY_EVIDENCE);

    try {
      const evList = await fetchEvidence(selectedCase.case_id);
      setEvidenceList(evList);

      if (evList.length > 0) {
        // Pick first asset of the new case
        await handleSelectEvidenceAsset(evList[0]);
      } else {
        setActiveEvidence(null);
        setFindings([]);
      }
    } catch (err) {
      console.error('Failed to load evidence for selected case:', err);
      setEvidenceList([]);
    }

    // Check if examiner identity is assigned
    if (!selectedCase.examiner_name || selectedCase.examiner_name === 'Forensic Analyst') {
      setIsInitialExaminerPrompt(true);
      setIsExaminerPromptOpen(true);
    }
  }, [handleSelectEvidenceAsset]);

  // Initialize Case and Evidence with LocalStorage Persistence
  useEffect(() => {
    async function init() {
      try {
        let loadedCases = await fetchCases();
        if (loadedCases.length === 0) {
          // Initialize default forensic case if none exists
          const initialCase = await createCase({
            case_number: 'SPX-2026-0142',
            title: 'Synthetic Media Inquiry',
            description: 'Cross-modal forensic analysis of leaked press briefing recording',
            examiner_name: 'Dr. E. Vance',
          });
          loadedCases = [initialCase];
        }

        setCases(loadedCases);

        // Check stored case preference or query param
        const qParams = new URLSearchParams(window.location.search);
        const qCaseId = qParams.get('case_id');
        const savedCaseId = qCaseId || localStorage.getItem(STORAGE_KEY_CASE);
        const matchedCase = loadedCases.find((c) => c.case_id === savedCaseId) || loadedCases[0];
        setActiveCase(matchedCase);

        // Load evidence for this case
        const evList = await fetchEvidence(matchedCase.case_id);
        setEvidenceList(evList);

        if (evList.length > 0) {
          const qEvId = qParams.get('evidence_id');
          const savedEvId = qEvId || localStorage.getItem(STORAGE_KEY_EVIDENCE);
          const matchedEv = evList.find((e) => e.evidence_id === savedEvId) || evList[0];
          setActiveEvidence(matchedEv);

          // If workspace wasn't explicitly passed in URL, match modality
          if (!qParams.get('workspace')) {
            if (matchedEv.modality === 'image') setWorkspace('image');
            else if (matchedEv.modality === 'video') setWorkspace('video');
            else if (matchedEv.modality === 'audio') setWorkspace('audio');
          }

          const fList = await fetchFindings(matchedCase.case_id, matchedEv.evidence_id);
          setFindings(fList);
          if (fList.length > 0) {
            setSelectedFindingId(fList[0].finding_id);
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Multi-File Upload & Ingestion
  const handleBatchUpload = async (files: File[]) => {
    if (!activeCase) return;

    const uploadedAssets: EvidenceAsset[] = [];
    for (const file of files) {
      const sha256 = await calculateSha256(file);
      const newEvidence = await uploadEvidence(activeCase.case_id, file, sha256);
      uploadedAssets.push(newEvidence);
    }

    if (uploadedAssets.length > 0) {
      setEvidenceList((prev) => [...uploadedAssets, ...prev]);
      const latest = uploadedAssets[0];
      await handleSelectEvidenceAsset(latest);

      // Actively poll and refresh findings & assessment
      await pollJobAndRefresh(activeCase.case_id, latest.evidence_id);
    }
  };

  // Helper: Poll background analysis job until complete, then refresh findings and assessment
  const pollJobAndRefresh = async (caseId: string, evidenceId: string, jobId?: string) => {
    if (jobId) {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 300));
        try {
          const j = await fetchJob(jobId);
          if (j.status === 'completed' || j.status === 'failed') {
            break;
          }
        } catch {
          // continue polling
        }
      }
    } else {
      await new Promise((r) => setTimeout(r, 600));
    }

    // Refresh findings
    try {
      const updatedFindings = await fetchFindings(caseId, evidenceId);
      setFindings(updatedFindings);
      if (updatedFindings.length > 0) {
        setSelectedFindingId((prev) => prev || updatedFindings[0].finding_id);
      }
    } catch (e) {
      console.error('Failed to refresh findings:', e);
    }

    // Reevaluate and refresh assessment verdict
    try {
      await reevaluateEvidenceAssessment(evidenceId);
    } catch (e) {
      console.error('Failed to refresh assessment verdict:', e);
    }
  };

  // Single file upload bridge
  const handleSingleFileUpload = async (file: File, precomputedSha256: string) => {
    if (!activeCase) return;
    const newEvidence = await uploadEvidence(activeCase.case_id, file, precomputedSha256);
    setEvidenceList((prev) => [newEvidence, ...prev]);
    await handleSelectEvidenceAsset(newEvidence);

    // Actively poll and refresh findings & assessment
    await pollJobAndRefresh(activeCase.case_id, newEvidence.evidence_id);
  };

  // Trigger analysis pipeline
  const handleTriggerAnalysis = async (pipelines: string[]) => {
    if (!activeEvidence || !activeCase) return;
    try {
      const job = await triggerAnalysis(activeEvidence.evidence_id, pipelines);
      await pollJobAndRefresh(activeCase.case_id, activeEvidence.evidence_id, job?.job_id);
    } catch (err) {
      console.error('Trigger analysis failed:', err);
      await pollJobAndRefresh(activeCase.case_id, activeEvidence.evidence_id);
    }
  };

  const handleSelectEvidenceById = async (evidenceId: string) => {
    const ev = evidenceList.find((e) => e.evidence_id === evidenceId) || null;
    if (ev) {
      await handleSelectEvidenceAsset(ev);
    }
  };

  const handleCaseCreated = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);
    handleSelectCase(newCase);
  };

  const handleCaseUpdated = (updatedCase: Case) => {
    setCases((prev) => prev.map((c) => (c.case_id === updatedCase.case_id ? updatedCase : c)));
    if (activeCase?.case_id === updatedCase.case_id) {
      setActiveCase(updatedCase);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-surface-canvas flex flex-col items-center justify-center gap-3 text-content-secondary font-mono">
        <Loader2 className="w-8 h-8 text-accent-mint animate-spin" />
        <span className="text-xs uppercase tracking-wider">Mounting Immutable Forensic Workstation...</span>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-surface-canvas text-content-primary">
      {/* Universal Header with Case, Evidence Vault & Examiner controls */}
      <Header
        currentWorkspace={workspace}
        onSelectWorkspace={setWorkspace}
        activeCase={activeCase}
        activeEvidence={activeEvidence}
        caseEvidenceCount={evidenceList.length}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        onOpenCaseManager={() => setIsCaseManagerOpen(true)}
        onOpenEvidenceVault={() => setIsEvidenceVaultOpen(true)}
        onOpenExaminerModal={() => {
          setIsInitialExaminerPrompt(false);
          setIsExaminerPromptOpen(true);
        }}
      />

      {/* Main Workspace Stage + Contextual Inspector */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Active Workspace Viewport */}
        {workspace === 'canvas' && (
          <EvidenceCanvas
            activeCase={activeCase}
            activeEvidence={activeEvidence}
            findings={findings}
            onSelectEvidence={handleSelectEvidenceById}
            onSelectFinding={setSelectedFindingId}
            onNavigateWorkspace={setWorkspace}
          />
        )}

        {workspace === 'image' && (
          <ImageStudio
            evidence={activeEvidence}
            activeCase={activeCase}
            findings={findings}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onUploadEvidence={handleSingleFileUpload}
            onTriggerAnalysis={handleTriggerAnalysis}
            onOpenEvidenceVault={() => setIsEvidenceVaultOpen(true)}
            caseEvidenceCount={evidenceList.length}
          />
        )}

        {workspace === 'video' && (
          <VideoStudio
            evidence={activeEvidence}
            activeCase={activeCase}
            findings={findings}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onUploadEvidence={handleSingleFileUpload}
            onTriggerAnalysis={handleTriggerAnalysis}
            onOpenEvidenceVault={() => setIsEvidenceVaultOpen(true)}
            caseEvidenceCount={evidenceList.length}
          />
        )}

        {workspace === 'audio' && (
          <AudioStudio
            evidence={activeEvidence}
            activeCase={activeCase}
            findings={findings}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onUploadEvidence={handleSingleFileUpload}
            onTriggerAnalysis={handleTriggerAnalysis}
            onOpenEvidenceVault={() => setIsEvidenceVaultOpen(true)}
            caseEvidenceCount={evidenceList.length}
          />
        )}

        {/* Universal 5-Tier Inspector Dock */}
        <UniversalInspector
          evidence={activeEvidence}
          activeCase={activeCase}
          findings={findings}
          selectedFindingId={selectedFindingId}
          onSelectFinding={setSelectedFindingId}
        />
      </div>

      {/* Case Manager Modal */}
      <CaseManagerModal
        isOpen={isCaseManagerOpen}
        onClose={() => setIsCaseManagerOpen(false)}
        cases={cases}
        activeCase={activeCase}
        onSelectCase={handleSelectCase}
        onCaseCreated={handleCaseCreated}
        onCaseUpdated={handleCaseUpdated}
      />

      {/* Evidence Vault & Intake Modal */}
      <EvidenceVaultModal
        isOpen={isEvidenceVaultOpen}
        onClose={() => setIsEvidenceVaultOpen(false)}
        activeCase={activeCase}
        evidenceList={evidenceList}
        activeEvidence={activeEvidence}
        onSelectEvidence={handleSelectEvidenceAsset}
        onUploadFiles={handleBatchUpload}
      />

      {/* Examiner Prompt Modal */}
      <ExaminerPromptModal
        isOpen={isExaminerPromptOpen}
        onClose={() => setIsExaminerPromptOpen(false)}
        activeCase={activeCase}
        onExaminerSaved={handleCaseUpdated}
        isInitialPrompt={isInitialExaminerPrompt}
      />

      {/* Affidavit Export Modal */}
      <AffidavitExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeCase={activeCase}
        activeEvidence={activeEvidence}
        findings={findings}
      />

      {/* Forensic Copilot Modal */}
      <ForensicCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        activeCase={activeCase}
        activeEvidence={activeEvidence}
        onSelectEvidence={handleSelectEvidenceById}
        onSelectFinding={setSelectedFindingId}
      />
    </div>
  );
};

export default App;
