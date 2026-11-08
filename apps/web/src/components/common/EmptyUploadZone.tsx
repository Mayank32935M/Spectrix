import React, { useState, useRef } from 'react';
import { UploadCloud, Shield, AlertCircle, ArrowRight } from 'lucide-react';

interface EmptyUploadZoneProps {
  onFileUpload: (file: File, precomputedSha256: string) => Promise<void>;
  modalityFilter?: 'image' | 'video' | 'audio' | 'all';
}

export const EmptyUploadZone: React.FC<EmptyUploadZoneProps> = ({
  onFileUpload,
  modalityFilter = 'all',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute SHA-256 directly in browser using Web Crypto API
  const calculateSha256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const processFile = async (file: File) => {
    setError(null);
    setUploading(true);
    setProgressText(`Computing SHA-256 digest for ${file.name}...`);

    try {
      const sha256 = await calculateSha256(file);
      setProgressText(`Registering into immutable vault with digest: ${sha256.substring(0, 16)}...`);
      await onFileUpload(file, sha256);
      setProgressText('Upload and registration complete.');
    } catch (err: any) {
      setError(err.message || 'Failed to ingest evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await processFile(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-tech-grid text-content-primary">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-xl p-8 rounded border-2 border-dashed transition-all flex flex-col items-center text-center space-y-4 bg-surface-panel/90 backdrop-blur ${
          isDragging
            ? 'border-accent-mint bg-accent-mint/5 scale-[1.01]'
            : 'border-border-default hover:border-border-active'
        }`}
      >
        <div className="w-14 h-14 rounded-full bg-surface-container border border-border-default flex items-center justify-center text-accent-mint shadow-md">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-base font-bold text-content-primary">
            Ingest Forensic Evidence Asset
          </h2>
          <p className="text-xs text-content-secondary mt-1 font-sans">
            Drag and drop original evidence media here, or browse your local file system.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept={
            modalityFilter === 'image'
              ? 'image/jpeg,image/png,image/webp,image/tiff'
              : modalityFilter === 'video'
              ? 'video/mp4,video/quicktime,video/x-matroska'
              : modalityFilter === 'audio'
              ? 'audio/wav,audio/mpeg,audio/flac'
              : undefined
          }
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 rounded bg-accent-mint hover:bg-accent-mint-bright text-surface-canvas font-bold text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          <span>Select Local Evidence File</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {uploading && (
          <div className="w-full space-y-1.5 pt-2">
            <div className="flex justify-between font-mono text-[10px] text-accent-mint">
              <span>{progressText}</span>
              <span className="animate-pulse">PROCESSING</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded overflow-hidden">
              <div className="h-full bg-accent-mint animate-pulse w-3/4 rounded"></div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2 bg-accent-crimson/10 border border-accent-crimson/30 rounded text-accent-crimson text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Forensic Format Constraints & Verification Badges */}
        <div className="w-full pt-4 border-t border-border-hairpin grid grid-cols-2 gap-3 text-left font-mono text-[10px] text-content-muted">
          <div className="space-y-1">
            <span className="text-content-secondary font-semibold uppercase block">Supported Formats:</span>
            <div>Images: JPEG, PNG, TIFF, WebP</div>
            <div>Video: MP4 (H.264/AVC), MOV, MKV</div>
            <div>Audio: WAV (PCM), FLAC, MP3</div>
          </div>
          <div className="space-y-1">
            <span className="text-content-secondary font-semibold uppercase block">Custody Protocol:</span>
            <div>• Real-time SHA-256 pre-calculation</div>
            <div>• Immutable storage vault protection</div>
            <div>• C2PA manifest verification check</div>
          </div>
        </div>

        {/* Privacy & Local Processing Guarantee */}
        <div className="flex items-center gap-2 pt-2 text-[10.5px] font-mono text-accent-mint bg-accent-mint/5 px-3 py-1.5 rounded border border-accent-mint/20">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>Local Processing Only — Evidence is never uploaded to external AI services</span>
        </div>
      </div>
    </div>
  );
};
