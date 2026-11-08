export type Modality = 'image' | 'video' | 'audio' | 'document' | 'multimodal';

export interface EvidenceAsset {
  evidence_id: string;
  case_id: string;
  filename: string;
  filesize_bytes: number;
  mime_type: string;
  modality: Modality;
  sha256_digest: string;
  registered_at: string;
  storage_path: string;
  is_original: boolean;
  derived_from_id?: string;
  derivation_method?: string;
  metadata: Record<string, any>;
  custody_chain_length: number;
  preview_url?: string;
}

export interface MediaLocation {
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
    normalized?: boolean;
  };
  temporal_range?: {
    start_time_seconds: number;
    end_time_seconds: number;
    start_frame?: number;
    end_frame?: number;
    smpte_timecode?: string;
  };
  frequency_range?: {
    low_hz: number;
    high_hz: number;
  };
}

export type FindingClassification =
  | 'anomaly'
  | 'investigative_lead'
  | 'heuristic_warning'
  | 'baseline_match';

export interface ForensicFinding {
  schema_version: '1.0.0';
  finding_id: string;
  case_id: string;
  evidence_id: string;
  modality: Modality;
  finding_type: string;
  method_id: string;
  model_id?: string;
  model_version?: string;
  classification: FindingClassification;
  score?: number;
  score_semantics: string;
  calibration_status: 'calibrated' | 'illustrative_benchmark' | 'uncalibrated_heuristic';
  media_location: MediaLocation;
  supporting_observations: string[];
  explanation: string;
  limitations: string;
  review_status: 'unreviewed' | 'analyst_corroborated' | 'analyst_dismissed';
  analyst_notes?: string;
  created_at: string;
}

export interface Case {
  case_id: string;
  case_number: string;
  title: string;
  description?: string;
  examiner_name: string;
  status: 'open' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  findings_count?: number;
}

export interface AnalysisJob {
  job_id: string;
  evidence_id: string;
  pipelines: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  log_messages: string[];
  created_at: string;
  completed_at?: string;
  findings?: ForensicFinding[];
}

export interface CustodyEvent {
  event_id: string;
  case_id: string;
  evidence_id: string;
  event_type: 'ingested' | 'verified' | 'analyzed' | 'derived' | 'exported' | 'annotated';
  sha256_at_event: string;
  performed_by: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface EvidenceAnnotation {
  annotation_id: string;
  case_id: string;
  evidence_id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export type ActiveWorkspace = 'canvas' | 'image' | 'video' | 'audio';

