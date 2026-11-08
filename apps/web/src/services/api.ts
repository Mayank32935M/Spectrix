import { Case, EvidenceAsset, ForensicFinding, AnalysisJob } from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<{ status: string; version: string; vault_status: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch health status');
  return res.json();
}

export async function fetchCases(): Promise<Case[]> {
  const res = await fetch(`${API_BASE}/cases`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

export async function createCase(data: {
  case_number: string;
  title: string;
  description?: string;
  examiner_name: string;
}): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create case');
  }
  return res.json();
}

export async function updateCase(
  caseId: string,
  data: {
    title?: string;
    description?: string;
    examiner_name?: string;
    status?: string;
  }
): Promise<Case> {
  const res = await fetch(`${API_BASE}/cases/${caseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update case');
  }
  return res.json();
}

export async function fetchEvidence(caseId: string): Promise<EvidenceAsset[]> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`);
  if (!res.ok) throw new Error('Failed to fetch evidence assets');
  return res.json();
}

export async function uploadEvidence(
  caseId: string,
  file: File,
  precomputedSha256?: string
): Promise<EvidenceAsset> {
  const formData = new FormData();
  formData.append('file', file);
  if (precomputedSha256) {
    formData.append('precomputed_sha256', precomputedSha256);
  }

  const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload evidence');
  }
  return res.json();
}

export async function verifyEvidenceIntegrity(evidenceId: string): Promise<{
  evidence_id: string;
  registered_sha256: string;
  current_sha256: string;
  integrity_status: 'MATCH' | 'MISMATCH';
  verified_at: string;
  notice: string;
}> {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/integrity`);
  if (!res.ok) throw new Error('Failed to verify integrity');
  return res.json();
}

export async function triggerAnalysis(
  evidenceId: string,
  pipelines: string[]
): Promise<AnalysisJob> {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pipelines }),
  });
  if (!res.ok) throw new Error('Failed to trigger analysis');
  return res.json();
}

export async function fetchJob(jobId: string): Promise<AnalysisJob> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to fetch job');
  return res.json();
}

export async function fetchFindings(caseId: string, evidenceId?: string): Promise<ForensicFinding[]> {
  const url = evidenceId
    ? `${API_BASE}/cases/${caseId}/findings?evidence_id=${evidenceId}`
    : `${API_BASE}/cases/${caseId}/findings`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch findings');
  return res.json();
}

export async function fetchGraph(caseId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/graph`);
  if (!res.ok) throw new Error('Failed to fetch evidence graph');
  return res.json();
}

export async function fetchAnnotations(evidenceId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/annotations`);
  if (!res.ok) throw new Error('Failed to fetch annotations');
  return res.json();
}

export async function createAnnotation(
  evidenceId: string,
  data: { x: number; y: number; width?: number; height?: number; label: string; notes?: string; created_by?: string }
): Promise<any> {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/annotations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create annotation');
  return res.json();
}

export async function deleteAnnotation(evidenceId: string, annotationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/annotations/${annotationId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete annotation');
}

export interface CopilotResponse {
  query: string;
  case_id: string;
  answer: string;
  grounding_references: Array<{
    reference_type: string;
    reference_id: string;
    label: string;
    modality?: string;
    timestamp_or_frame?: string;
  }>;
  observations: string[];
  inferences: string[];
  forensic_limitations: string[];
}

export async function queryCopilot(caseId: string, query: string, evidenceId?: string): Promise<CopilotResponse> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/copilot/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, evidence_id: evidenceId }),
  });
  if (!res.ok) throw new Error('Failed to query Forensic Copilot');
  return res.json();
}

export interface CaseReportResponse {
  case_id: string;
  case_number: string;
  title: string;
  examiner_name: string;
  generated_at: string;
  total_evidence_assets: number;
  total_findings: number;
  total_custody_events: number;
  total_annotations: number;
  evidence_inventory: any[];
  findings_by_modality: Record<string, any[]>;
  custody_ledger: any[];
  affidavit_markdown: string;
}

export async function fetchCaseReport(caseId: string): Promise<CaseReportResponse> {
  const res = await fetch(`${API_BASE}/cases/${caseId}/reports`);
  if (!res.ok) throw new Error('Failed to generate case forensic report');
  return res.json();
}


