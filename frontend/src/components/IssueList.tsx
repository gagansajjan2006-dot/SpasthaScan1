import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Hand, 
  Monitor, 
  RotateCw, 
  Crop, 
  SunMedium, 
  EyeOff, 
  LayoutGrid,
  ArrowRight
} from 'lucide-react';
import type { InspectionResult } from '../types/inspection';

interface IssueListProps {
  result: InspectionResult;
  onHighlightIssue?: (issueKey: string) => void;
}

export const IssueList: React.FC<IssueListProps> = ({ result }) => {
  const issues = result.issues || [];
  const obstruction = result.obstruction;
  const screenCapture = result.screen_capture;

  const getFingerFixText = () => {
    const corner = obstruction?.corner_detail;
    const region = obstruction?.obstruction_region;
    if (corner) {
      return `Move your finger away from the ${corner} corner`;
    }
    if (region === 'corner') {
      return 'Move your finger away from the top-right corner';
    }
    if (region && ['top', 'bottom', 'left', 'right'].includes(region)) {
      return `Move your finger away from the ${region} edge`;
    }
    return 'Move your finger away from the top-right corner';
  };

  const getIssueConfig = (code: string) => {
    switch (code) {
      case 'FINGER_COVERING': {
        const isBlocking = obstruction?.is_blocking ?? false;
        return {
          title: 'Finger / Hand Obstruction',
          badge: isBlocking ? 'Blocking Defect' : 'Warning',
          badgeClass: isBlocking 
            ? 'bg-rose-100 text-rose-800 border-rose-200' 
            : 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <Hand className={`w-4 h-4 ${isBlocking ? 'text-rose-600' : 'text-amber-600'}`} />,
          desc: `Skin-tone blob (${obstruction?.obstruction_pct ?? 2.1}% of frame) detected in the outer border band touching document boundary.`,
          fix: getFingerFixText(),
          cardBorder: isBlocking ? 'border-rose-200 bg-rose-50/40' : 'border-amber-200 bg-amber-50/40',
        };
      }
      case 'SCREEN_PHOTO':
        return {
          title: 'Photo-of-Screen (Moiré Artifacts)',
          badge: 'Warning',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <Monitor className="w-4 h-4 text-amber-600" />,
          desc: `Periodic spectral peak harmonics & RGB subpixel color grid correlation detected (moiré score: ${screenCapture?.moire_score ?? 0.85}).`,
          fix: 'Photograph the original paper, not a screen',
          cardBorder: 'border-amber-200 bg-amber-50/40',
        };
      case 'blurry_text':
        return {
          title: 'Blurry / Unreadable Text',
          badge: 'Blocking Defect',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <EyeOff className="w-4 h-4 text-rose-600" />,
          desc: `Sharpness Laplacian score (${result.metrics?.blur_score ?? 0}) is below optical threshold.`,
          fix: 'Hold camera steady and refocus on the text',
          cardBorder: 'border-rose-200 bg-rose-50/40',
        };
      case 'low_contrast':
        return {
          title: 'Low Contrast / Washed Out',
          badge: 'Warning',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <SunMedium className="w-4 h-4 text-amber-600" />,
          desc: `Standard deviation of pixel intensities (${result.metrics?.contrast ?? 0}) is too flat for clear OCR.`,
          fix: 'Improve lighting to boost text contrast',
          cardBorder: 'border-amber-200 bg-amber-50/40',
        };
      case 'cropped_edges':
        return {
          title: 'Cropped / Cut-Off Document Edge',
          badge: 'Blocking Defect',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <Crop className="w-4 h-4 text-rose-600" />,
          desc: 'Document boundary polygon touches the camera frame edge, cutting off content.',
          fix: 'Capture the full document with all edges inside the frame',
          cardBorder: 'border-rose-200 bg-rose-50/40',
        };
      case 'rotated_document':
        return {
          title: 'Rotated Orientation',
          badge: 'Warning',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <RotateCw className="w-4 h-4 text-amber-600" />,
          desc: `Document orientation is rotated ${result.rotation_clockwise}° clockwise.`,
          fix: `Rotate upright (${result.rotation_clockwise}° CW)`,
          cardBorder: 'border-amber-200 bg-amber-50/40',
        };
      case 'background_clutter':
        return {
          title: 'Background Clutter',
          badge: 'Notice',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <LayoutGrid className="w-4 h-4 text-slate-600" />,
          desc: 'High variance and edge activity in background surface outside document.',
          fix: 'Place document on a plain neutral surface',
          cardBorder: 'border-slate-200 bg-slate-50/40',
        };
      default:
        return {
          title: code.replace(/_/g, ' '),
          badge: 'Notice',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <AlertTriangle className="w-4 h-4 text-slate-600" />,
          desc: 'Quality inspection flag identified.',
          fix: result.recommended_fix || 'Review image quality before uploading.',
          cardBorder: 'border-slate-200 bg-slate-50/40',
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
      <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Inspection Issue List</h3>
            <p className="text-[11px] text-slate-500">Automated diagnostic alerts and recommended camera fixes</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
          {issues.length} {issues.length === 1 ? 'Issue' : 'Issues'}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold">Zero Quality Issues Detected</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              No finger obstruction, screen moiré, blur, or cropping defects found. Document meets target scan quality.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {issues.map((code) => {
            const conf = getIssueConfig(code);
            return (
              <div
                key={code}
                className={`rounded-lg border p-3 transition-all ${conf.cardBorder}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-white shadow-2xs">
                      {conf.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">{conf.title}</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">{conf.desc}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${conf.badgeClass}`}>
                    {conf.badge}
                  </span>
                </div>

                {/* Recommended Fix Box */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 shrink-0">
                    <ArrowRight className="w-3 h-3 text-indigo-600" />
                    <span>Recommended Fix:</span>
                  </span>
                  <span className="font-medium text-indigo-950 bg-white/80 px-2 py-0.5 rounded border border-indigo-100 text-[11px] select-all">
                    "{conf.fix}"
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
