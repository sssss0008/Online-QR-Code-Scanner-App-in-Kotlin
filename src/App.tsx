/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ActiveTab,
  AppSettings,
  QRContentType,
  ScanRecord,
} from './types';
import {
  addScanRecord,
  clearAllHistory,
  deleteScanRecord,
  loadHistory,
  loadSettings,
  saveHistory,
  saveSettings,
  toggleRecordFavorite,
  updateRecordDetails,
} from './utils/storage';
import { copyToClipboard } from './utils/exporter';
import { Header } from './components/Header';
import { CameraScanner } from './components/CameraScanner';
import { ImageScanner } from './components/ImageScanner';
import { BatchScanner } from './components/BatchScanner';
import { QRGenerator } from './components/QRGenerator';
import { HistoryList } from './components/HistoryList';
import { StatsDashboard } from './components/StatsDashboard';
import { ScanResultModal } from './components/ScanResultModal';
import { SettingsModal } from './components/SettingsModal';
import { ShortcutsModal } from './components/ShortcutsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('qrmaster_theme_pref');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [records, setRecords] = useState<ScanRecord[]>(loadHistory);
  const [inspectRecord, setInspectRecord] = useState<ScanRecord | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isScannerPaused, setIsScannerPaused] = useState(false);

  // Generator prefill data when triggered from inspect modal or history
  const [generatorPrefill, setGeneratorPrefill] = useState<{
    content: string;
    type: QRContentType;
  }>({
    content: 'https://ai.google.dev',
    type: 'url',
  });

  // Apply dark mode class to HTML root element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('qrmaster_theme_pref', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('qrmaster_theme_pref', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      saveSettings(updated);
      return updated;
    });
  };

  // Main scan success handler (from camera, image drop, demo)
  const handleScanSuccess = useCallback(
    (content: string, source: ScanRecord['source'] = 'camera', format = 'QR_CODE') => {
      const { record, isNew } = addScanRecord(content, source, format);

      // Trigger Confetti celebratory particles on new scan!
      if (isNew) {
        try {
          confetti({
            particleCount: 35,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#10b981', '#3b82f6', '#f59e0b'],
          });
        } catch {
          // ignore confetti if unsupported
        }
      }

      // Auto-copy if configured
      if (settings.autoCopy) {
        copyToClipboard(content);
      }

      // Update in-memory records
      setRecords(loadHistory());

      // Open detail inspect modal if not in batch mode
      if (activeTab !== 'batch') {
        setInspectRecord(record);
      }
    },
    [activeTab, settings.autoCopy]
  );

  // History operations
  const handleToggleFavorite = (id: string) => {
    const updated = toggleRecordFavorite(id);
    setRecords(updated);
    if (inspectRecord && inspectRecord.id === id) {
      setInspectRecord({ ...inspectRecord, isFavorite: !inspectRecord.isFavorite });
    }
  };

  const handleUpdateRecord = (
    id: string,
    updates: { notes?: string; tags?: string[] }
  ) => {
    const updated = updateRecordDetails(id, updates);
    setRecords(updated);
    if (inspectRecord && inspectRecord.id === id) {
      setInspectRecord({ ...inspectRecord, ...updates });
    }
  };

  const handleDeleteRecord = (id: string) => {
    const updated = deleteScanRecord(id);
    setRecords(updated);
    if (inspectRecord && inspectRecord.id === id) {
      setInspectRecord(null);
    }
  };

  const handleClearAll = () => {
    clearAllHistory();
    setRecords([]);
    setInspectRecord(null);
  };

  const handleImportBackup = (imported: ScanRecord[]) => {
    saveHistory(imported);
    setRecords(imported);
    alert(`Successfully imported ${imported.length} scan records.`);
  };

  const handleOpenInGenerator = (content: string, type: QRContentType) => {
    setGeneratorPrefill({ content, type });
    setInspectRecord(null);
    setActiveTab('generator');
  };

  // Keyboard Shortcuts (Space to pause, 1-6 for tabs, T for theme, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Escape') {
        setInspectRecord(null);
        setIsSettingsOpen(false);
        setIsShortcutsOpen(false);
      } else if (e.key === ' ' && activeTab === 'scanner' && !inspectRecord && !isSettingsOpen) {
        e.preventDefault();
        setIsScannerPaused((p) => !p);
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === '1') setActiveTab('scanner');
      else if (e.key === '2') setActiveTab('upload');
      else if (e.key === '3') setActiveTab('batch');
      else if (e.key === '4') setActiveTab('generator');
      else if (e.key === '5') setActiveTab('history');
      else if (e.key === '6') setActiveTab('stats');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, inspectRecord, isSettingsOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        toggleTheme={toggleTheme}
        historyCount={records.length}
        openSettings={() => setIsSettingsOpen(true)}
        openShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main App Content View */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab 1: Live Optical Camera Scanner */}
        {activeTab === 'scanner' && (
          <div className="flex flex-col items-center">
            <CameraScanner
              onScanSuccess={handleScanSuccess}
              settings={settings}
              updateSettings={handleUpdateSettings}
              isPaused={isScannerPaused}
              setIsPaused={setIsScannerPaused}
            />
          </div>
        )}

        {/* Tab 2: Image File & Clipboard Drag-and-Drop Scanner */}
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center">
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Scan from Image or Screenshot
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                Drop your barcode or QR image below, or press Ctrl+V to paste from your clipboard.
              </p>
            </div>
            <ImageScanner onScanSuccess={handleScanSuccess} settings={settings} />
          </div>
        )}

        {/* Tab 3: Continuous Batch Scanner Mode */}
        {activeTab === 'batch' && (
          <div>
            <div className="mb-6 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Continuous Batch Scanner
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                High-speed auto-capture queue for inventory, ticketing, logistics, and bulk badges.
              </p>
            </div>
            <BatchScanner
              settings={settings}
              onRecordAdded={() => setRecords(loadHistory())}
            />
          </div>
        )}

        {/* Tab 4: QR Code & Barcode Studio Generator */}
        {activeTab === 'generator' && (
          <div>
            <div className="mb-6 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                QR Code Studio & Generator
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Create customizable, high-resolution QR codes for websites, Wi-Fi passwords, vCards, events, and print sheets.
              </p>
            </div>
            <QRGenerator
              initialContent={generatorPrefill.content}
              initialType={generatorPrefill.type}
            />
          </div>
        )}

        {/* Tab 5: Scan History & Data Hub */}
        {activeTab === 'history' && (
          <div>
            <div className="mb-6 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Scan History & Vault
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Search, favorite, tag, export to CSV/JSON, and inspect all previous scans.
              </p>
            </div>
            <HistoryList
              records={records}
              onSelectRecord={(rec) => setInspectRecord(rec)}
              onToggleFavorite={handleToggleFavorite}
              onDeleteRecord={handleDeleteRecord}
              onClearAll={handleClearAll}
              onImportBackup={handleImportBackup}
            />
          </div>
        )}

        {/* Tab 6: Analytics & Insights Dashboard */}
        {activeTab === 'stats' && (
          <div>
            <div className="mb-6 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Analytics & Scan Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Visual insights into format distributions, security verification ratios, and scan origins.
              </p>
            </div>
            <StatsDashboard records={records} />
          </div>
        )}
      </main>

      {/* Inspect / Scan Result Modal */}
      {inspectRecord && (
        <ScanResultModal
          record={inspectRecord}
          onClose={() => setInspectRecord(null)}
          onToggleFavorite={handleToggleFavorite}
          onUpdateRecord={handleUpdateRecord}
          onOpenInGenerator={handleOpenInGenerator}
        />
      )}

      {/* Preferences & Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          updateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
          records={records}
          onClearAll={handleClearAll}
          onImportBackup={handleImportBackup}
        />
      )}

      {/* Keyboard Shortcuts & Help Modal */}
      {isShortcutsOpen && <ShortcutsModal onClose={() => setIsShortcutsOpen(false)} />}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-6 px-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              QR Master Pro
            </span>
            <span>•</span>
            <span>Client-side optical computer vision</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Shortcuts & Privacy
            </button>
            <span>•</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Audio & Haptic Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
