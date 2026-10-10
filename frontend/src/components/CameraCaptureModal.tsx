import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Scan, 
  SwitchCamera,
  Volume2,
  VolumeX,
  Languages
} from 'lucide-react';
import { 
  coachSpeaker, 
  type CoachLanguage 
} from '../services/coachSpeaker';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // Task E6: Spoken Camera Coach States
  const [coachMessage, setCoachMessage] = useState<string>('Position document flat & centered');
  const [isMuted, setIsMuted] = useState<boolean>(() => coachSpeaker.isMuted());
  const [uiLanguage, setUiLanguage] = useState<CoachLanguage>(() => coachSpeaker.getLanguage());
  const [isSpeakingAnimation, setIsSpeakingAnimation] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);

  // Initialize camera when modal opens or facingMode changes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPreview(null);
      setCapturedBlob(null);
      setError(null);
      coachSpeaker.cancel();
      coachSpeaker.reset();
      setCoachMessage('Position document flat & centered');
      prevFrameDataRef.current = null;
      return;
    }

    startCamera();

    return () => {
      stopCamera();
      coachSpeaker.cancel();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setIsInitializing(true);
    setError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera permissions in your browser settings to scan documents.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No active camera found on this device. Please connect a webcam or upload an existing image file.');
      } else {
        setError(err.message || 'Unable to access camera feed.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // Task E6: Speak coachMessage whenever state changes (obeying 2s gap & no repeats)
  useEffect(() => {
    if (!isOpen || capturedPreview) return;

    const spoke = coachSpeaker.speak(coachMessage, uiLanguage);
    if (spoke) {
      setIsSpeakingAnimation(true);
      const timer = setTimeout(() => setIsSpeakingAnimation(false), 1600);
      return () => clearTimeout(timer);
    }
  }, [coachMessage, isOpen, capturedPreview, uiLanguage]);

  // Task E6: Real-time Frame Analysis for Live Camera Coaching Guidance
  useEffect(() => {
    if (!isOpen || capturedPreview || !stream || error) return;

    if (!sampleCanvasRef.current) {
      sampleCanvasRef.current = document.createElement('canvas');
      sampleCanvasRef.current.width = 160;
      sampleCanvasRef.current.height = 120;
    }

    const sampleCanvas = sampleCanvasRef.current;
    const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let timerId: any = null;

    const analyzeFrame = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        ctx.drawImage(video, 0, 0, 160, 120);
        const frame = ctx.getImageData(0, 0, 160, 120);
        const data = frame.data;
        const totalPixels = 160 * 120;

        let totalLum = 0;
        let overexposedPixels = 0;
        let motionDiff = 0;
        const prev = prevFrameDataRef.current;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          if (lum > 240) overexposedPixels++;

          if (prev) {
            const prevLum = 0.299 * prev[i] + 0.587 * prev[i + 1] + 0.114 * prev[i + 2];
            motionDiff += Math.abs(lum - prevLum);
          }
        }

        const avgLum = totalLum / totalPixels;
        const glareRatio = overexposedPixels / totalPixels;
        const avgMotion = prev ? motionDiff / totalPixels : 0;

        // Store current frame for next difference check
        if (!prevFrameDataRef.current) {
          prevFrameDataRef.current = new Uint8ClampedArray(data.length);
        }
        prevFrameDataRef.current.set(data);

        // Simple Laplacian / edge variance in center window for focus check
        let lapEnergy = 0;
        const step = 4;
        for (let y = 30; y < 90; y += step) {
          for (let x = 40; x < 120; x += step) {
            const idx = (y * 160 + x) * 4;
            const rightIdx = (y * 160 + (x + 1)) * 4;
            const bottomIdx = ((y + 1) * 160 + x) * 4;
            const diffX = Math.abs(data[idx] - data[rightIdx]);
            const diffY = Math.abs(data[idx] - data[bottomIdx]);
            lapEnergy += diffX + diffY;
          }
        }
        const edgeDensity = lapEnergy / (15 * 20);

        // State decision
        let nextMessage = 'Position document flat & centered';
        if (avgLum < 45) {
          nextMessage = 'Move to a well-lit area';
        } else if (glareRatio > 0.15) {
          nextMessage = 'Avoid bright light or glare on the document';
        } else if (avgMotion > 20) {
          nextMessage = 'Hold the phone steady or use both hands';
        } else if (edgeDensity < 7) {
          nextMessage = 'Tap the text to focus and move slightly farther back';
        } else {
          nextMessage = 'Hold steady to capture';
        }

        setCoachMessage(nextMessage);
      } catch {
        // Fallback silently if canvas read fails
      }
    };

    // Run frame analysis periodically (every 600ms)
    timerId = setInterval(analyzeFrame, 600);

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isOpen, capturedPreview, stream, error]);

  const handleToggleMute = useCallback(() => {
    const newMuted = coachSpeaker.toggleMute();
    setIsMuted(newMuted);
  }, []);

  const handleLanguageChange = useCallback((lang: CoachLanguage) => {
    coachSpeaker.setLanguage(lang);
    setUiLanguage(lang);
    // Speak current cue in the newly selected language if not muted
    coachSpeaker.reset();
    coachSpeaker.speak(coachMessage, lang);
  }, [coachMessage]);

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match actual camera resolution
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to Blob & Preview
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setCapturedPreview(previewUrl);
        // Stop stream & speaker once photo is taken
        stopCamera();
        coachSpeaker.cancel();
      },
      'image/jpeg',
      0.95
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
    setCoachMessage('Position document flat & centered');
    prevFrameDataRef.current = null;
    startCamera();
  };

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `document_camera_${timestamp}.jpg`;
    const file = new File([capturedBlob], filename, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  // Localized coach message display
  const displayCoachMessage = coachSpeaker.translateMessage(coachMessage, uiLanguage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        
        {/* Header with Camera Title, Mute Toggle, and Language Selector */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
                <span>{capturedPreview ? 'Confirm Document Photo' : 'Scan Document with Camera'}</span>
                {!capturedPreview && isSpeakingAnimation && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    Speaking
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {capturedPreview
                  ? 'Verify document clarity before analyzing'
                  : 'Align your document inside the viewfinder frame'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Task E6: Mute Toggle Button */}
            <button
              type="button"
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute voice coach' : 'Mute voice coach'}
              aria-label={isMuted ? 'Unmute spoken guidance' : 'Mute spoken guidance'}
              aria-pressed={isMuted}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium ${
                isMuted
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Voice Coach'}</span>
            </button>

            {/* Task E6: UI Language Selector */}
            <div className="relative flex items-center">
              <label htmlFor="camera-ui-lang" className="sr-only">UI Language for voice guidance</label>
              <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
                <Languages className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <select
                  id="camera-ui-lang"
                  value={uiLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as CoachLanguage)}
                  className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
                >
                  <option value="en-IN" className="bg-slate-900 text-white">English (en-IN)</option>
                  <option value="hi-IN" className="bg-slate-900 text-white">हिन्दी (hi-IN)</option>
                  <option value="kn-IN" className="bg-slate-900 text-white">ಕನ್ನಡ (kn-IN)</option>
                </select>
              </div>
            </div>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close camera modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Video Stream Container */}
        <div className="relative flex-1 bg-black min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          
          {/* Hidden Snapshot Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Captured Preview Mode */}
          {capturedPreview ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={capturedPreview}
                alt="Captured document"
                className="max-h-[380px] max-w-full object-contain rounded-xl shadow-lg border border-slate-700"
              />
              <span className="absolute top-6 left-6 px-3 py-1 rounded-full bg-emerald-600/90 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                <Check className="w-3.5 h-3.5" />
                Snapshot Ready
              </span>
            </div>
          ) : (
            /* Live Camera Stream */
            <>
              {error ? (
                <div className="p-8 text-center max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-rose-300 mb-1">Camera Unavailable</h4>
                  <p className="text-xs text-slate-400 mb-4">{error}</p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Camera
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain max-h-[440px]"
                  />

                  {/* Document Viewfinder Framing Box with Corner Markers */}
                  <div className="absolute inset-8 sm:inset-12 pointer-events-none border-2 border-indigo-400/40 rounded-2xl flex flex-col justify-between p-2">
                    {/* Top corners */}
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                      <div className="w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                    </div>

                    {/* Task E6: Live Coach Visual Guidance Banner with Accessibility Attributes */}
                    <div 
                      role="status" 
                      aria-live="polite"
                      className="self-center bg-slate-950/85 text-slate-100 text-xs px-4 py-2 rounded-full backdrop-blur-md border border-slate-700/80 flex items-center gap-2.5 shadow-xl max-w-[90%] text-center transition-all duration-300 pointer-events-auto"
                    >
                      <div className="flex items-center gap-1.5">
                        <Scan className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        {!isMuted && (
                          <Volume2 className={`w-3.5 h-3.5 ${isSpeakingAnimation ? 'text-emerald-400 animate-pulse' : 'text-slate-400'} shrink-0`} />
                        )}
                      </div>
                      <span className="font-medium tracking-wide">
                        {displayCoachMessage}
                      </span>
                    </div>

                    {/* Bottom corners */}
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                      <div className="w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Switch Camera */}
          {!capturedPreview && !error && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <SwitchCamera className="w-4 h-4" />
              <span className="hidden sm:inline">Flip Camera</span>
            </button>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {capturedPreview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPhoto}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-900/40 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Document</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCapturePhoto}
                  disabled={isInitializing || !!error}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-900/40 transition-all flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
