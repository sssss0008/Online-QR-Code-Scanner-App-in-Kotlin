export type QRContentType =
  | 'url'
  | 'wifi'
  | 'contact'
  | 'email'
  | 'phone'
  | 'sms'
  | 'geo'
  | 'calendar'
  | 'crypto'
  | 'text';

export interface WifiData {
  ssid: string;
  password?: string;
  securityType: 'WPA' | 'WEP' | 'nopass' | 'WPA2' | 'WPA3' | 'WPA/WPA2';
  hidden?: boolean;
}

export interface ContactData {
  name?: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
  url?: string;
  address?: string;
  notes?: string;
}

export interface EmailData {
  to: string;
  subject?: string;
  body?: string;
  cc?: string;
}

export interface SmsData {
  phone: string;
  message?: string;
}

export interface GeoData {
  latitude: number;
  longitude: number;
  altitude?: number;
  label?: string;
}

export interface CalendarData {
  title: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
}

export interface CryptoData {
  currency: 'bitcoin' | 'ethereum' | 'solana' | 'other';
  address: string;
  amount?: string;
  label?: string;
  message?: string;
}

export interface UrlSecurityAnalysis {
  isSafe: boolean;
  score: number; // 0 to 100
  isHttps: boolean;
  domain: string;
  protocol: string;
  hasSuspiciousTld: boolean;
  isIpAddress: boolean;
  flags: string[];
}

export interface ParsedQRData {
  type: QRContentType;
  raw: string;
  title: string;
  subtitle?: string;
  wifi?: WifiData;
  contact?: ContactData;
  email?: EmailData;
  sms?: SmsData;
  geo?: GeoData;
  calendar?: CalendarData;
  crypto?: CryptoData;
  urlAnalysis?: UrlSecurityAnalysis;
}

export interface ScanRecord {
  id: string;
  content: string;
  parsed: ParsedQRData;
  timestamp: number;
  isFavorite: boolean;
  tags: string[];
  notes: string;
  source: 'camera' | 'image' | 'clipboard' | 'batch' | 'demo';
  format?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  soundTone: 'chime' | 'beep' | 'radar' | 'soft';
  soundVolume: number; // 0.1 to 1.0
  vibrateEnabled: boolean;
  vibrateDuration: number; // ms
  autoCopy: boolean;
  autoOpenUrl: boolean;
  duplicateTimeoutMs: number; // e.g. 2500ms
  preferredCameraId?: string;
  preferredFacingMode: 'environment' | 'user';
  showLaser: boolean;
  saveHistory: boolean;
}

export interface GeneratorConfig {
  type: QRContentType;
  content: string;
  url: string;
  text: string;
  wifi: WifiData;
  contact: ContactData;
  email: EmailData;
  sms: SmsData;
  phone: string;
  geo: { lat: string; lng: string; label: string };
  calendar: {
    title: string;
    description: string;
    location: string;
    start: string;
    end: string;
  };
  crypto: {
    currency: 'bitcoin' | 'ethereum' | 'solana' | 'other';
    address: string;
    amount: string;
  };
  // Visual styling
  fgColor: string;
  bgColor: string;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  size: number;
  centerIcon: 'none' | 'scan' | 'wifi' | 'link' | 'user' | 'star' | 'shield';
}

export type ActiveTab = 'scanner' | 'upload' | 'generator' | 'batch' | 'history' | 'stats';
