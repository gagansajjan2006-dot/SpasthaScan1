import React, { useState, useEffect } from 'react';
import { UploadZone } from '../components/UploadZone';
import { ImagePreview } from '../components/ImagePreview';
import { ResultCard } from '../components/ResultCard';
import { IssueList } from '../components/IssueList';
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
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Ambient background glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-violet-600/15 via-indigo-500/10 to-teal-400/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Document Quality Inspector</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-950/80 text-violet-300 border border-violet-500/30 font-mono">
              Live Edge CV
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deterministic orientation, blur classification, 4-edge cropping, Moiré fraud detection, and background analysis.
          </p>
        </div>

        {inspectionResult && (
          <button
            type="button"
            onClick={handleClear}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900/90 border border-slate-700/80 hover:bg-slate-800 text-slate-200 shadow-lg hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
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
                obstruction={inspectionResult.obstruction}
                screenCapture={inspectionResult.screen_capture}
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

          {/* Right Column: Results, Cards, Issue List, Feedback, Technical Details */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. Results Cards */}
            <ResultCard result={inspectionResult} />

            {/* 2. Detected Issues List with Fix Directives */}
            <IssueList result={inspectionResult} />

            {/* 3. Feedback & Actionable Recommendations */}
            <FeedbackPanel
              result={inspectionResult}
              onInspectAnother={handleClear}
            />

            {/* 4. Collapsible Technical Details */}
            <TechnicalDetails result={inspectionResult} />

          </div>

        </div>
      )}

    </div>
  );
};
