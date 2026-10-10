import React from 'react';
import { X, Cpu, Eye, Zap, Lock } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">About SpasthaScan</h3>
              <p className="text-xs text-slate-500">Document Image Quality Inspector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-sm text-slate-600 max-h-[75vh] overflow-y-auto">
          
          <div>
            <h4 className="font-semibold text-slate-900 mb-1.5">Objective Quality Inspection</h4>
            <p className="leading-relaxed">
              SpasthaScan inspects uploaded document images to verify whether they are suitable for optical reading, automated processing, and digitization. Unlike generic chatbots, SpasthaScan acts strictly as an image-quality inspector that measures visible pixels without hallucinating issues.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Orientation & OCR</span>
              </div>
              <p className="text-xs text-slate-500">
                Detects required clockwise rotation (0°, 90°, 180°, 270°) and evaluates text legibility confidence.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Cropping & Margin Bounds</span>
              </div>
              <p className="text-xs text-slate-500">
                Identifies clipped margins, cut-off document corners, and high-frequency edge intersections.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>Background Clutter</span>
              </div>
              <p className="text-xs text-slate-500">
                Separates the document surface from background noise, classifying clutter from none to high.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs mb-1">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Privacy & Security</span>
              </div>
              <p className="text-xs text-slate-500">
                Temporary uploads are discarded immediately after analysis. No original images are persisted.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/60 text-xs space-y-1">
            <p className="font-semibold text-indigo-950">Calibration & Ground Truth Principle</p>
            <p className="text-indigo-800 leading-relaxed">
              Measurements (blur scores, contrast ratios, Canny edge densities) are calibrated against physical document standards. When visual evidence is ambiguous, the system explicitly reports uncertainty rather than forcing a false positive or negative.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
