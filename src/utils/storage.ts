import { AppSettings, ScanRecord } from '../types';
import { parseQRContent } from './parser';

const STORAGE_KEYS = {
  HISTORY: 'qrmaster_history_v1',
  SETTINGS: 'qrmaster_settings_v1',
  THEME: 'qrmaster_theme_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  soundEnabled: true,
  soundTone: 'chime',
  soundVolume: 0.6,
  vibrateEnabled: true,
  vibrateDuration: 45,
  autoCopy: false,
  autoOpenUrl: false,
  duplicateTimeoutMs: 2500,
  preferredFacingMode: 'environment',
  showLaser: true,
  saveHistory: true,
};

const SAMPLE_INITIAL_RECORDS: ScanRecord[] = [
  {
    id: 'sample-1',
    content: 'https://ai.google.dev',
    parsed: parseQRContent('https://ai.google.dev'),
    timestamp: Date.now() - 1000 * 60 * 12,
    isFavorite: true,
    tags: ['Tech', 'Official'],
    notes: 'Google AI developer portal and API resources',
    source: 'demo',
  },
  {
    id: 'sample-2',
    content: 'WIFI:T:WPA;S:Skyline_Cafe_Guest;P:Espresso2026!;H:false;;',
    parsed: parseQRContent('WIFI:T:WPA;S:Skyline_Cafe_Guest;P:Espresso2026!;H:false;;'),
    timestamp: Date.now() - 1000 * 60 * 45,
    isFavorite: true,
    tags: ['Wi-Fi', 'Cafe'],
    notes: 'Free coffee shop high speed network',
    source: 'demo',
  },
  {
    id: 'sample-3',
    content: 'BEGIN:VCARD\nVERSION:3.0\nFN:Elena Rostova\nTITLE:Lead Product Architect\nORG:Apex Systems\nTEL:+1 (415) 890-2134\nEMAIL:elena.rostova@apexsys.io\nURL:https://apexsys.io\nEND:VCARD',
    parsed: parseQRContent('BEGIN:VCARD\nVERSION:3.0\nFN:Elena Rostova\nTITLE:Lead Product Architect\nORG:Apex Systems\nTEL:+1 (415) 890-2134\nEMAIL:elena.rostova@apexsys.io\nURL:https://apexsys.io\nEND:VCARD'),
    timestamp: Date.now() - 1000 * 60 * 180,
    isFavorite: false,
    tags: ['Networking', 'Conference'],
    notes: 'Met at Design & AI Summit',
    source: 'demo',
  },
  {
    id: 'sample-4',
    content: 'geo:37.7749,-122.4194?q=San+Francisco+Civic+Center',
    parsed: parseQRContent('geo:37.7749,-122.4194?q=San+Francisco+Civic+Center'),
    timestamp: Date.now() - 1000 * 60 * 360,
    isFavorite: false,
    tags: ['Travel'],
    notes: 'Conference keynote venue',
    source: 'demo',
  },
];

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function loadHistory(): ScanRecord[] {
  if (typeof window === 'undefined') return SAMPLE_INITIAL_RECORDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) {
      // First visit: save sample records
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(SAMPLE_INITIAL_RECORDS));
      return SAMPLE_INITIAL_RECORDS;
    }
    const parsed = JSON.parse(raw) as ScanRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return SAMPLE_INITIAL_RECORDS;
  }
}

export function saveHistory(records: ScanRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save history to localStorage', err);
  }
}

export function addScanRecord(
  content: string,
  source: ScanRecord['source'] = 'camera',
  format: string = 'QR_CODE'
): { record: ScanRecord; isNew: boolean } {
  const records = loadHistory();
  const parsed = parseQRContent(content);

  // Check if identical scan exists in last 4 seconds to avoid flood in live mode
  const now = Date.now();
  const recentMatch = records.find(
    (r) => r.content === content && now - r.timestamp < 3000
  );
  if (recentMatch) {
    return { record: recentMatch, isNew: false };
  }

  const newRecord: ScanRecord = {
    id: `scan-${now}-${Math.random().toString(36).substring(2, 7)}`,
    content,
    parsed,
    timestamp: now,
    isFavorite: false,
    tags: [parsed.type.toUpperCase()],
    notes: '',
    source,
    format,
  };

  const updated = [newRecord, ...records];
  saveHistory(updated);
  return { record: newRecord, isNew: true };
}

export function toggleRecordFavorite(id: string): ScanRecord[] {
  const records = loadHistory();
  const updated = records.map((rec) =>
    rec.id === id ? { ...rec, isFavorite: !rec.isFavorite } : rec
  );
  saveHistory(updated);
  return updated;
}

export function updateRecordDetails(
  id: string,
  updates: { notes?: string; tags?: string[]; isFavorite?: boolean }
): ScanRecord[] {
  const records = loadHistory();
  const updated = records.map((rec) =>
    rec.id === id ? { ...rec, ...updates } : rec
  );
  saveHistory(updated);
  return updated;
}

export function deleteScanRecord(id: string): ScanRecord[] {
  const records = loadHistory();
  const updated = records.filter((rec) => rec.id !== id);
  saveHistory(updated);
  return updated;
}

export function clearAllHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
}
