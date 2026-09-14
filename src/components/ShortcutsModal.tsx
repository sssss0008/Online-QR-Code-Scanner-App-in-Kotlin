import React from 'react';
import { X, Keyboard, Shield, Zap, CheckCircle2 } from 'lucide-react';

interface ShortcutsModalProps {
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose }) => {
  const shortcuts = [
    { key: 'Space', desc: 'Pause or resume live optical camera' },
    { key: 'Ctrl + V / ⌘V', desc: 'Paste image or screenshot from clipboard to scan' },
    { key: '1 - 6', desc: 'Quick switch tabs (Scanner, Image, Batch, Generator, History, Stats)' },
    { key: 'T', desc: 'Toggle Dark / Light theme' },
    { key: 'Esc', desc: 'Close any active modal or inspect dialog' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div
        id="shortcuts-modal-card"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Keyboard Shortcuts & Pro Tips
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speed up scanning and workflow
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs">
          {/* Shortcuts table */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
            {shortcuts.map((sc) => (
              <div key={sc.key} className="p-2.5 sm:p-3 flex items-center justify-between gap-3">
                <span className="text-slate-600 dark:text-slate-300 font-medium">{sc.desc}</span>
                <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] shadow-xs flex-shrink-0">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          {/* Feature Highlights */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-300">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">100% Client-Side Privacy:</strong>
                <span className="text-[11px] opacity-90">
                  Your video stream and scanned photos are processed entirely in memory in your browser. No data or camera frames are ever sent to remote servers.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-300">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Zero-Latency Web Audio:</strong>
                <span className="text-[11px] opacity-90">
                  All scanner sounds are synthesized mathematically on the fly with the Web Audio API for instantaneous feedback with zero network latency.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
