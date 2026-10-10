import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Gauge, Type, AlertCircle, Clock, CheckCircle, Globe, CreditCard } from 'lucide-react';
import type { InspectionResult } from '../types/inspection';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface TechnicalDetailsProps {
  result: InspectionResult;
}

export const TechnicalDetails: React.FC<TechnicalDetailsProps> = ({ result }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const metrics = result.metrics;

  // Prepare chart data for Recharts visualization
  const chartData = [
    {
      name: 'Blur Score',
      value: metrics ? Math.min(200, Math.round(metrics.blur_score)) : 0,
      benchmark: 80,
      unit: 'Laplacian var',
      color: (metrics?.blur_score ?? 0) >= 80 ? '#10b981' : '#f59e0b',
    },
    {
      name: 'Contrast',
      value: metrics ? Math.round(metrics.contrast) : 0,
      benchmark: 35,
      unit: 'RMS std dev',
      color: (metrics?.contrast ?? 0) >= 30 ? '#10b981' : '#f43f5e',
    },
    {
      name: 'Brightness',
      value: metrics ? Math.round(metrics.brightness) : 0,
      benchmark: 130,
      unit: 'Luminance / 255',
      color: '#6366f1',
    },
    {
      name: 'OCR Conf',
      value: metrics?.ocr_confidence ? Math.round(metrics.ocr_confidence) : 0,
      benchmark: 75,
      unit: '% Conf',
      color: (metrics?.ocr_confidence ?? 0) >= 70 ? '#10b981' : '#64748b',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all">
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Technical Details & CV Diagnostics</h4>
            <p className="text-xs text-slate-500">
              Measured metrics, OCR output, computer vision benchmarks, and execution latency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {result.processing_time_ms && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5" />
              {result.processing_time_ms} ms
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-slate-100 text-xs">
          
          {/* Grid of Key Diagnostic Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">Dimensions</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {metrics ? `${metrics.image_width} × ${metrics.image_height}` : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Ratio: {metrics?.aspect_ratio}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">Processing Time</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {result.processing_time_ms ? `${result.processing_time_ms} ms` : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Latency: Local CV
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">OCR Words Detected</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {metrics?.ocr_word_count ?? 0} words
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Confidence: {metrics?.ocr_confidence ? `${metrics.ocr_confidence}%` : 'N/A'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-500 block mb-1">Analysis Status</span>
              <span className="text-sm font-bold text-slate-900 font-mono uppercase">
                {result.analysis_status}
              </span>
              <span className="text-[11px] text-emerald-600 block mt-0.5 font-medium">
                Pydantic Validated
              </span>
            </div>
          </div>

          {/* Recharts Bar Chart of Quality Metrics */}
          <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 my-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Gauge className="w-4 h-4 text-indigo-600" />
                <span>Computer Vision Quality Metrics</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Measured on actual pixels
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [`${value} (${item.payload.unit})`, item.payload.name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detected Rule-Based Issues List */}
          <div className="my-4">
            <span className="font-semibold text-slate-700 block mb-2">
              Rule-Based CV Flags & Diagnostics:
            </span>
            {result.issues && result.issues.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.issues.map((issue, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    {issue}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>No rule-based visual defects detected. Quality parameters meet target specifications.</span>
              </div>
            )}
          </div>

          {/* Advanced Physical Artifacts (Obstruction & Screen Capture) */}
          {(result.obstruction || result.screen_capture) && (
            <div className="my-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="font-semibold text-slate-700 block mb-2">
                Physical Camera & Capture Diagnostics:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="font-medium text-slate-500 block">Finger / Hand Obstruction</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-slate-900 font-mono">
                      {result.obstruction?.has_obstruction ? 'DETECTED' : 'None'}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {result.obstruction?.obstruction_pct ? `${result.obstruction.obstruction_pct}% coverage (${result.obstruction.corner_detail || result.obstruction.obstruction_region || 'border'})` : '0.0%'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                  <span className="font-medium text-slate-500 block">Screen Capture (Moiré)</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-slate-900 font-mono">
                      {result.screen_capture?.is_screen_photo ? 'DETECTED' : 'None'}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {result.screen_capture?.moire_score !== undefined ? `Moiré Score: ${result.screen_capture.moire_score}` : 'Score: 0.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detected Script & Multilingual OCR */}
          {result.detected_script && (
            <div className="my-4 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-800 mb-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>Multilingual OCR — Detected Script</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white border border-indigo-100">
                  <span className="text-slate-500 block">Script</span>
                  <span className="font-bold text-indigo-700 font-mono">
                    {result.detected_script.detected_script}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-indigo-100">
                  <span className="text-slate-500 block">Language Pack Used</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {result.detected_script.lang_used}
                  </span>
                </div>
              </div>
              {result.detected_script.lang_note && (
                <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ {result.detected_script.lang_note}
                </p>
              )}
            </div>
          )}

          {/* ID Card Physical Checks */}
          {result.id_checks && (
            <div className="my-4 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800 mb-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>ID Card Physical Checks</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className={`p-2.5 rounded-lg border ${
                  result.id_checks.aspect_ratio_ok
                    ? 'bg-white border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <span className="text-slate-500 block">Aspect Ratio</span>
                  <span className={`font-bold font-mono ${
                    result.id_checks.aspect_ratio_ok ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {result.id_checks.aspect_ratio} {result.id_checks.aspect_ratio_ok ? '✓' : '✗'}
                  </span>
                  <span className="text-[10px] text-slate-400">CR80 target 1.586</span>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  result.id_checks.corners_visible
                    ? 'bg-white border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <span className="text-slate-500 block">Corners</span>
                  <span className={`font-bold font-mono ${
                    result.id_checks.corners_visible ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {result.id_checks.corners_visible ? 'All 4 Visible ✓' : 'Missing ✗'}
                  </span>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  result.id_checks.glare_central_ok
                    ? 'bg-white border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <span className="text-slate-500 block">Central Glare</span>
                  <span className={`font-bold font-mono ${
                    result.id_checks.glare_central_ok ? 'text-emerald-700' : 'text-amber-600'
                  }`}>
                    {result.id_checks.glare_central_pct}% {result.id_checks.glare_central_ok ? '✓' : '⚠'}
                  </span>
                  <span className="text-[10px] text-slate-400">Threshold 40%</span>
                </div>

                <div className={`p-2.5 rounded-lg border ${
                  result.id_checks.face_visible
                    ? 'bg-white border-emerald-200'
                    : result.id_checks.face_cascade_available
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-slate-500 block">Photo Region</span>
                  <span className={`font-bold font-mono ${
                    result.id_checks.face_visible
                      ? 'text-emerald-700'
                      : result.id_checks.face_cascade_available
                      ? 'text-amber-600'
                      : 'text-slate-500'
                  }`}>
                    {result.id_checks.face_cascade_available
                      ? result.id_checks.face_visible ? 'Face ✓' : 'Not Found ⚠'
                      : 'N/A (no cascade)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* OCR Sample Snippet */}
          {metrics?.ocr_detected_text && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1.5">
                <Type className="w-4 h-4 text-indigo-600" />
                <span>Detected OCR Text Sample</span>
              </div>
              <p className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] leading-relaxed select-all overflow-x-auto">
                {metrics.ocr_detected_text}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
