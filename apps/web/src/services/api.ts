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
  if (!res.ok) throw new Error('Failed to create case');
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

