import React, { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { ImagePreview } from '../components/ImagePreview';
import { ResultCard } from '../components/ResultCard';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { TechnicalDetails } from '../components/TechnicalDetails';
import { inspectDocumentImage } from '../services/api';
import type { InspectionResult } from '../types/inspection';
import { RefreshCw, FileText } from 'lucide-react';

interface InspectProps {
  initialResult?: InspectionResult | null;
  onClearInitialResult?: () => void;
}

export const Inspect: React.FC<InspectProps> = ({
  initialResult,
  onClearInitialResult,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If reopening a history item
  useEffect(() => {
    if (initialResult) {
      setInspectionResult(initialResult);
      if (initialResult.metrics) {
        setDimensions({
          width: initialResult.metrics.image_width,
          height: initialResult.metrics.image_height,
        });
      }
    }
  }, [initialResult]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);
    setInspectionResult(null);

    // Create object URL for preview and read dimensions
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };

  const handleClear = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setInspectionResult(null);
    setErrorMessage(null);
    setUploadProgress(null);
    if (onClearInitialResult) {
      onClearInitialResult();
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setUploadProgress(10);

    try {
      const result = await inspectDocumentImage(selectedFile, (percent) => {
        setUploadProgress(percent);
      });
      setInspectionResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during inspection. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Document Quality Inspector
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Detect orientation, blur, contrast, cropping issues, and background clutter.
          </p>
        </div>

        {inspectionResult && (
          <button
            type="button"
            onClick={handleClear}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Upload New Document</span>
          </button>
        )}
      </div>

      {/* Main Upload Zone when no result is currently rendered */}
      {!inspectionResult && (
        <div className="max-w-3xl mx-auto py-4">
          <UploadZone
            onFileSelected={handleFileSelected}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            uploadProgress={uploadProgress}
            selectedFile={selectedFile}
            imageDimensions={dimensions}
            onClear={handleClear}
            errorMessage={errorMessage}
          />
        </div>
      )}

      {/* Two-Column Inspection Workspace when inspection is completed */}
      {inspectionResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Image Preview, Zoom, Boundary Overlay */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            {previewUrl ? (
              <ImagePreview
                imageSrc={previewUrl}
                filename={selectedFile?.name || inspectionResult.filename || 'document.jpg'}
                dimensions={dimensions}
                documentBoundary={inspectionResult.document_boundary}
                suggestedRotation={inspectionResult.rotation_clockwise}
                isBlurry={
                  inspectionResult.issues?.includes('blurry_text') ||
                  inspectionResult.main_text_readable === false ||
                  (inspectionResult.metrics?.blur_score !== undefined && inspectionResult.metrics.blur_score < 65)
                }
                rawFile={selectedFile}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Original image preview not cached for privacy.</p>
                <button
                  type="button"
                  onClick={handleClear}
                  className="mt-3 px-3 py-1.5 text-xs font-medium bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200"
                >
                  Upload Again
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Results, Cards, Feedback, Technical Details */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Results Cards */}
            <ResultCard result={inspectionResult} />

            {/* 2. Feedback & Actionable Recommendations */}
            <FeedbackPanel
              result={inspectionResult}
              onInspectAnother={handleClear}
            />

            {/* 3. Collapsible Technical Details */}
            <TechnicalDetails result={inspectionResult} />

          </div>

        </div>
      )}

    </div>
  );
};
