import React from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Vibrate,
  Camera,
  Copy,
  ExternalLink,
  Trash2,
  Download,
  Upload,
  Keyboard,
  Sliders,
  ScanLine,
  Play,
  Check,
} from 'lucide-react';
import { AppSettings, ScanRecord } from '../types';
import { playScanSound, triggerHaptic } from '../utils/audio';
import { exportHistoryToJSON } from '../utils/exporter';

interface SettingsModalProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  onClose: () => void;
  records: ScanRecord[];
  onClearAll: () => void;
  onImportBackup: (imported: ScanRecord[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  updateSettings,
  onClose,
  records,
  onClearAll,
  onImportBackup,
}) => {
  const handleTestSound = () => {
    playScanSound(settings.soundTone, settings.soundVolume);
    if (settings.vibrateEnabled) {
      triggerHaptic(settings.vibrateDuration);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportBackup(parsed);
          }
        } catch {
          alert('Invalid backup JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div
        id="settings-modal-card"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Scanner Preferences & Tools
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Custom feedback, hardware controls, and data backup
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

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Section 1: Audio & Haptic Feedback */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
              Audio & Haptic Feedback
            </h4>

            {/* Sound Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                {settings.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Scan Confirmation Sound
                  </div>
                  <div className="text-[11px] text-slate-500">Zero-latency Web Audio chime</div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            {settings.soundEnabled && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80 space-y-3">
                {/* Tone selector */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Sound Tone</span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'chime', label: 'Chime' },
                      { id: 'beep', label: 'POS Beep' },
                      { id: 'radar', label: 'Cyber' },
                      { id: 'soft', label: 'Soft' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => updateSettings({ soundTone: tone.id as any })}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                          settings.soundTone === tone.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {tone.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider & Test */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Volume</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800/80"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test</span>
                  </button>
                </div>
              </div>
            )}

            {/* Haptic Vibrate */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Vibrate className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Haptic Vibration
                  </div>
                  <div className="text-[11px] text-slate-500">Tactile pulse on phone hardware</div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.vibrateEnabled}
                onChange={(e) => updateSettings({ vibrateEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 2: Automated Scanner Actions */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
              Scanner Behaviors
            </h4>

            {/* Auto Copy */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Copy className="w-4 h-4 text-indigo-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Auto-Copy to Clipboard
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Instantly copy scanned string into clipboard
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.autoCopy}
                onChange={(e) => updateSettings({ autoCopy: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Show Laser */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <ScanLine className="w-4 h-4 text-cyan-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Animated Laser Guide
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Show pulsing laser beam in camera viewfinder
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={settings.showLaser}
                onChange={(e) => updateSettings({ showLaser: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Preferred Camera Facing */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-teal-500" />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Default Camera
                  </div>
                  <div className="text-[11px] text-slate-500">Primary lens on launch</div>
                </div>
              </div>

              <select
                value={settings.preferredFacingMode}
                onChange={(e) => updateSettings({ preferredFacingMode: e.target.value as any })}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="environment">Back / Rear Lens</option>
                <option value="user">Front / Selfie Lens</option>
              </select>
            </div>
          </div>

          {/* Section 3: Data Backup & Reset */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-[11px]">
              Data Backup & Storage
            </h4>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {records.length} Scanned Records
                </div>
                <div className="text-[11px] text-slate-500">Stored safely in browser localStorage</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportHistoryToJSON(records)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup JSON</span>
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restore</span>
                  <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete all history scans? This action cannot be undone.')) {
                  onClearAll();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Entire Scan History Database</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
