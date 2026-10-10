import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Scan, 
  SwitchCamera
} from 'lucide-react';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera when modal opens or facingMode changes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPreview(null);
      setCapturedBlob(null);
      setError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
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
        // Stop stream once photo is taken
        stopCamera();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">
                {capturedPreview ? 'Confirm Document Photo' : 'Scan Document with Camera'}
              </h3>
              <p className="text-xs text-slate-400">
                {capturedPreview
                  ? 'Verify document clarity before analyzing'
                  : 'Align your document inside the viewfinder frame'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
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

                    {/* Center guidance text */}
                    <div className="self-center bg-slate-900/80 text-slate-200 text-xs px-3 py-1 rounded-full backdrop-blur-xs border border-slate-700 flex items-center gap-1.5">
                      <Scan className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Position document flat & centered</span>
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
