import React from 'react';
import { 
  FileText, 
  RotateCw, 
  BookOpen, 
  Crop, 
  LayoutGrid, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  Camera,
  Printer,
  Sparkles
} from 'lucide-react';
import type { InspectionResult } from '../types/inspection';

interface ResultCardProps {
  result: InspectionResult;
}

type SeverityLevel = 'green' | 'amber' | 'red';

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  // Determine severity for Card 1: Document Type
  const getDocTypeStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    if (!result.is_document || result.document_type === 'other') {
      return {
        severity: 'red',
        label: 'Non-Document',
        icon: <XCircle className="w-5 h-5 text-rose-400" />,
        desc: 'Image lacks textual document structure',
      };
    }
    if (result.document_type === 'uncertain') {
      return {
        severity: 'amber',
        label: 'Uncertain Type',
        icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
        desc: 'Unclear if physical photo or scan',
      };
    }
    if (result.document_type === 'scan') {
      return {
        severity: 'green',
        label: 'Digital Scan',
        icon: <Printer className="w-5 h-5 text-teal-300" />,
        desc: 'Flatbed or digitized scan document',
      };
    }
    return {
      severity: 'green',
      label: 'Document Photo',
      icon: <Camera className="w-5 h-5 text-emerald-400" />,
      desc: 'Physical photograph of a document',
    };
  };

  // Determine severity for Card 2: Orientation / Rotation
  const getOrientationStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    if (result.rotation_clockwise === null) {
      return {
        severity: 'amber',
        label: 'Uncertain',
        icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
        desc: 'Orientation confidence is low',
      };
    }
    if (result.rotation_clockwise === 0) {
      return {
        severity: 'green',
        label: 'Upright (0°)',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        desc: 'No rotation required',
      };
    }
    return {
      severity: 'red',
      label: `Rotate ${result.rotation_clockwise}° CW`,
      icon: <RotateCw className="w-5 h-5 text-rose-400" />,
      desc: `Needs ${result.rotation_clockwise}° clockwise rotation`,
    };
  };

  // Determine severity for Card 3: Readability
  const getReadabilityStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string; percent: number | null } => {
    if (result.main_text_readable === null || result.readability_confidence === null) {
      return {
        severity: 'amber',
        label: 'Uncertain',
        icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
        desc: 'Text presence cannot be confirmed reliably',
        percent: null,
      };
    }
    const pct = Math.round(result.readability_confidence * 100);
    if (result.main_text_readable === true) {
      return {
        severity: pct >= 80 ? 'green' : 'amber',
        label: 'Readable',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        desc: `High confidence text clarity (${pct}%)`,
        percent: pct,
      };
    }
    return {
      severity: 'red',
      label: 'Unreadable',
      icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
      desc: `Low confidence text clarity (${pct}%)`,
      percent: pct,
    };
  };

  // Determine severity for Card 4: Cropping
  const getCroppingStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    if (result.is_cropped) {
      return {
        severity: 'red',
        label: 'Cropped Borders',
        icon: <Crop className="w-5 h-5 text-rose-400" />,
        desc: 'Document edges or corners clipped by frame',
      };
    }
    return {
      severity: 'green',
      label: 'Full View',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      desc: 'All four borders fully visible in frame',
    };
  };

  // Determine severity for Card 5: Background Clutter
  const getClutterStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    switch (result.background_clutter) {
      case 'none':
        return {
          severity: 'green',
          label: 'Clean Border',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          desc: 'No background surface clutter detected',
        };
      case 'low':
        return {
          severity: 'green',
          label: 'Low Clutter',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          desc: 'Minor unobtrusive surface background',
        };
      case 'medium':
        return {
          severity: 'amber',
          label: 'Moderate Clutter',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          desc: 'Noticeable desk or object background textures',
        };
      case 'high':
        return {
          severity: 'red',
          label: 'Heavy Clutter',
          icon: <AlertTriangle className="w-5 h-5 text-rose-400" />,
          desc: 'Busy background distracting from document',
        };
      default:
        return {
          severity: 'amber',
          label: 'Uncertain',
          icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
          desc: 'Background surface pattern is ambiguous',
        };
    }
  };

  const docType = getDocTypeStatus();
  const orientation = getOrientationStatus();
  const readability = getReadabilityStatus();
  const cropping = getCroppingStatus();
  const clutter = getClutterStatus();

  // Color mapper for Dark Navy Theme
  const getBadgeClasses = (severity: SeverityLevel): string => {
    switch (severity) {
      case 'green':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'amber':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'red':
        return 'bg-rose-950/80 text-rose-300 border-rose-500/40';
    }
  };

  const getCardBorderClasses = (severity: SeverityLevel): string => {
    switch (severity) {
      case 'green':
        return 'border-emerald-500/30 hover:border-emerald-400/50 shadow-emerald-950/20';
      case 'amber':
        return 'border-amber-500/30 hover:border-amber-400/50 shadow-amber-950/20';
      case 'red':
        return 'border-rose-500/40 hover:border-rose-400/60 shadow-rose-950/20';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      
      {/* Card 1: Document Type */}
      <div className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all ${getCardBorderClasses(docType.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              {docType.icon}
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Doc Type
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClasses(docType.severity)}`}>
            {docType.label}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-2">{docType.desc}</p>
      </div>

      {/* Card 2: Orientation */}
      <div className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all ${getCardBorderClasses(orientation.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <RotateCw className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Orientation
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClasses(orientation.severity)}`}>
            {orientation.label}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-2">{orientation.desc}</p>
      </div>

      {/* Card 3: Readability & Confidence */}
      <div className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all ${getCardBorderClasses(readability.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <BookOpen className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Readability
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClasses(readability.severity)}`}>
            {readability.label}
          </span>
        </div>
        
        {/* Confidence Percentage Bar */}
        {readability.percent !== null ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-medium text-[11px]">Assessment Confidence</span>
              <span className="font-semibold text-white font-mono">{readability.percent}%</span>
            </div>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  readability.severity === 'green'
                    ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
                    : readability.severity === 'amber'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${readability.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-300 mt-2">{readability.desc}</p>
        )}

        {/* If blurry, hint that enhanced mode can show text clearly */}
        {(result.issues?.includes('blurry_text') || readability.severity === 'red') && (
          <div className="mt-2.5 pt-2 border-t border-rose-900/60 flex items-center justify-between text-[11px] text-rose-300">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Use <strong>Clear / Sharpen</strong> in preview to de-blur text</span>
            </span>
          </div>
        )}
      </div>

      {/* Card 4: Cropping */}
      <div className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all ${getCardBorderClasses(cropping.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <Crop className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cropping
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClasses(cropping.severity)}`}>
            {cropping.label}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-2">{cropping.desc}</p>
      </div>

      {/* Card 5: Background Clutter */}
      <div className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl backdrop-blur-md transition-all ${getCardBorderClasses(clutter.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
              <LayoutGrid className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Background
            </span>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClasses(clutter.severity)}`}>
            {clutter.label}
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-2">{clutter.desc}</p>
      </div>

      {/* Card 6: Document Category & Verification Status */}
      <div className="bg-gradient-to-br from-violet-950/80 via-indigo-950/50 to-slate-900 rounded-2xl p-4 border border-violet-500/40 shadow-xl flex flex-col justify-between backdrop-blur-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-300">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-200">
              Category
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-teal-300 border border-violet-500/40">
            {result.document_category || (result.is_document ? 'General Document' : 'Non-Document')}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Pipeline Status</span>
          <span className="font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
            {result.analysis_status.toUpperCase()}
          </span>
        </div>
      </div>

    </div>
  );
};
