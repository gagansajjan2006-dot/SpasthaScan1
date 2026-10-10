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
        icon: <XCircle className="w-5 h-5 text-rose-600" />,
        desc: 'Image lacks textual document structure',
      };
    }
    if (result.document_type === 'uncertain') {
      return {
        severity: 'amber',
        label: 'Uncertain Type',
        icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
        desc: 'Unclear if physical photo or scan',
      };
    }
    if (result.document_type === 'scan') {
      return {
        severity: 'green',
        label: 'Digital Scan',
        icon: <Printer className="w-5 h-5 text-emerald-600" />,
        desc: 'Flatbed or digitized scan document',
      };
    }
    return {
      severity: 'green',
      label: 'Document Photo',
      icon: <Camera className="w-5 h-5 text-emerald-600" />,
      desc: 'Physical photograph of a document',
    };
  };

  // Determine severity for Card 2: Orientation / Rotation
  const getOrientationStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    if (result.rotation_clockwise === null) {
      return {
        severity: 'amber',
        label: 'Uncertain',
        icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
        desc: 'Orientation confidence is low',
      };
    }
    if (result.rotation_clockwise === 0) {
      return {
        severity: 'green',
        label: 'Upright (0°)',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        desc: 'No rotation required',
      };
    }
    return {
      severity: 'red',
      label: `Rotate ${result.rotation_clockwise}° CW`,
      icon: <RotateCw className="w-5 h-5 text-rose-600" />,
      desc: `Needs ${result.rotation_clockwise}° clockwise rotation`,
    };
  };

  // Determine severity for Card 3: Readability
  const getReadabilityStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string; percent: number | null } => {
    if (result.main_text_readable === null || result.readability_confidence === null) {
      return {
        severity: 'amber',
        label: 'Uncertain',
        icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
        desc: 'Text presence cannot be confirmed reliably',
        percent: null,
      };
    }
    const pct = Math.round(result.readability_confidence * 100);
    if (result.main_text_readable === true) {
      return {
        severity: pct >= 80 ? 'green' : 'amber',
        label: 'Readable',
        icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
        desc: 'Main text is legible and sharp',
        percent: pct,
      };
    }
    return {
      severity: 'red',
      label: 'Unreadable',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
      desc: 'Text is blurry, faint, or low-contrast',
      percent: pct,
    };
  };

  // Determine severity for Card 4: Cropping
  const getCroppingStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    if (result.is_cropped === null) {
      return {
        severity: 'amber',
        label: 'Uncertain',
        icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
        desc: 'Edge boundaries could not be verified',
      };
    }
    if (result.is_cropped === false) {
      return {
        severity: 'green',
        label: 'Complete Edges',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        desc: 'No text or borders cut off',
      };
    }
    return {
      severity: 'red',
      label: 'Cropped / Cut Off',
      icon: <Crop className="w-5 h-5 text-rose-600" />,
      desc: result.cropping_details?.affected_regions?.length
        ? `Edge clipped at: ${result.cropping_details.affected_regions.join(', ')}`
        : 'Document edge intersects image frame',
    };
  };

  // Determine severity for Card 5: Background Clutter
  const getClutterStatus = (): { severity: SeverityLevel; label: string; icon: React.ReactNode; desc: string } => {
    if (result.background_clutter === 'uncertain') {
      return {
        severity: 'amber',
        label: 'Uncertain',
        icon: <HelpCircle className="w-5 h-5 text-amber-600" />,
        desc: 'Background texture could not be isolated',
      };
    }
    if (result.background_clutter === 'none' || result.background_clutter === 'low') {
      return {
        severity: 'green',
        label: result.background_clutter === 'none' ? 'Clean (None)' : 'Low Clutter',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
        desc: 'Clean, neutral surface with minimal distractions',
      };
    }
    if (result.background_clutter === 'medium') {
      return {
        severity: 'amber',
        label: 'Medium Clutter',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
        desc: 'Some visible patterns or nearby objects',
      };
    }
    return {
      severity: 'red',
      label: 'High Clutter',
      icon: <LayoutGrid className="w-5 h-5 text-rose-600" />,
      desc: 'Multiple distracting objects or busy textures',
    };
  };

  const docType = getDocTypeStatus();
  const orientation = getOrientationStatus();
  const readability = getReadabilityStatus();
  const cropping = getCroppingStatus();
  const clutter = getClutterStatus();

  const getBadgeClasses = (severity: SeverityLevel) => {
    switch (severity) {
      case 'green':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'red':
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getCardBorderClasses = (severity: SeverityLevel) => {
    switch (severity) {
      case 'green':
        return 'border-emerald-100/80 hover:border-emerald-200';
      case 'amber':
        return 'border-amber-100/80 hover:border-amber-200';
      case 'red':
        return 'border-rose-100/80 hover:border-rose-200';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      
      {/* Card 1: Document Type */}
      <div className={`bg-white rounded-xl p-4 border shadow-xs transition-all ${getCardBorderClasses(docType.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Document Type
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(docType.severity)}`}>
            {docType.label}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-2">{docType.desc}</p>
      </div>

      {/* Card 2: Orientation */}
      <div className={`bg-white rounded-xl p-4 border shadow-xs transition-all ${getCardBorderClasses(orientation.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <RotateCw className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Orientation
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(orientation.severity)}`}>
            {orientation.label}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-2">{orientation.desc}</p>
      </div>

      {/* Card 3: Readability & Confidence */}
      <div className={`bg-white rounded-xl p-4 border shadow-xs transition-all ${getCardBorderClasses(readability.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Readability
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(readability.severity)}`}>
            {readability.label}
          </span>
        </div>
        
        {/* Confidence Percentage Bar */}
        {readability.percent !== null ? (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium text-[11px]">Assessment Confidence</span>
              <span className="font-semibold text-slate-800 font-mono">{readability.percent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  readability.severity === 'green'
                    ? 'bg-emerald-500'
                    : readability.severity === 'amber'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${readability.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-600 mt-2">{readability.desc}</p>
        )}

        {/* If blurry, hint that enhanced mode can show text clearly */}
        {(result.issues?.includes('blurry_text') || readability.severity === 'red') && (
          <div className="mt-2.5 pt-2 border-t border-rose-100/80 flex items-center justify-between text-[11px] text-rose-700">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Use <strong>Clear / Sharpen</strong> in preview to de-blur text</span>
            </span>
          </div>
        )}
      </div>

      {/* Card 4: Cropping */}
      <div className={`bg-white rounded-xl p-4 border shadow-xs transition-all ${getCardBorderClasses(cropping.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Crop className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cropping
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(cropping.severity)}`}>
            {cropping.label}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-2">{cropping.desc}</p>
      </div>

      {/* Card 5: Background Clutter */}
      <div className={`bg-white rounded-xl p-4 border shadow-xs transition-all ${getCardBorderClasses(clutter.severity)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Background
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(clutter.severity)}`}>
            {clutter.label}
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-2">{clutter.desc}</p>
      </div>

      {/* Card 6: Document Category & Verification Status */}
      <div className="bg-gradient-to-br from-indigo-50/70 to-violet-50/70 rounded-xl p-4 border border-indigo-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-950">
              Category
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 shadow-2xs">
            {result.document_category || (result.is_document ? 'General Document' : 'Non-Document')}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Pipeline Status</span>
          <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            {result.analysis_status.toUpperCase()}
          </span>
        </div>
      </div>

    </div>
  );
};
