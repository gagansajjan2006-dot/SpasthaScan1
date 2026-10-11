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
  ArrowRight,
  Vibrate,
  Focus
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
      case 'BLUR_MOTION':
        return {
          title: 'Motion Blur (Camera Shake)',
          badge: 'Blocking Defect',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          icon: <Vibrate className="w-4 h-4 text-rose-400" />,
          desc: `Directional motion blur detected${result.blur_analysis?.blur_direction_deg !== undefined ? ` along ~${result.blur_analysis.blur_direction_deg}° axis` : ''}. Hand shaking or phone movement during capture.`,
          fix: 'Hold the phone steady or use both hands',
          cardBorder: 'border-rose-500/40 bg-rose-950/20',
        };
      case 'BLUR_DEFOCUS':
        return {
          title: 'Defocus Blur (Out of Focus)',
          badge: 'Blocking Defect',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          icon: <Focus className="w-4 h-4 text-rose-400" />,
          desc: 'Isotropic optical defocus detected. The camera lens was not focused on the document surface.',
          fix: 'Tap the text to focus and move slightly farther back',
          cardBorder: 'border-rose-500/40 bg-rose-950/20',
        };
      case 'FINGER_COVERING': {
        const isBlocking = obstruction?.is_blocking ?? false;
        return {
          title: 'Finger / Hand Obstruction',
          badge: isBlocking ? 'Blocking Defect' : 'Warning',
          badgeClass: isBlocking 
            ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' 
            : 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          icon: <Hand className={`w-4 h-4 ${isBlocking ? 'text-rose-400' : 'text-amber-400'}`} />,
          desc: `Skin-tone blob (${obstruction?.obstruction_pct ?? 2.1}% of frame) detected in the outer border band touching document boundary.`,
          fix: getFingerFixText(),
          cardBorder: isBlocking ? 'border-rose-500/40 bg-rose-950/20' : 'border-amber-500/40 bg-amber-950/20',
        };
      }
      case 'SCREEN_PHOTO':
        return {
          title: 'Photo-of-Screen (Moiré Artifacts)',
          badge: 'Warning',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          icon: <Monitor className="w-4 h-4 text-amber-400" />,
          desc: `Periodic spectral peak harmonics & RGB subpixel color grid correlation detected (moiré score: ${screenCapture?.moire_score ?? 0.85}).`,
          fix: 'Photograph the original paper, not a screen',
          cardBorder: 'border-amber-500/40 bg-amber-950/20',
        };
      case 'blurry_text':
        return {
          title: 'Blurry / Unreadable Text',
          badge: 'Blocking Defect',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          icon: <EyeOff className="w-4 h-4 text-rose-400" />,
          desc: `Sharpness Laplacian score (${result.metrics?.blur_score ?? 0}) is below optical threshold.`,
          fix: 'Hold camera steady and refocus on the text',
          cardBorder: 'border-rose-500/40 bg-rose-950/20',
        };
      case 'low_contrast':
        return {
          title: 'Low Contrast / Faint Text',
          badge: 'Warning',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          icon: <SunMedium className="w-4 h-4 text-amber-400" />,
          desc: `RMS contrast score (${result.metrics?.contrast ?? 0}) indicates poor illumination separation.`,
          fix: 'Improve ambient lighting or avoid backlighting',
          cardBorder: 'border-amber-500/40 bg-amber-950/20',
        };
      case 'rotated_document':
        return {
          title: 'Sideways / Inverted Document',
          badge: 'Orientation Defect',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          icon: <RotateCw className="w-4 h-4 text-rose-400" />,
          desc: `Document is turned ${result.rotation_clockwise ?? 90}° clockwise. Text baselines are perpendicular to OCR reader.`,
          fix: `Rotate document ${result.rotation_clockwise ?? 90}° clockwise before submitting`,
          cardBorder: 'border-rose-500/40 bg-rose-950/20',
        };
      case 'cropped_edges':
        return {
          title: 'Cropped Borders / Cut Off Text',
          badge: 'Boundary Defect',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          icon: <Crop className="w-4 h-4 text-rose-400" />,
          desc: 'Document boundary polygon intersects camera frame edge. Text margins are truncated.',
          fix: 'Move camera back so all four document corners are visible',
          cardBorder: 'border-rose-500/40 bg-rose-950/20',
        };
      case 'background_clutter':
        return {
          title: 'Heavy Background Clutter',
          badge: 'Notice',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: <LayoutGrid className="w-4 h-4 text-amber-400" />,
          desc: 'High non-document surface texture detected around the paper margins.',
          fix: 'Place document on a clean, solid contrasting background surface',
          cardBorder: 'border-slate-700 bg-slate-900/60',
        };
      default:
        return {
          title: code.replace(/_/g, ' '),
          badge: 'Notice',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: <AlertTriangle className="w-4 h-4 text-slate-400" />,
          desc: 'Quality inspection flag identified.',
          fix: result.recommended_fix || 'Review image quality before uploading.',
          cardBorder: 'border-slate-800 bg-slate-950/60',
        };
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-teal-300">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Inspection Issue List</h3>
            <p className="text-[11px] text-slate-400">Automated diagnostic alerts and recommended camera fixes</p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-teal-300 font-semibold">
          {issues.length} {issues.length === 1 ? 'Issue' : 'Issues'}
        </span>
      </div>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3.5 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white">Zero Quality Issues Detected</p>
            <p className="text-[11px] text-emerald-300/80 mt-0.5">
              No finger obstruction, screen moiré, blur, or cropping defects found. Document meets target scan quality.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((code) => {
            const conf = getIssueConfig(code);
            return (
              <div
                key={code}
                className={`rounded-xl border p-3.5 transition-all shadow-md ${conf.cardBorder}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                      {conf.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{conf.title}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{conf.desc}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${conf.badgeClass}`}>
                    {conf.badge}
                  </span>
                </div>

                {/* Recommended Fix Box */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                    <ArrowRight className="w-3 h-3 text-teal-400" />
                    <span>Recommended Fix:</span>
                  </span>
                  <span className="font-semibold text-teal-300 bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800 text-[11px] select-all">
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
