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

      {/* Live Camera Scanner Modal */}
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
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 select-none ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
              : 'border-slate-300 bg-white hover:border-indigo-400/80 shadow-xs'
          }`}
        >
          <div className="flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8 transition-transform group-hover:scale-110" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Select or Scan Document Image
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-5">
              Drag and drop your document file here, or choose an option below:
            </p>

            {/* Prominent Action Buttons: Upload File or Document VS Use Camera */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto mb-6">
              {/* Option 1: Upload File or Document */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>Upload File or Document</span>
              </button>

              {/* Option 2: Camera Capture Option */}
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Scan with Camera</span>
              </button>
            </div>

            {/* Allowed formats metadata */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-600">JPG</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-600">JPEG</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-600">PNG</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium text-slate-600">WEBP</span>
              <span className="text-slate-400">•</span>
              <span>Max {MAX_SIZE_MB} MB</span>
            </div>

            {/* Quick Sample Presets */}
            <div 
              className="mt-6 pt-5 border-t border-slate-100 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Or test with sample documents:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
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
                        onFileSelected(file);
                      } catch (err) {
                        console.error('Failed to load sample', err);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            {/* File info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center shrink-0">
                <FileImage className="w-8 h-8 text-indigo-600" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900 text-base truncate max-w-xs sm:max-w-md" title={selectedFile.name}>
                    {selectedFile.name}
                  </h4>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Ready
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
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
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Upload Other
              </button>
              
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                disabled={isAnalyzing}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                Retake
              </button>

              <button
                type="button"
                onClick={onClear}
                disabled={isAnalyzing}
                className="px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          </div>

          {/* Upload progress bar */}
          {uploadProgress !== null && isAnalyzing && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span>Uploading & Processing Image...</span>
                <span className="font-semibold text-indigo-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Analyze CTA */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Our automated computer vision & OCR pipeline will inspect quality metrics.
            </span>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-white shadow-sm transition-all ${
                isAnalyzing
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 shadow-indigo-200 hover:shadow-md hover:shadow-indigo-300 active:scale-98'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-in fade-in duration-150">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Document upload rejected: </span>
            <span>{activeError}</span>
          </div>
        </div>
      )}
    </div>
  );
};
