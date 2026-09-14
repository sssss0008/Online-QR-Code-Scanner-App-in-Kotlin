import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Layers,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Play,
  Pause,
  Filter,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AppSettings, ScanRecord } from '../types';
import { playScanSound, triggerHaptic } from '../utils/audio';
import { exportHistoryToCSV, exportHistoryToJSON, copyToClipboard } from '../utils/exporter';
import { parseQRContent } from '../utils/parser';

interface BatchScannerProps {
  settings: AppSettings;
  onRecordAdded: (record: ScanRecord) => void;
}

export const BatchScanner: React.FC<BatchScannerProps> = ({ settings, onRecordAdded }) => {
  const [batchItems, setBatchItems] = useState<ScanRecord[]>([]);
  const [isScanning, setIsScanning] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [selectedFormatFilter, setSelectedFormatFilter] = useState<string>('all');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastContentRef = useRef<string>('');

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: settings.preferredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch {
      // camera unavailable
    }
  }, [settings.preferredFacingMode, stopCamera]);

  useEffect(() => {
    if (isScanning) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isScanning, startCamera, stopCamera]);

  // Frame processing
  useEffect(() => {
    if (!isScanning) return;

    let lastTime = 0;
    const interval = 1000 / 18;

    const loop = (time: number) => {
      if (time - lastTime > interval) {
        lastTime = time;
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (w > 0 && h > 0) {
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              const imageData = ctx.getImageData(0, 0, w, h);
              const code = jsQR(imageData.data, w, h);

              if (code && code.data && code.data.trim()) {
                const now = Date.now();
                const content = code.data.trim();

                const isRecentDup =
                  skipDuplicates &&
                  (content === lastContentRef.current && now - lastScanTimestampRef.current < 3000);

                if (!isRecentDup) {
                  lastScanTimestampRef.current = now;
                  lastContentRef.current = content;

                  if (settings.soundEnabled) {
                    playScanSound('beep', settings.soundVolume);
                  }
                  if (settings.vibrateEnabled) {
                    triggerHaptic(settings.vibrateDuration);
                  }

                  const parsed = parseQRContent(content);
                  const newRec: ScanRecord = {
                    id: `batch-${now}-${Math.random().toString(36).substr(2, 5)}`,
                    content,
                    parsed,
                    timestamp: now,
                    isFavorite: false,
                    tags: ['Batch', parsed.type.toUpperCase()],
                    notes: `Batch scan item #${batchItems.length + 1}`,
                    source: 'batch',
                  };

                  setBatchItems((prev) => [newRec, ...prev]);
                  onRecordAdded(newRec);
                }
              }
            }
          }
        }
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isScanning, skipDuplicates, settings, onRecordAdded, batchItems.length]);

  const addManualItem = (text: string) => {
    const now = Date.now();
    const parsed = parseQRContent(text);
    const newRec: ScanRecord = {
      id: `batch-${now}-${Math.random().toString(36).substr(2, 5)}`,
      content: text,
      parsed,
      timestamp: now,
      isFavorite: false,
      tags: ['Batch', parsed.type.toUpperCase()],
      notes: `Batch test item`,
      source: 'batch',
    };
    if (settings.soundEnabled) {
      playScanSound('beep', settings.soundVolume);
    }
    setBatchItems((prev) => [newRec, ...prev]);
    onRecordAdded(newRec);
  };

  const handleCopyAll = async () => {
    const text = batchItems.map((b) => b.content).join('\n');
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedBatch(true);
      setTimeout(() => setCopiedBatch(false), 2000);
    }
  };

  const filteredItems = selectedFormatFilter === 'all'
    ? batchItems
    : batchItems.filter((i) => i.parsed.type === selectedFormatFilter);

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Mini Scanner & Batch Controls */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Continuous Viewfinder */}
        <div className="relative aspect-[4/3] rounded-2xl bg-slate-950 overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
          <canvas ref={canvasRef} className="hidden" />
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-3.5">
            <div className="w-full flex items-center justify-between">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-900/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Batch Fast-Scan Active
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                Count: {batchItems.length}
              </span>
            </div>

            {/* Target Box */}
            <div className="w-44 h-44 border-2 border-dashed border-indigo-400/80 rounded-2xl relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            </div>

            <div className="text-[11px] text-slate-300 font-medium drop-shadow bg-slate-950/60 px-3 py-1 rounded-full backdrop-blur-xs">
              Continuous Auto-Capture Enabled
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsScanning(!isScanning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isScanning
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {isScanning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isScanning ? 'Pause Auto-Capture' : 'Resume Capture'}</span>
            </button>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <span>Skip Duplicates (3s)</span>
            </label>
          </div>

          {/* Quick Simulation Buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Instant Simulate Barcode / QR:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => addManualItem(`ITEM-SKU-${Math.floor(100000 + Math.random() * 900000)}`)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium transition-colors"
              >
                + SKU Barcode
              </button>
              <button
                onClick={() => addManualItem(`https://company.org/badge/${Math.floor(1000 + Math.random() * 9000)}`)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                + Event Badge
              </button>
              <button
                onClick={() => addManualItem(`PARCEL-TRACK-EXP-${Date.now().toString().slice(-6)}`)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium transition-colors"
              >
                + Shipping Label
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Batch Log & Export Hub */}
      <div className="lg:col-span-7 flex flex-col">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Batch Session Queue
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {batchItems.length} records in current batch session
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyAll}
                disabled={batchItems.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold disabled:opacity-40 transition-colors"
              >
                {copiedBatch ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBatch ? 'Copied' : 'Copy All'}</span>
              </button>

              <button
                onClick={() => exportHistoryToCSV(batchItems)}
                disabled={batchItems.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setBatchItems([])}
                disabled={batchItems.length === 0}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold disabled:opacity-40 transition-colors"
                title="Clear current batch session"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 min-h-[340px] max-h-[480px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 my-2">
            {batchItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Layers className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Ready for High-Speed Batch Scanning
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Point the camera at badges, tags, or inventory items continuously. Results will queue up here without interruptions.
                </p>
              </div>
            ) : (
              batchItems.map((item, index) => (
                <div
                  key={item.id}
                  className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {batchItems.length - index}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.parsed.title}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-md">
                        {item.content}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <button
                      onClick={() => copyToClipboard(item.content)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Copy item text"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
