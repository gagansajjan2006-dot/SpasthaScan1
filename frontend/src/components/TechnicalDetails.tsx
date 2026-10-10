import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, Gauge, Type, AlertCircle, Clock, CheckCircle } from 'lucide-react';
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
