import React, { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { 
  UploadCloud, 
  FileImage, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  ArrowRight, 
  Loader2,
  Camera,
  FileText
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  uploadProgress: number | null;
  selectedFile: File | null;
  imageDimensions: { width: number; height: number } | null;
  onClear: () => void;
  errorMessage: string | null;
}

const MAX_SIZE_MB = 25;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFileSelected,
  onAnalyze,
  isAnalyzing,
  uploadProgress,
  selectedFile,
  imageDimensions,
  onClear,
  errorMessage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setLocalError(null);

    // Validate type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTS.includes(ext);
    if (!isValidType) {
      setLocalError(`Unsupported file format "${file.type || ext}". Please upload a JPG, JPEG, PNG, or WEBP document image.`);
      return;
    }

    // Validate size (25 MB)
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setLocalError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed size of ${MAX_SIZE_MB} MB.`);
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const activeError = errorMessage || localError;

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Live Camera Scanner Modal with Real-Time Spoken Coach */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={validateAndSetFile}
      />

      {/* Upload Box or Selected File Card */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all duration-200 select-none backdrop-blur-xl ${
            isDragging
              ? 'border-teal-400 bg-violet-950/40 scale-[1.01]'
              : 'border-slate-800 bg-slate-900/80 hover:border-violet-500/50 shadow-2xl'
          }`}
        >
          <div className="flex flex-col items-center justify-center max-w-lg mx-auto">
            {/* Ambient glowing icon container */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-teal-400/20 border border-violet-500/40 flex items-center justify-center text-teal-300 mb-5 shadow-lg shadow-violet-950/50">
              <UploadCloud className="w-8 h-8 transition-transform group-hover:scale-110" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1.5">
              Select or Scan Document Image
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Drag and drop your document file here, or choose an option below:
            </p>

            {/* Prominent Action Buttons: Upload File or Document VS Use Camera */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-6">
              {/* Option 1: Upload File or Document */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white shadow-lg shadow-indigo-950/60 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Upload File or Document</span>
              </button>

              {/* Option 2: Camera Capture Option */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700 shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-teal-400" />
                <span>Scan with Camera</span>
              </button>
            </div>

            {/* Allowed formats metadata */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-md font-mono text-slate-300">JPG</span>
              <span className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-md font-mono text-slate-300">JPEG</span>
              <span className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-md font-mono text-slate-300">PNG</span>
              <span className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-md font-mono text-slate-300">WEBP</span>
              <span className="text-slate-500">•</span>
              <span>Max {MAX_SIZE_MB} MB</span>
            </div>

            {/* Quick Sample Presets */}
            <div 
              className="mt-7 pt-6 border-t border-slate-800 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Or test with sample documents:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: 'Clear Certificate', file: 'clear_certificate.jpg' },
                  { label: 'Clear Scan', file: 'clear_document_scan.png' },
                  { label: 'Rotated 90°', file: 'rotated_document.jpg' },
                  { label: 'Blurry Doc', file: 'blurry_document.jpg' },
                  { label: 'Cropped Doc', file: 'cropped_document.png' },
                  { label: 'Non-Document', file: 'non_document.jpg' },
                ].map((sample) => (
                  <button
                    key={sample.file}
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/samples/${sample.file}`);
                        const blob = await res.blob();
                        const file = new File([blob], sample.file, { type: blob.type || 'image/jpeg' });
                        validateAndSetFile(file);
                      } catch (err) {
                        console.error('Failed to load sample', err);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-950/80 hover:bg-violet-950/60 hover:text-teal-300 text-slate-300 border border-slate-800 hover:border-violet-500/40 transition-all cursor-pointer"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card in Dark Navy Glassmorphism */
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            
            {/* File info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-teal-400/20 border border-violet-500/30 overflow-hidden flex items-center justify-center shrink-0 text-teal-300">
                <FileImage className="w-8 h-8" />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h4 className="font-semibold text-white text-base truncate max-w-xs sm:max-w-md" title={selectedFile.name}>
                    {selectedFile.name}
                  </h4>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shrink-0">
                    Ready
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                  <span>{formatFileSize(selectedFile.size)}</span>
                  {imageDimensions && (
                    <>
                      <span>•</span>
                      <span>{imageDimensions.width} × {imageDimensions.height} px</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="uppercase">{selectedFile.type.split('/')[1] || 'IMAGE'}</span>
                </div>
              </div>
            </div>

            {/* Actions for selected file */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Upload Other
              </button>
              
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                disabled={isAnalyzing}
                className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                Retake
              </button>

              <button
                type="button"
                onClick={onClear}
                disabled={isAnalyzing}
                className="px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/30 rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>

          {/* Upload progress bar */}
          {uploadProgress !== null && isAnalyzing && (
            <div className="mt-5 pt-5 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-2 font-mono">
                <span>Executing Automated Inspection Pipeline...</span>
                <span className="font-bold text-teal-400">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-violet-600 via-indigo-500 to-teal-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(45,212,191,0.5)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Analyze CTA */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 hidden sm:inline">
              Our 6-parameter OpenCV engine runs in under 30ms with zero hallucination.
            </span>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`w-full sm:w-auto px-7 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 text-white shadow-xl transition-all cursor-pointer ${
                isAnalyzing
                  ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 shadow-indigo-950/80 active:scale-98'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  <span>Inspecting Document...</span>
                </>
              ) : (
                <>
                  <span>Analyze Image</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Validation or API error alert */}
      {activeError && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-3 text-rose-200 text-xs sm:text-sm animate-in fade-in duration-150">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-rose-300">Document upload rejected: </span>
            <span>{activeError}</span>
          </div>
        </div>
      )}
    </div>
  );
};
