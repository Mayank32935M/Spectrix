import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { UniversalInspector } from './components/common/UniversalInspector';
import { AffidavitExportModal } from './components/common/AffidavitExportModal';
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
  fetchFindings 
} from './services/api';

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<ActiveWorkspace>('image');
  const [_cases, setCases] = useState<Case[]>([]);
  const [activeCase, setActiveCase] = useState<Case | null>(null);
  const [_evidenceList, setEvidenceList] = useState<EvidenceAsset[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceAsset | null>(null);
  const [findings, setFindings] = useState<ForensicFinding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [_loading, setLoading] = useState(true);

  // Initialize Case and Evidence
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
        const currentCase = loadedCases[0];
        setActiveCase(currentCase);

        // Load evidence for this case
        const evList = await fetchEvidence(currentCase.case_id);
        setEvidenceList(evList);

        if (evList.length > 0) {
          const firstEv = evList[0];
          setActiveEvidence(firstEv);

          // Automatically switch workspace modality if applicable
          if (firstEv.modality === 'image') setWorkspace('image');
          else if (firstEv.modality === 'video') setWorkspace('video');
          else if (firstEv.modality === 'audio') setWorkspace('audio');

          const fList = await fetchFindings(currentCase.case_id, firstEv.evidence_id);
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

  // Handle Evidence Upload
  const handleFileUpload = async (file: File, precomputedSha256: string) => {
    if (!activeCase) return;

    const newEvidence = await uploadEvidence(activeCase.case_id, file, precomputedSha256);
    setEvidenceList((prev) => [newEvidence, ...prev]);
    setActiveEvidence(newEvidence);

    // Switch to corresponding studio
    if (newEvidence.modality === 'image') setWorkspace('image');
    else if (newEvidence.modality === 'video') setWorkspace('video');
    else if (newEvidence.modality === 'audio') setWorkspace('audio');

    // Poll for generated findings
    setTimeout(async () => {
      try {
        const updatedFindings = await fetchFindings(activeCase.case_id, newEvidence.evidence_id);
        setFindings(updatedFindings);
        if (updatedFindings.length > 0) {
          setSelectedFindingId(updatedFindings[0].finding_id);
        }
      } catch (e) {
        console.error('Failed to refresh findings after upload:', e);
      }
    }, 1500);
  };

  // Trigger analysis pipeline
  const handleTriggerAnalysis = async (pipelines: string[]) => {
    if (!activeEvidence || !activeCase) return;
    await triggerAnalysis(activeEvidence.evidence_id, pipelines);

    // Refresh findings after short delay
    setTimeout(async () => {
      const updatedFindings = await fetchFindings(activeCase.case_id, activeEvidence.evidence_id);
      setFindings(updatedFindings);
    }, 1200);
  };

  const handleSelectEvidence = async (evidenceId: string) => {
    const ev = _evidenceList.find((e) => e.evidence_id === evidenceId) || null;
    setActiveEvidence(ev);
    if (ev && activeCase) {
      const fList = await fetchFindings(activeCase.case_id, ev.evidence_id);
      setFindings(fList);
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-surface-canvas text-content-primary">
      {/* Universal Header */}
      <Header
        currentWorkspace={workspace}
        onSelectWorkspace={setWorkspace}
        activeCase={activeCase}
        activeEvidence={activeEvidence}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Main Workspace Stage + Contextual Inspector */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Active Workspace Viewport */}
        {workspace === 'canvas' && (
          <EvidenceCanvas
            activeCase={activeCase}
            activeEvidence={activeEvidence}
            findings={findings}
            onSelectEvidence={handleSelectEvidence}
            onSelectFinding={setSelectedFindingId}
          />
        )}

        {workspace === 'image' && (
          <ImageStudio
            evidence={activeEvidence}
            activeCase={activeCase}
            findings={findings}
            selectedFindingId={selectedFindingId}
            onSelectFinding={setSelectedFindingId}
            onUploadEvidence={handleFileUpload}
            onTriggerAnalysis={handleTriggerAnalysis}
          />
        )}

        {workspace === 'video' && (
          <VideoStudio
            evidence={activeEvidence}
            activeCase={activeCase}
            findings={findings}
            onUploadEvidence={handleFileUpload}
          />
        )}

        {workspace === 'audio' && (
          <AudioStudio
            evidence={activeEvidence}
            activeCase={activeCase}
            findings={findings}
            onUploadEvidence={handleFileUpload}
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

      {/* Affidavit Export Modal */}
      <AffidavitExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        activeCase={activeCase}
        activeEvidence={activeEvidence}
        findings={findings}
      />
    </div>
  );
};

export default App;
