import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  RefreshCw,
  Sliders,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wifi,
  Globe,
  User,
  MapPin,
  Calendar,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { AppSettings, ScanRecord } from '../types';
import { playScanSound, triggerHaptic } from '../utils/audio';

interface CameraScannerProps {
  onScanSuccess: (content: string, source?: ScanRecord['source'], format?: string) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanSuccess,
  settings,
  updateSettings,
  isPaused,
  setIsPaused,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastScannedContentRef = useRef<string>('');

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(settings.preferredFacingMode);
  const [isTorchSupported, setIsTorchSupported] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number; current: number } | null>(null);
  const [activeZoom, setActiveZoom] = useState<number>(1);
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState<boolean>(false);
  const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);

  // Check BarcodeDetector API support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setIsBarcodeDetectorSupported(true);
    }
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.stop();
      });
      streamRef.current = null;
    }
    setIsTorchOn(false);
    setIsTorchSupported(false);
    setZoomCapabilities(null);
  }, []);

  // Initialize camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setHasPermission(true);

      // Check capabilities (Torch & Zoom)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;

        if (capabilities.torch) {
          setIsTorchSupported(true);
        }

        if (capabilities.zoom) {
          setZoomCapabilities({
            min: capabilities.zoom.min || 1,
            max: capabilities.zoom.max || 5,
            step: capabilities.zoom.step || 0.1,
            current: capabilities.zoom.min || 1,
          });
          setActiveZoom(capabilities.zoom.min || 1);
        }
      }

      // Enumerate devices
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = allDevices
          .filter((d) => d.kind === 'videoinput')
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${idx + 1} (${facingMode === 'environment' ? 'Rear' : 'Front'})`,
          }));
        setDevices(videoDevs);
      } catch {
        // Enumerate fallback
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions in your browser or test with sample QR codes below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device detected on this system. You can scan image files or use the quick test samples below.');
      } else {
        setErrorMessage(err.message || 'Unable to start camera stream.');
      }
    }
  }, [facingMode, selectedDeviceId, stopCamera]);

  // Handle Torch Toggle
  const toggleTorch = async () => {
    if (!streamRef.current || !isTorchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (err) {
      console.error('Torch toggle failed', err);
    }
  };

  // Handle Zoom change
  const handleZoomChange = async (newZoom: number) => {
    setActiveZoom(newZoom);
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      await (track as any).applyConstraints({
        advanced: [{ zoom: newZoom }],
      });
    } catch (err) {
      console.error('Zoom update failed', err);
    }
  };

  // Flip Camera
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedDeviceId(''); // clear exact device id to switch facing
    updateSettings({ preferredFacingMode: nextMode });
  };

  // Scan Processing Loop
  useEffect(() => {
    if (!hasPermission || isPaused) return;

    let lastScanProcessTime = 0;
    const scanInterval = 1000 / 18; // ~18 FPS scan rate for silky responsiveness and low CPU

    let barcodeDetectorInstance: any = null;
    if (isBarcodeDetectorSupported && typeof (window as any).BarcodeDetector === 'function') {
      try {
        barcodeDetectorInstance = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'data_matrix', 'aztec'],
        });
      } catch {
        barcodeDetectorInstance = null;
      }
    }

    const processFrame = async (time: number) => {
      if (time - lastScanProcessTime > scanInterval) {
        lastScanProcessTime = time;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const width = video.videoWidth;
          const height = video.videoHeight;

          if (width > 0 && height > 0) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);

              let detectedContent: string | null = null;
              let detectedFormat = 'QR_CODE';

              // 1. Try BarcodeDetector first if available
              if (barcodeDetectorInstance) {
                try {
                  const barcodes = await barcodeDetectorInstance.detect(canvas);
                  if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                    detectedContent = barcodes[0].rawValue;
                    detectedFormat = barcodes[0].format || 'BARCODE';
                  }
                } catch {
                  // Fallback to jsQR
                }
              }

              // 2. jsQR engine
              if (!detectedContent) {
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'attemptBoth',
                });
                if (code && code.data) {
                  detectedContent = code.data;
                  detectedFormat = 'QR_CODE';
                }
              }

              // On valid detection
              if (detectedContent && detectedContent.trim().length > 0) {
                const now = Date.now();
                const isDuplicate =
                  detectedContent === lastScannedContentRef.current &&
                  now - lastScanTimestampRef.current < settings.duplicateTimeoutMs;

                if (!isDuplicate) {
                  lastScanTimestampRef.current = now;
                  lastScannedContentRef.current = detectedContent;

                  // Feedback
                  if (settings.soundEnabled) {
                    playScanSound(settings.soundTone, settings.soundVolume);
                  }
                  if (settings.vibrateEnabled) {
                    triggerHaptic(settings.vibrateDuration);
                  }

                  setLastScannedFeedback(detectedContent.slice(0, 32));
                  setTimeout(() => setLastScannedFeedback(null), 1800);

                  onScanSuccess(detectedContent, 'camera', detectedFormat);
                }
              }
            }
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [hasPermission, isPaused, isBarcodeDetectorSupported, onScanSuccess, settings]);

  // Mount camera
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Demo QR Triggers
  const triggerDemo = (content: string) => {
    if (settings.soundEnabled) {
      playScanSound(settings.soundTone, settings.soundVolume);
    }
    if (settings.vibrateEnabled) {
      triggerHaptic(settings.vibrateDuration);
    }
    onScanSuccess(content, 'demo', 'QR_CODE');
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Viewfinder Card */}
      <div className="relative w-full max-w-xl aspect-[4/3] sm:aspect-[16/11] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
        {/* Hidden processing canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            hasPermission ? 'opacity-100' : 'opacity-0'
          }`}
          muted
          playsInline
        />

        {/* Error / Permission Block */}
        {hasPermission === false && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 text-white">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <CameraOff className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-1">Camera Stream Inactive</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
              {errorMessage || 'Camera access is required for live scanning. Check browser permissions or click any sample code below.'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                id="camera-retry-btn"
                onClick={startCamera}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera Access
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {hasPermission === null && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 bg-slate-950">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium tracking-wide">Starting optical camera...</p>
          </div>
        )}

        {/* Viewfinder Overlays & Reticle (When Active) */}
        {hasPermission && (
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-between p-4">
            {/* Top Bar Status */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white text-[11px] font-medium">
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                <span>{isPaused ? 'Scanner Paused' : 'Live High-FPS Optical Scan'}</span>
              </div>

              {/* Sound indicator */}
              <button
                type="button"
                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                className="pointer-events-auto p-2 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title={settings.soundEnabled ? 'Sound is ON' : 'Sound is Muted'}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
            </div>

            {/* Target Reticle & Laser */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border border-white/20 rounded-3xl flex items-center justify-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl" />

              {/* Center Crosshair / Plus */}
              <div className="w-4 h-4 relative opacity-40">
                <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-white -translate-y-1/2" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-white -translate-x-1/2" />
              </div>

              {/* Animated Laser Scan Line */}
              {settings.showLaser && !isPaused && (
                <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-scan-laser pointer-events-none" />
              )}

              {/* Paused Dimmer */}
              {isPaused && (
                <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center text-white">
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700">
                    Paused
                  </span>
                </div>
              )}
            </div>

            {/* Detection Success Toast */}
            {lastScannedFeedback ? (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/40 animate-bounce">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Detected: {lastScannedFeedback}...</span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-300 font-medium tracking-wide drop-shadow-md bg-slate-950/40 px-3 py-1 rounded-full backdrop-blur-xs">
                Align QR Code or Barcode in frame
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Viewfinder Camera Controls */}
      <div className="w-full max-w-xl mt-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {/* Torch Toggle (only if supported) */}
          {isTorchSupported && (
            <button
              id="torch-toggle-btn"
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isTorchOn
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isTorchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              <span>{isTorchOn ? 'Flash On' : 'Flash'}</span>
            </button>
          )}

          {/* Camera Flip */}
          <button
            id="camera-flip-btn"
            onClick={toggleCameraFacing}
            title="Switch front / rear camera"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flip Camera</span>
          </button>

          {/* Pause / Resume */}
          <button
            id="scanner-pause-btn"
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-500" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span>Pause</span>
              </>
            )}
          </button>
        </div>

        {/* Device selector (if multiple cameras exist) */}
        {devices.length > 1 && (
          <select
            id="camera-device-select"
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
            }}
            className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px] truncate"
          >
            <option value="">Default Camera</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Zoom Control Slider (if camera hardware supports it) */}
      {zoomCapabilities && (
        <div className="w-full max-w-xl mt-3 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3">
          <Sliders className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Zoom</span>
          <input
            type="range"
            min={zoomCapabilities.min}
            max={zoomCapabilities.max}
            step={zoomCapabilities.step}
            value={activeZoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 w-10 text-right">
            {activeZoom.toFixed(1)}x
          </span>
        </div>
      )}

      {/* 1-Click Test & Demo Samples (Allows instant testing with 0 hardware needed) */}
      <div className="w-full max-w-xl mt-6 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Quick Test Samples
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Click to simulate instant scan
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => triggerDemo('WIFI:T:WPA;S:BlueBottle_HQ;P:Roast2026Master;H:false;;')}
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Wi-Fi Pass</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">WPA2 Config</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemo('https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API')}
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Globe className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Web URL</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">MDN Specs</div>
            </div>
          </button>

          <button
            onClick={() =>
              triggerDemo(
                'BEGIN:VCARD\nVERSION:3.0\nFN:Marcus Sterling\nTITLE:Chief Technology Officer\nORG:Nova Dynamics\nTEL:+1 (212) 555-0199\nEMAIL:marcus@novadynamics.com\nURL:https://novadynamics.com\nEND:VCARD'
              )
            }
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">vCard Contact</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Marcus Sterling</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemo('geo:40.7580,-73.9855?q=Times+Square+New+York')}
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Geo Location</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Times Square</div>
            </div>
          </button>

          <button
            onClick={() =>
              triggerDemo(
                'BEGIN:VEVENT\nSUMMARY:Global Tech Keynote 2026\nLOCATION:Moscone Center, SF\nDTSTART:20261015T090000Z\nDTEND:20261015T170000Z\nDESCRIPTION:Annual breakthrough presentation\nEND:VEVENT'
              )
            }
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Calendar Event</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">iCal Format</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemo('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.025&label=Genesis')}
            className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-left transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Crypto Wallet</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Bitcoin URI</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
