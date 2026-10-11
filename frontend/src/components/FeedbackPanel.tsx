import React, { useState } from 'react';
import { 
  Sparkles, 
  Wrench, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  RefreshCw, 
  ShieldCheck
} from 'lucide-react';
import type { InspectionResult } from '../types/inspection';

interface FeedbackPanelProps {
  result: InspectionResult;
  onInspectAnother: () => void;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  result,
  onInspectAnother,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Exact JSON payload matching the required output schema
  const getExactJson = () => {
    const rawSchemaJson = {
      is_document: result.is_document,
      document_type: result.document_type,
      rotation_clockwise: result.rotation_clockwise,
      rotation_confidence: result.rotation_confidence,
      main_text_readable: result.main_text_readable,
      readability_confidence: result.readability_confidence,
      is_cropped: result.is_cropped,
      cropping_confidence: result.cropping_confidence,
      background_clutter: result.background_clutter,
      feedback: result.feedback,
      recommended_fix: result.recommended_fix,
      analysis_status: result.analysis_status,
    };
    return JSON.stringify(rawSchemaJson, null, 2);
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(getExactJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([getExactJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spasthascan_${result.filename?.replace(/\.[^/.]+$/, '') || 'inspection'}_results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = () => {
    const reportText = `================================================
SPASTHASCAN — DOCUMENT QUALITY INSPECTION REPORT
================================================
Generated: ${result.timestamp || new Date().toISOString()}
Target File: ${result.filename || 'Uploaded Document'}
Analysis Status: ${result.analysis_status.toUpperCase()}

1. PRIMARY FINDINGS
------------------------------------------------
- Document Identified: ${result.is_document ? 'YES' : 'NO'} (${result.document_type.toUpperCase()})
- Orientation: ${result.rotation_clockwise === 0 ? 'Upright (0°)' : `Needs ${result.rotation_clockwise}° CW rotation`} (Confidence: ${result.rotation_confidence ?? 'N/A'})
- Text Readability: ${result.main_text_readable === true ? 'READABLE' : result.main_text_readable === false ? 'UNREADABLE' : 'UNCERTAIN'} (Confidence: ${result.readability_confidence ?? 'N/A'})
- Cropping Status: ${result.is_cropped ? 'CROPPED / CUT OFF' : 'COMPLETE EDGES'} (Confidence: ${result.cropping_confidence ?? 'N/A'})
- Background Clutter: ${result.background_clutter.toUpperCase()}

2. FEEDBACK & ACTIONABLE FIX
------------------------------------------------
Feedback:
"${result.feedback}"

Recommended Action:
"${result.recommended_fix}"

3. COMPUTER VISION METRICS (MEASURED)
------------------------------------------------
- Dimensions: ${result.metrics?.image_width} x ${result.metrics?.image_height} px (Aspect: ${result.metrics?.aspect_ratio})
- Blur Score (Laplacian Var): ${result.metrics?.blur_score}
- Brightness (Mean Y): ${result.metrics?.brightness} / 255
- Contrast (Std Dev): ${result.metrics?.contrast}
- OCR Confidence: ${result.metrics?.ocr_confidence ?? 'N/A'}%
- OCR Detected Word Count: ${result.metrics?.ocr_word_count ?? 0}
- Detected Issues: ${result.issues?.length ? result.issues.join(', ') : 'None'}
- Processing Time: ${result.processing_time_ms ?? 'N/A'} ms

================================================
END OF AUDIT REPORT
================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spasthascan_${result.filename?.replace(/\.[^/.]+$/, '') || 'document'}_quality_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isAcceptable =
    result.is_document &&
    result.main_text_readable === true &&
    result.rotation_clockwise === 0 &&
    !result.is_cropped &&
    (result.background_clutter === 'none' || result.background_clutter === 'low');

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl backdrop-blur-md">
      
      {/* Top Banner: Feedback statement */}
      <div className={`p-4 rounded-xl border flex items-start gap-3.5 mb-5 ${
        isAcceptable
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          : 'bg-violet-950/40 border-violet-500/30 text-violet-100'
      }`}>
        <div className={`p-2 rounded-xl shrink-0 ${
          isAcceptable ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-violet-600/20 text-teal-300 border border-violet-500/30'
        }`}>
          {isAcceptable ? <ShieldCheck className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm text-white">
              {isAcceptable ? 'Quality Inspection Passed' : 'Inspection Evaluation'}
            </h4>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-teal-300 font-semibold">
              Status: {result.analysis_status}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-200">
            {result.feedback}
          </p>
        </div>
      </div>

      {/* Recommended Fix Box */}
      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
          <Wrench className="w-3.5 h-3.5 text-teal-400" />
          <span>Recommended Fix</span>
        </div>
        <p className="text-sm font-bold text-teal-300">
          {result.recommended_fix}
        </p>
      </div>

      {/* Summary of Confirmed Findings */}
      <div className="border-t border-slate-800 pt-4 mb-6">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Confirmed Visual Findings
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Orientation Confidence</span>
            <span className="font-semibold text-teal-300 font-mono">
              {result.rotation_confidence !== null ? `${Math.round(result.rotation_confidence * 100)}%` : 'Uncertain'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Cropping Confidence</span>
            <span className="font-semibold text-teal-300 font-mono">
              {result.cropping_confidence !== null ? `${Math.round(result.cropping_confidence * 100)}%` : 'Uncertain'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Readability Assessment</span>
            <span className="font-semibold text-teal-300 font-mono">
              {result.readability_confidence !== null ? `${Math.round(result.readability_confidence * 100)}%` : 'Uncertain'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400">Background Noise</span>
            <span className="font-semibold text-teal-300 uppercase font-mono">
              {result.background_clutter}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        
        {/* Inspect Another */}
        <button
          type="button"
          onClick={onInspectAnother}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Inspect Another Image</span>
        </button>

        {/* JSON & Report CTAs */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyJson}
            title="Copy API Schema JSON to Clipboard"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            title="Download Valid JSON Output"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            title="Download Full Text Report"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white shadow-lg shadow-indigo-950/60 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>

      </div>

    </div>
  );
};
