import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  Layers, 
  Sparkles, 
  FileText, 
  Eye, 
  SplitSquareVertical
} from 'lucide-react';
import { enhanceDocumentImage } from '../services/api';

interface ImagePreviewProps {
  imageSrc: string;
  filename: string;
  dimensions: { width: number; height: number } | null;
  documentBoundary?: [number, number][] | null; // Normalized percentages [[x, y], ...]
  suggestedRotation?: number | null;
  isBlurry?: boolean;
  rawFile?: File | null;
}

type ViewMode = 'original' | 'enhanced' | 'scan' | 'compare';

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageSrc,
  filename,
  dimensions,
  documentBoundary,
  suggestedRotation,
  isBlurry = false,
  rawFile = null,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [showBoundary, setShowBoundary] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(isBlurry ? 'compare' : 'original');
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [sliderPos, setSliderPos] = useState<number>(50); // Split slider 0 - 100%
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // If blur is detected, automatically recommend compare or enhanced mode
  useEffect(() => {
    if (isBlurry) {
      setViewMode('compare');
    }
  }, [isBlurry]);

  // Generate enhanced and scan versions using backend or client-side canvas
  useEffect(() => {
    let isCancelled = false;
    let createdBlobUrls: string[] = [];

    const generateEnhancedImages = async () => {
      setIsEnhancing(true);

      // 1. Try server-side OpenCV enhancement if raw file is available
      if (rawFile) {
        try {
          const [clarityUrl, binarizedUrl] = await Promise.all([
            enhanceDocumentImage(rawFile, 'clarity'),
            enhanceDocumentImage(rawFile, 'bw_scan'),
          ]);
          if (!isCancelled) {
            createdBlobUrls.push(clarityUrl, binarizedUrl);
            setEnhancedUrl(clarityUrl);
            setScanUrl(binarizedUrl);
            setIsEnhancing(false);
            return;
          }
        } catch (err) {
          console.debug('Server enhance failed, falling back to Canvas processing:', err);
        }
      }

      // 2. Client-side Canvas fallback (0ms network latency, works on any imageSrc)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (isCancelled) return;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Draw base
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const w = canvas.width;
          const h = canvas.height;
          const orig = new Uint8ClampedArray(data);

          // Fast Laplacian high-frequency sharpening for text de-blur
          const factor = 1.5;
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              for (let c = 0; c < 3; c++) {
                const top = orig[((y - 1) * w + x) * 4 + c];
                const btm = orig[((y + 1) * w + x) * 4 + c];
                const lft = orig[(y * w + (x - 1)) * 4 + c];
                const rgt = orig[(y * w + (x + 1)) * 4 + c];
                const center = orig[idx + c];
                const sharp = center * (1 + 4 * factor) - (top + btm + lft + rgt) * factor;
                // High contrast stretch to make text legible
                const contrastVal = (sharp - 128) * 1.35 + 128;
                data[idx + c] = Math.max(0, Math.min(255, contrastVal));
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
          const clarityDataUrl = canvas.toDataURL('image/jpeg', 0.92);

          // Generate clean B&W scan version
          for (let i = 0; i < data.length; i += 4) {
            const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            const val = gray > 140 ? 255 : 0;
            data[i] = val;
            data[i + 1] = val;
            data[i + 2] = val;
          }
          ctx.putImageData(imgData, 0, 0);
          const scanDataUrl = canvas.toDataURL('image/jpeg', 0.92);

          setEnhancedUrl(clarityDataUrl);
          setScanUrl(scanDataUrl);
        } catch (e) {
          console.debug('Canvas enhance error', e);
        } finally {
          setIsEnhancing(false);
        }
      };
      img.src = imageSrc;
    };

    generateEnhancedImages();

    return () => {
      isCancelled = true;
      createdBlobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imageSrc, rawFile]);

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setRotationDegrees(0);
  };

  const handleManualRotate = () => {
    setRotationDegrees((deg) => (deg + 90) % 360);
  };

  // Drag handler for Split Slider
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(Math.round(pct));
  };

  const handleMouseDown = () => setIsDraggingSlider(true);
  const handleTouchStart = () => setIsDraggingSlider(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingSlider(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) {
        handleSliderMove(e.clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    if (isDraggingSlider) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDraggingSlider]);

  // Determine current active display image
  const displaySrc = viewMode === 'enhanced' && enhancedUrl
    ? enhancedUrl
    : viewMode === 'scan' && scanUrl
    ? scanUrl
    : imageSrc;

  // Convert normalized boundary points to SVG polygon points
  const polygonPointsStr = documentBoundary && documentBoundary.length >= 3
    ? documentBoundary.map((pt) => `${pt[0]},${pt[1]}`).join(' ')
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-full">
      {/* Top Controls Bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Left: Metadata info */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[180px]" title={filename}>
            {filename}
          </span>
          {dimensions && (
            <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600 font-mono text-[11px] hidden sm:inline">
              {dimensions.width} × {dimensions.height} px
            </span>
          )}
        </div>

        {/* Right: Interactive Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Document Boundary Overlay Toggle */}
          {documentBoundary && (
            <button
              type="button"
              onClick={() => setShowBoundary(!showBoundary)}
              title={showBoundary ? 'Hide Document Boundary' : 'Show Document Boundary'}
              className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 font-medium ${
                showBoundary
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Boundary</span>
            </button>
          )}

          {/* Quick manual rotate preview */}
          <button
            type="button"
            onClick={handleManualRotate}
            title="Rotate preview 90° clockwise"
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Zoom Out"
              className="p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-600 select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title="Zoom In"
              className="p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reset / Fit to screen */}
          <button
            type="button"
            onClick={handleResetZoom}
            title="Fit to Screen"
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clarity / Deblur Mode Selector Bar */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider mr-1">
            Clarity Mode:
          </span>
          
          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              viewMode === 'original'
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-200 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Original</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('enhanced')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              viewMode === 'enhanced'
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'text-indigo-700 hover:bg-indigo-100/70'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Clear / Sharpen</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
              viewMode === 'compare'
                ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                : 'text-emerald-700 hover:bg-emerald-100/70'
            }`}
          >
            <SplitSquareVertical className="w-3 h-3" />
            <span>Split Compare</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('scan')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 hidden sm:flex ${
              viewMode === 'scan'
                ? 'bg-slate-800 text-white shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>B&W Scan</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isEnhancing && (
            <span className="text-[11px] text-indigo-600 animate-pulse flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Sharpening...</span>
            </span>
          )}
          {viewMode === 'compare' && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <span>Original</span>
              <span className="font-semibold text-indigo-600">|</span>
              <span>Clear ({100 - sliderPos}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Blurry Notice Banner */}
      {isBlurry && viewMode === 'original' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Image text appears blurry. <strong>Enhanced Clarity</strong> mode can sharpen degraded letters.</span>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('enhanced')}
            className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-2xs shrink-0"
          >
            Show Clearly
          </button>
        </div>
      )}

      {/* Main Image Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[380px] max-h-[620px] bg-slate-900/5 p-4 overflow-auto flex items-center justify-center select-none"
      >
        <div
          className="relative transition-transform duration-200 ease-out origin-center inline-block shadow-lg rounded-lg overflow-hidden"
          style={{
            transform: `scale(${zoom}) rotate(${rotationDegrees}deg)`,
          }}
        >
          {/* Compare Mode with Interactive Split Slider */}
          {viewMode === 'compare' ? (
            <div 
              ref={sliderRef}
              className="relative select-none max-h-[540px] max-w-full overflow-hidden cursor-ew-resize"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Bottom Layer: Enhanced / Clear Image */}
              <img
                src={enhancedUrl || imageSrc}
                alt="Enhanced Clear Document"
                className="max-h-[540px] max-w-full object-contain block bg-white pointer-events-none"
              />

              {/* Top Layer: Original (Blurry) Image with clip-path */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{
                  clipPath: `polygon(0% 0%, ${sliderPos}% 0%, ${sliderPos}% 100%, 0% 100%)`,
                }}
              >
                <img
                  src={imageSrc}
                  alt="Original Document"
                  className="max-h-[540px] max-w-full object-contain block bg-white"
                />
              </div>

              {/* Draggable Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md z-10 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                {/* Center Handle Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold py-1 px-2 rounded-full shadow-lg border border-white flex items-center gap-1 select-none pointer-events-auto">
                  <span>◀</span>
                  <span>▶</span>
                </div>
              </div>

              {/* Overlay labels */}
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/70 text-white text-[10px] font-medium backdrop-blur-xs pointer-events-none">
                Original (Blurry)
              </span>
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-indigo-900/80 text-white text-[10px] font-medium backdrop-blur-xs pointer-events-none">
                Enhanced (Clear)
              </span>
            </div>
          ) : (
            /* Single Image Mode (Original, Enhanced, or Scan) */
            <div className="relative">
              <img
                src={displaySrc}
                alt={filename}
                className="max-h-[540px] max-w-full object-contain block bg-white"
              />

              {viewMode === 'enhanced' && (
                <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-indigo-900/80 text-white text-[11px] font-semibold backdrop-blur-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Enhanced Clear View</span>
                </span>
              )}

              {viewMode === 'scan' && (
                <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-slate-900/80 text-white text-[11px] font-semibold backdrop-blur-xs flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-300" />
                  <span>Clean B&W Scan View</span>
                </span>
              )}
            </div>
          )}

          {/* Document boundary polygon SVG overlay */}
          {showBoundary && polygonPointsStr && documentBoundary && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <polygon
                points={polygonPointsStr}
                fill="rgba(99, 102, 241, 0.18)"
                stroke="#4f46e5"
                strokeWidth="1.2"
                strokeDasharray="2,1"
              />
              {documentBoundary.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt[0]}
                  cy={pt[1]}
                  r="2"
                  fill="#4338ca"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Suggested Rotation helper banner if needed */}
      {suggestedRotation !== undefined && suggestedRotation !== null && suggestedRotation !== 0 && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200/80 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Inspection detected this document needs a <strong>{suggestedRotation}° clockwise</strong> rotation.</span>
          </div>
          <button
            type="button"
            onClick={() => setRotationDegrees(suggestedRotation)}
            className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-2xs"
          >
            Apply Rotation Preview
          </button>
        </div>
      )}
    </div>
  );
};
