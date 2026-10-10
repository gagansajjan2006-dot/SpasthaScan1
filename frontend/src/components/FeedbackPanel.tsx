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
Confidential & Automated Quality Inspection
`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spasthascan_${result.filename?.replace(/\.[^/.]+$/, '') || 'inspection'}_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isAcceptable = result.is_document && 
    result.rotation_clockwise === 0 && 
    result.main_text_readable === true && 
    result.is_cropped === false && 
    (result.background_clutter === 'none' || result.background_clutter === 'low');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      
      {/* Top Banner: Feedback statement */}
      <div className={`p-4 rounded-xl border flex items-start gap-3.5 mb-5 ${
        isAcceptable
          ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
          : 'bg-indigo-50/70 border-indigo-200/80 text-slate-900'
      }`}>
        <div className={`p-2 rounded-lg shrink-0 ${
          isAcceptable ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
        }`}>
          {isAcceptable ? <ShieldCheck className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">
              {isAcceptable ? 'Quality Inspection Passed' : 'Inspection Evaluation'}
            </h4>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-600">
              Status: {result.analysis_status}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed">
            {result.feedback}
          </p>
        </div>
      </div>

      {/* Recommended Fix Box */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          <Wrench className="w-3.5 h-3.5 text-indigo-600" />
          <span>Recommended Fix</span>
        </div>
        <p className="text-sm font-bold text-slate-900">
          {result.recommended_fix}
        </p>
      </div>

      {/* Summary of Confirmed Findings */}
      <div className="border-t border-slate-100 pt-4 mb-6">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
          Confirmed Visual Findings
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Orientation Confidence</span>
            <span className="font-semibold text-slate-900 font-mono">
              {result.rotation_confidence !== null ? `${Math.round(result.rotation_confidence * 100)}%` : 'Uncertain'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Cropping Confidence</span>
            <span className="font-semibold text-slate-900 font-mono">
              {result.cropping_confidence !== null ? `${Math.round(result.cropping_confidence * 100)}%` : 'Uncertain'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Readability Assessment</span>
            <span className="font-semibold text-slate-900 font-mono">
              {result.readability_confidence !== null ? `${Math.round(result.readability_confidence * 100)}%` : 'Uncertain'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
            <span className="text-slate-600">Background Noise</span>
            <span className="font-semibold text-slate-900 uppercase font-mono">
              {result.background_clutter}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
        
        {/* Inspect Another */}
        <button
          type="button"
          onClick={onInspectAnother}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Inspect Another Image</span>
        </button>

        {/* JSON & Report CTAs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyJson}
            title="Copy API Schema JSON to Clipboard"
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJson}
            title="Download Valid JSON Output"
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            title="Download Full Text Report"
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>

      </div>

    </div>
  );
};
