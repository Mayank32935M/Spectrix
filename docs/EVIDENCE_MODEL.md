# SPECTRIX Evidence & Finding Data Contracts

## 1. Evidence Asset Schema

An evidence asset represents an immutable digital object registered into the custody of SPECTRIX.

```typescript
export interface EvidenceAsset {
  evidence_id: string;             // e.g. "SPX-EV-00031"
  case_id: string;                 // e.g. "SPX-2026-0142"
  filename: string;                // Original filename (sanitized)
  filesize_bytes: number;          // Size in bytes
  mime_type: string;               // Detected MIME type (via magic bytes sniffing)
  modality: 'image' | 'video' | 'audio' | 'document' | 'other';
  sha256_digest: string;           // Canonical hex-encoded SHA-256 digest
  registered_at: string;           // ISO 8601 UTC timestamp
  storage_path: string;            // Relative path in immutable vault
  is_original: boolean;            // True for raw ingested evidence
  derived_from_id?: string;        // Parent evidence ID if derivative
  derivation_method?: string;      // e.g. "audio_demux", "keyframe_extraction"
  metadata: Record<string, any>;   // Native container & stream metadata
  custody_chain_length: number;    // Number of recorded custody events
}
```

---

## 2. Shared Finding Contract (Version 1.0.0)

Every analysis pipeline (classical or machine-learning) emits findings adhering to this authoritative schema:

```typescript
export interface MediaLocation {
  // Spatial bounding box for Image / Video frames
  bounding_box?: {
    x: number;                     // Top-left X coordinate in pixels
    y: number;                     // Top-left Y coordinate in pixels
    width: number;                 // Bounding box width
    height: number;                // Bounding box height
    normalized?: boolean;          // Whether coords are 0..1 or pixel-exact
  };
  // Temporal localization for Video / Audio
  temporal_range?: {
    start_time_seconds: number;    // e.g. 52.420
    end_time_seconds: number;      // e.g. 55.180
    start_frame?: number;          // e.g. 2238
    end_frame?: number;            // e.g. 2320
    smpte_timecode?: string;       // "00:01:14:18"
  };
  // Spectral frequency localization for Audio
  frequency_range?: {
    low_hz: number;                // e.g. 2400
    high_hz: number;               // e.g. 6800
  };
}

export interface ForensicFinding {
  schema_version: '1.0.0';
  finding_id: string;              // e.g. "FND-01"
  case_id: string;                 // e.g. "SPX-2026-0142"
  evidence_id: string;             // e.g. "SPX-EV-00031"
  modality: 'image' | 'video' | 'audio' | 'multimodal';
  finding_type: 
    | 'diffusion_inpaint' 
    | 'splicing_copymove' 
    | 'ela_compression_anomaly' 
    | 'prnu_sensor_mismatch'
    | 'viseme_desync'
    | 'synthetic_voice_formant'
    | 'facial_landmark_warp'
    | 'metadata_tampering';
  method_id: string;               // e.g. "SDXL_Inpaint_Detector"
  model_id?: string;               // e.g. "sdxl-inpaint-boundary-v1.5"
  model_version?: string;          // e.g. "1.5.2"
  classification: 'anomaly' | 'investigative_lead' | 'heuristic_warning' | 'baseline_match';
  score?: number;                  // Raw numerical output
  score_semantics: 
    | 'likelihood_ratio' 
    | 'cosine_similarity' 
    | 'peak_correlation_energy' 
    | 'heuristic_variance_percentage';
  calibration_status: 'calibrated' | 'illustrative_benchmark' | 'uncalibrated_heuristic';
  media_location: MediaLocation;
  supporting_observations: string[]; // e.g. ["Boundary pixel discontinuity", "2D-FFT roll-off"]
  explanation: string;             // Clear analytical narrative
  limitations: string;             // Explicit boundary conditions (e.g. "JPEG Q<80 false positive risk")
  review_status: 'unreviewed' | 'analyst_corroborated' | 'analyst_dismissed';
  analyst_notes?: string;
  created_at: string;              // ISO 8601 UTC
}
```

---

## 3. Cryptographic Custody Event

```typescript
export interface CustodyEvent {
  event_id: string;
  case_id: string;
  evidence_id: string;
  event_type: 'ingested' | 'verified' | 'analyzed' | 'derived' | 'exported' | 'annotated';
  sha256_at_event: string;
  performed_by: string;            // Examiner ID / Agent / Worker ID
  timestamp: string;               // ISO 8601 UTC
  details: Record<string, any>;
}
```

