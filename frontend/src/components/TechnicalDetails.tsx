import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Gauge, Type, AlertCircle, Clock, CheckCircle, Globe, CreditCard, Sparkles } from 'lucide-react';
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
      color: (metrics?.blur_score ?? 0) >= 80 ? '#2dd4bf' : '#f59e0b',
    },
    {
      name: 'Contrast',
      value: metrics ? Math.round(metrics.contrast) : 0,
      benchmark: 35,
      unit: 'RMS std dev',
      color: (metrics?.contrast ?? 0) >= 30 ? '#2dd4bf' : '#f43f5e',
    },
    {
      name: 'Brightness',
      value: metrics ? Math.round(metrics.brightness) : 0,
      benchmark: 130,
      unit: 'Luminance / 255',
      color: '#818cf8',
    },
    {
      name: 'OCR Conf',
      value: metrics?.ocr_confidence ? Math.round(metrics.ocr_confidence) : 0,
      benchmark: 75,
      unit: '% Conf',
      color: (metrics?.ocr_confidence ?? 0) >= 70 ? '#2dd4bf' : '#64748b',
    },
  ];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl backdrop-blur-md transition-all">
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-teal-300">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Technical Details & CV Diagnostics</h4>
            <p className="text-xs text-slate-400">
              Measured metrics, OCR output, computer vision benchmarks, and execution latency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {result.processing_time_ms && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-teal-300 font-mono bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
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
        <div className="px-6 pb-6 pt-2 border-t border-slate-800 text-xs">
          
          {/* Grid of Key Diagnostic Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Dimensions</span>
              <span className="text-sm font-bold text-white font-mono">
                {metrics ? `${metrics.image_width} × ${metrics.image_height}` : 'N/A'}
              </span>
              <span className="text-[11px] text-teal-400 block mt-0.5 font-mono">
                Ratio: {metrics?.aspect_ratio}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Processing Time</span>
              <span className="text-sm font-bold text-teal-300 font-mono">
                {result.processing_time_ms ? `${result.processing_time_ms} ms` : 'N/A'}
              </span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Latency: Local CV
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">OCR Words Detected</span>
              <span className="text-sm font-bold text-white font-mono">
                {metrics?.ocr_word_count ?? 0} words
              </span>
              <span className="text-[11px] text-teal-400 block mt-0.5 font-mono">
                Conf: {metrics?.ocr_confidence ? `${metrics.ocr_confidence}%` : 'N/A'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Analysis Status</span>
              <span className="text-sm font-bold text-white font-mono uppercase">
                {result.analysis_status}
              </span>
              <span className="text-[11px] text-emerald-400 block mt-0.5 font-medium font-mono">
                Pydantic Validated
              </span>
            </div>
          </div>

          {/* Recharts Bar Chart of Quality Metrics */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 my-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Gauge className="w-4 h-4 text-teal-400" />
                <span>Computer Vision Quality Metrics</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Measured on actual pixel tensors
              </span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#334155" />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [`${value} (${item.payload.unit})`, item.payload.name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc', fontSize: '12px' }}
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
            <span className="font-semibold text-slate-300 block mb-2">
              Rule-Based CV Flags & Diagnostics:
            </span>
            {result.issues && result.issues.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.issues.map((issue, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-500/30 font-mono text-[11px] flex items-center gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    {issue}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-300 bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-500/30">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>No rule-based visual defects detected. Quality parameters meet target specifications.</span>
              </div>
            )}
          </div>

          {/* Advanced Physical Artifacts (Obstruction & Screen Capture) */}
          {(result.obstruction || result.screen_capture) && (
            <div className="my-4 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="font-semibold text-slate-300 block mb-2">
                Physical Camera & Capture Diagnostics:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-medium text-slate-400 block">Finger / Hand Obstruction</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-white font-mono">
                      {result.obstruction?.has_obstruction ? 'DETECTED' : 'None'}
                    </span>
                    <span className="text-teal-400 font-mono">
                      {result.obstruction?.obstruction_pct ? `${result.obstruction.obstruction_pct}% coverage (${result.obstruction.corner_detail || result.obstruction.obstruction_region || 'border'})` : '0.0%'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="font-medium text-slate-400 block">Screen Capture (Moiré)</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-white font-mono">
                      {result.screen_capture?.is_screen_photo ? 'DETECTED' : 'None'}
                    </span>
                    <span className="text-teal-400 font-mono">
                      {result.screen_capture?.moire_score !== undefined ? `Moiré Score: ${result.screen_capture.moire_score}` : 'Score: 0.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detected Script & Multilingual OCR */}
          {result.detected_script && (
            <div className="my-4 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 font-semibold text-teal-300 mb-2">
                <Globe className="w-4 h-4 text-teal-400" />
                <span>Multilingual OCR — Detected Script</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Script</span>
                  <span className="font-bold text-violet-300 font-mono">
                    {result.detected_script.detected_script}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Language Pack Used</span>
                  <span className="font-bold text-white font-mono">
                    {result.detected_script.lang_used}
                  </span>
                </div>
              </div>
              {result.detected_script.lang_note && (
                <p className="mt-2 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-lg px-3 py-2">
                  ⚠ {result.detected_script.lang_note}
                </p>
              )}
            </div>
          )}

          {/* ID Card Physical Checks */}
          {result.id_checks && (
            <div className="my-4 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CreditCard className="w-4 h-4" />
                  <span>Physical ID Card Integrity (CR80 Standard)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  result.id_checks.aspect_ratio_ok && result.id_checks.corners_visible
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                }`}>
                  {result.id_checks.aspect_ratio_ok && result.id_checks.corners_visible ? 'VALID ID GEOMETRY' : 'CHECK FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">CR80 Aspect Ratio</span>
                  <span className="font-bold text-white font-mono">
                    {result.id_checks.aspect_ratio}
                  </span>
                  <span className="text-[10px] text-teal-400 block mt-0.5">
                    Target: 1.586 (±0.08)
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">4 Corners Visible</span>
                  <span className={`font-bold font-mono ${result.id_checks.corners_visible ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.id_checks.corners_visible ? 'YES (Full View)' : 'NO (Clipped)'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Central Glare</span>
                  <span className={`font-bold font-mono ${result.id_checks.glare_central_ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.id_checks.glare_central_pct}%
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {result.id_checks.glare_central_ok ? 'Within limits (<8%)' : 'Glare on critical area'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Photo Region</span>
                  <span className={`font-bold font-mono ${
                    result.id_checks.face_visible
                      ? 'text-emerald-400'
                      : result.id_checks.face_cascade_available
                      ? 'text-amber-400'
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

          {/* Task E4: Blur Classification & Coaching Analysis */}
          {result.blur_analysis && (
            <div className="my-4 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-violet-300">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>Blur Type Classification & Spectral Diagnostics (Task E4)</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  result.blur_analysis.blur_type === 'none'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : result.blur_analysis.blur_type === 'motion'
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : result.blur_analysis.blur_type === 'defocus'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {result.blur_analysis.blur_type} ({Math.round(result.blur_analysis.confidence * 100)}% conf)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Blur Type</span>
                  <span className="font-bold text-white font-mono capitalize">
                    {result.blur_analysis.blur_type}
                  </span>
                  <span className="text-[10px] text-teal-300 block mt-0.5">
                    {result.blur_analysis.blur_type === 'motion' ? 'Camera / Hand shake' :
                     result.blur_analysis.blur_type === 'defocus' ? 'Lens out of focus' :
                     result.blur_analysis.blur_type === 'none' ? 'Sharp optical field' : 'Ambiguous signature'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Motion Angle</span>
                  <span className="font-bold text-white font-mono">
                    {result.blur_analysis.blur_direction_deg !== null && result.blur_analysis.blur_direction_deg !== undefined
                      ? `${result.blur_analysis.blur_direction_deg}°`
                      : 'N/A (isotropic)'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Directional trajectory
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">Directional Energy Ratio</span>
                  <span className="font-bold text-teal-300 font-mono">
                    {result.blur_analysis.directional_energy_ratio ?? result.blur_analysis.sobel_xy_ratio ?? '1.0'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Max/min gradient ratio
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">FFT Spectrum Anisotropy</span>
                  <span className="font-bold text-teal-300 font-mono">
                    {result.blur_analysis.fft_anisotropy ?? '1.0'}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    λ₁ / λ₂ spectral moments
                  </span>
                </div>
              </div>

              {result.blur_analysis.blur_type === 'motion' && (
                <p className="mt-2.5 text-[11px] text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2">
                  <span>💡 <strong>Coaching:</strong> Hold the phone steady or use both hands.</span>
                </p>
              )}
              {result.blur_analysis.blur_type === 'defocus' && (
                <p className="mt-2.5 text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2">
                  <span>💡 <strong>Coaching:</strong> Tap the text to focus and move slightly farther back.</span>
                </p>
              )}
            </div>
          )}

          {/* OCR Sample Snippet */}
          {metrics?.ocr_detected_text && (
            <div className="mt-4 pt-3.5 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-2">
                <Type className="w-4 h-4 text-teal-400" />
                <span>Detected OCR Text Sample</span>
              </div>
              <p className="p-3.5 bg-black border border-slate-800 text-teal-300 rounded-xl font-mono text-[11px] leading-relaxed select-all overflow-x-auto shadow-inner">
                {metrics.ocr_detected_text}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
