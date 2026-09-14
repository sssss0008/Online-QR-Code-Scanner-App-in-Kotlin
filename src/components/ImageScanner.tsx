import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  UploadCloud,
  FileImage,
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, ScanRecord } from '../types';
import { playScanSound, triggerHaptic } from '../utils/audio';

interface ImageScannerProps {
  onScanSuccess: (content: string, source?: ScanRecord['source'], format?: string) => void;
  settings: AppSettings;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({ onScanSuccess, settings }) => {
  const [dragOver, setDragOver] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{
    text: string;
    format: string;
    points?: any;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Process image data URL or Blob
  const processImage = useCallback(
    (fileOrUrl: File | string) => {
      setIsProcessing(true);
      setErrorMessage(null);
      setDetectionResult(null);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = async () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          setIsProcessing(false);
          return;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Fit image nicely into canvas
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let detectedContent: string | null = null;
        let detectedFormat = 'QR_CODE';
        let detectedPoints: any = null;

        // 1. Check BarcodeDetector API
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'data_matrix', 'aztec'],
            });
            const barcodes = await detector.detect(canvas);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedContent = barcodes[0].rawValue;
              detectedFormat = barcodes[0].format || 'BARCODE';
              detectedPoints = barcodes[0].cornerPoints;
            }
          } catch {
            // fallback
          }
        }

        // 2. Fallback to jsQR
        if (!detectedContent) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            detectedContent = code.data;
            detectedFormat = 'QR_CODE';
            detectedPoints = code.location;
          }
        }

        setIsProcessing(false);

        if (detectedContent) {
          // Draw bounding box over canvas
          if (detectedPoints) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#10b981';
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';

            if (detectedPoints.topLeftCorner) {
              ctx.beginPath();
              ctx.moveTo(detectedPoints.topLeftCorner.x, detectedPoints.topLeftCorner.y);
              ctx.lineTo(detectedPoints.topRightCorner.x, detectedPoints.topRightCorner.y);
              ctx.lineTo(detectedPoints.bottomRightCorner.x, detectedPoints.bottomRightCorner.y);
              ctx.lineTo(detectedPoints.bottomLeftCorner.x, detectedPoints.bottomLeftCorner.y);
              ctx.closePath();
              ctx.stroke();
              ctx.fill();
            } else if (Array.isArray(detectedPoints) && detectedPoints.length >= 4) {
              ctx.beginPath();
              ctx.moveTo(detectedPoints[0].x, detectedPoints[0].y);
              ctx.lineTo(detectedPoints[1].x, detectedPoints[1].y);
              ctx.lineTo(detectedPoints[2].x, detectedPoints[2].y);
              ctx.lineTo(detectedPoints[3].x, detectedPoints[3].y);
              ctx.closePath();
              ctx.stroke();
              ctx.fill();
            }
          }

          setDetectionResult({
            text: detectedContent,
            format: detectedFormat,
            points: detectedPoints,
          });

          if (settings.soundEnabled) {
            playScanSound(settings.soundTone, settings.soundVolume);
          }
          if (settings.vibrateEnabled) {
            triggerHaptic(settings.vibrateDuration);
          }

          onScanSuccess(detectedContent, 'image', detectedFormat);
        } else {
          setErrorMessage('No valid QR code or barcode found in this image. Ensure the code is clear, well-lit, and not blurry.');
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        setErrorMessage('Failed to decode the image file. Please try another image.');
      };

      if (typeof fileOrUrl === 'string') {
        setImageSrc(fileOrUrl);
        img.src = fileOrUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setImageSrc(result);
          img.src = result;
        };
        reader.readAsDataURL(fileOrUrl);
      }
    },
    [onScanSuccess, settings]
  );

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        processImage(file);
      } else {
        setErrorMessage('Please drop an image file (PNG, JPG, WEBP, GIF, SVG).');
      }
    }
  };

  // Clipboard Paste Listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
              processImage(blob);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [processImage]);

  const handleClear = () => {
    setImageSrc(null);
    setDetectionResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="image-file-input"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processImage(e.target.files[0]);
          }
        }}
      />

      {/* Main Drag & Drop Zone */}
      {!imageSrc ? (
        <div
          id="image-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 hover:border-indigo-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            Drag and drop your QR code or Barcode image
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            Supports PNG, JPEG, WEBP, GIF, SVG. You can also paste directly using{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Ctrl+V
            </kbd>{' '}
            or{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Cmd+V
            </kbd>
          </p>

          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95 pointer-events-none"
          >
            <FileImage className="w-4 h-4" />
            <span>Browse Files</span>
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          {/* Canvas Display */}
          <div className="relative w-full max-h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-lg flex items-center justify-center p-2">
            <canvas ref={canvasRef} className="max-w-full max-h-[460px] object-contain rounded-xl" />

            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-semibold">Scanning image pixels...</span>
              </div>
            )}
          </div>

          {/* Action Bar Below Canvas */}
          <div className="w-full flex items-center justify-between mt-3 gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Choose Another Image</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Upload New File</span>
            </button>
          </div>
        </div>
      )}

      {/* Detection Result Card */}
      {detectionResult && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                QR Code Successfully Decoded
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                {detectionResult.format}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 my-1.5">
              {detectionResult.text}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Parsed details and rich actions are open in the inspect modal.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="w-full mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <div className="font-bold mb-0.5">Scan Unsuccessful</div>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Quick Paste Hint */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
        <ClipboardPaste className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <span>
          Tip: Take a screenshot of any QR on your screen, then press{' '}
          <strong className="text-slate-700 dark:text-slate-200 font-semibold">Ctrl+V / Cmd+V</strong> anywhere on this page to scan instantly!
        </span>
      </div>
    </div>
  );
};
