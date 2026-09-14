import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Globe,
  Wifi,
  User,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  MapPin,
  Calendar,
  Coins,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  Palette,
  Sliders,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { GeneratorConfig, QRContentType } from '../types';
import { copyToClipboard } from '../utils/exporter';

interface QRGeneratorProps {
  initialContent?: string;
  initialType?: QRContentType;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  initialContent = '',
  initialType = 'url',
}) => {
  const [activeType, setActiveType] = useState<QRContentType>(initialType);
  const [urlInput, setUrlInput] = useState(initialType === 'url' && initialContent ? initialContent : 'https://ai.google.dev');
  const [textInput, setTextInput] = useState(initialType === 'text' && initialContent ? initialContent : 'Hello from QR Master Pro!');
  const [wifiData, setWifiData] = useState({
    ssid: 'Office_Guest_5G',
    password: 'Welcome2026!',
    security: 'WPA' as 'WPA' | 'WEP' | 'nopass' | 'WPA3',
    hidden: false,
  });
  const [contactData, setContactData] = useState({
    name: 'Alexander Wright',
    phone: '+1 (555) 234-5678',
    email: 'alex.wright@nexus.io',
    organization: 'Nexus Technologies',
    title: 'Lead Architect',
    address: '500 Market St, San Francisco, CA',
  });
  const [emailData, setEmailData] = useState({
    to: 'hello@example.com',
    subject: 'Project Inquiry',
    body: 'Hello, I would like more information.',
  });
  const [phoneInput, setPhoneInput] = useState('+1 (555) 019-2834');
  const [smsData, setSmsData] = useState({
    phone: '+1 (555) 019-2834',
    message: 'Hey, sending you the details!',
  });
  const [geoData, setGeoData] = useState({
    lat: '37.7749',
    lng: '-122.4194',
    label: 'San Francisco Hub',
  });
  const [calendarData, setCalendarData] = useState({
    title: 'Annual Tech Summit',
    description: 'Breakthrough engineering conference',
    location: 'Moscone Center, SF',
    start: '2026-10-15T09:00',
    end: '2026-10-15T17:00',
  });
  const [cryptoData, setCryptoData] = useState({
    currency: 'bitcoin' as 'bitcoin' | 'ethereum' | 'solana',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    amount: '0.05',
  });

  // Visual Customization States
  const [fgColor, setFgColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [margin, setMargin] = useState(2);
  const [centerIcon, setCenterIcon] = useState<'none' | 'wifi' | 'globe' | 'star' | 'shield'>('none');
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute raw payload string based on type
  const getRawPayload = (): string => {
    switch (activeType) {
      case 'url':
        return urlInput.startsWith('http://') || urlInput.startsWith('https://')
          ? urlInput
          : `https://${urlInput}`;
      case 'text':
        return textInput;
      case 'wifi':
        return `WIFI:T:${wifiData.security};S:${wifiData.ssid};P:${wifiData.password};H:${wifiData.hidden ? 'true' : 'false'};;`;
      case 'contact':
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${contactData.name}\nORG:${contactData.organization}\nTITLE:${contactData.title}\nTEL:${contactData.phone}\nEMAIL:${contactData.email}\nADR:${contactData.address}\nEND:VCARD`;
      case 'email':
        return `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
      case 'phone':
        return `tel:${phoneInput.replace(/\s+/g, '')}`;
      case 'sms':
        return `sms:${smsData.phone}?body=${encodeURIComponent(smsData.message)}`;
      case 'geo':
        return `geo:${geoData.lat},${geoData.lng}?q=${encodeURIComponent(geoData.label)}`;
      case 'calendar': {
        const startStr = calendarData.start.replace(/[-:]/g, '') + '00Z';
        const endStr = calendarData.end.replace(/[-:]/g, '') + '00Z';
        return `BEGIN:VEVENT\nSUMMARY:${calendarData.title}\nLOCATION:${calendarData.location}\nDESCRIPTION:${calendarData.description}\nDTSTART:${startStr}\nDTEND:${endStr}\nEND:VEVENT`;
      }
      case 'crypto':
        return `${cryptoData.currency}:${cryptoData.address}${cryptoData.amount ? `?amount=${cryptoData.amount}` : ''}`;
      default:
        return textInput;
    }
  };

  // Render QR Code to Canvas with Logo overlay
  useEffect(() => {
    const raw = getRawPayload();
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(
      canvas,
      raw,
      {
        width: 480,
        margin: margin,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: errorCorrection,
      },
      (err) => {
        if (err) {
          console.error('QR rendering error', err);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw Center Icon if enabled
        const drawIcon = (iconText: string, iconColor: string) => {
          const size = canvas.width * 0.22;
          const x = (canvas.width - size) / 2;
          const y = (canvas.height - size) / 2;

          // Background white circle or rounded rect for icon
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, size * 0.65, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 4;
          ctx.strokeStyle = fgColor;
          ctx.stroke();

          // Icon emoji or text
          ctx.font = `bold ${size * 0.6}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = iconColor;
          ctx.fillText(iconText, canvas.width / 2, canvas.height / 2 + 2);
        };

        if (customLogoUrl) {
          const logoImg = new Image();
          logoImg.onload = () => {
            const size = canvas.width * 0.22;
            const x = (canvas.width - size) / 2;
            const y = (canvas.height - size) / 2;

            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, size * 0.65, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(logoImg, x, y, size, size);
            setQrDataUrl(canvas.toDataURL('image/png'));
          };
          logoImg.src = customLogoUrl;
          return;
        }

        if (centerIcon === 'wifi') drawIcon('📶', '#3b82f6');
        else if (centerIcon === 'globe') drawIcon('🌐', '#10b981');
        else if (centerIcon === 'star') drawIcon('⭐', '#f59e0b');
        else if (centerIcon === 'shield') drawIcon('🛡️', '#6366f1');

        setQrDataUrl(canvas.toDataURL('image/png'));
      }
    );
  }, [
    activeType,
    urlInput,
    textInput,
    wifiData,
    contactData,
    emailData,
    phoneInput,
    smsData,
    geoData,
    calendarData,
    cryptoData,
    fgColor,
    bgColor,
    errorCorrection,
    margin,
    centerIcon,
    customLogoUrl,
  ]);

  // Download High-Res PNG
  const downloadPNG = () => {
    const raw = getRawPayload();
    // Render high-res 1200px
    QRCode.toDataURL(
      raw,
      {
        width: 1200,
        margin: margin,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorCorrection,
      },
      (err, url) => {
        if (err || !url) return;
        const link = document.createElement('a');
        link.download = `qrcode_${activeType}_${Date.now()}.png`;
        link.href = url;
        link.click();
      }
    );
  };

  // Download SVG
  const downloadSVG = () => {
    const raw = getRawPayload();
    QRCode.toString(
      raw,
      {
        type: 'svg',
        margin: margin,
        color: { dark: fgColor, light: bgColor },
        errorCorrectionLevel: errorCorrection,
      },
      (err, svgString) => {
        if (err || !svgString) return;
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qrcode_${activeType}_${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    );
  };

  // Copy Image to Clipboard
  const copyImageToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        }
      });
    } catch {
      // Fallback
    }
  };

  // Palette presets
  const COLOR_PRESETS = [
    { name: 'Dark Slate', fg: '#0f172a', bg: '#ffffff' },
    { name: 'Indigo Pulse', fg: '#4338ca', bg: '#ffffff' },
    { name: 'Emerald Forest', fg: '#065f46', bg: '#f0fdf4' },
    { name: 'Ruby Bold', fg: '#991b1b', bg: '#fff1f2' },
    { name: 'Royal Purple', fg: '#581c87', bg: '#faf5ff' },
    { name: 'Warm Amber', fg: '#78350f', bg: '#fffbeb' },
    { name: 'Midnight Invert', fg: '#ffffff', bg: '#0f172a' },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Form & Configuration */}
      <div className="lg:col-span-7 flex flex-col gap-5">
        {/* Type Selector Tabs */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2.5">
            1. Select QR Data Type
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'url', label: 'Website', icon: Globe },
              { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
              { id: 'contact', label: 'Contact', icon: User },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'phone', label: 'Phone', icon: Phone },
              { id: 'sms', label: 'SMS', icon: MessageSquare },
              { id: 'geo', label: 'Location', icon: MapPin },
              { id: 'calendar', label: 'Event', icon: Calendar },
              { id: 'crypto', label: 'Crypto', icon: Coins },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveType(tab.id as QRContentType)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] truncate w-full text-center">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Form Content */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            2. Enter Information
          </label>

          {/* URL Form */}
          {activeType === 'url' && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Target Web Address (URL)
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Plain Text Form */}
          {activeType === 'text' && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Plain Text Message or Barcode Code
              </label>
              <textarea
                rows={3}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your text message or code here..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Wi-Fi Form */}
          {activeType === 'wifi' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Network SSID (Name)
                </label>
                <input
                  type="text"
                  value={wifiData.ssid}
                  onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                  placeholder="MyHomeWifi"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    value={wifiData.password}
                    onChange={(e) => setWifiData({ ...wifiData, password: e.target.value })}
                    placeholder="Enter network password"
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Encryption Type
                  </label>
                  <select
                    value={wifiData.security}
                    onChange={(e) => setWifiData({ ...wifiData, security: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="WPA">WPA / WPA2 (Recommended)</option>
                    <option value="WPA3">WPA3 Personal</option>
                    <option value="WEP">WEP (Legacy)</option>
                    <option value="nopass">None (Open Network)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={wifiData.hidden}
                  onChange={(e) => setWifiData({ ...wifiData, hidden: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
                />
                <span>Hidden Network SSID</span>
              </label>
            </div>
          )}

          {/* Contact (vCard) Form */}
          {activeType === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={contactData.name}
                  onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={contactData.phone}
                  onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={contactData.organization}
                  onChange={(e) => setContactData({ ...contactData, organization: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Email Form */}
          {activeType === 'email' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Phone Form */}
          {activeType === 'phone' && (
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Phone Number to Dial
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          {/* Geo Location Form */}
          {activeType === 'geo' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={geoData.lat}
                  onChange={(e) => setGeoData({ ...geoData, lat: e.target.value })}
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={geoData.lng}
                  onChange={(e) => setGeoData({ ...geoData, lng: e.target.value })}
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Place Name
                </label>
                <input
                  type="text"
                  value={geoData.label}
                  onChange={(e) => setGeoData({ ...geoData, label: e.target.value })}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Crypto Form */}
          {activeType === 'crypto' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Blockchain
                  </label>
                  <select
                    value={cryptoData.currency}
                    onChange={(e) => setCryptoData({ ...cryptoData, currency: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  >
                    <option value="bitcoin">Bitcoin (BTC)</option>
                    <option value="ethereum">Ethereum (ETH)</option>
                    <option value="solana">Solana (SOL)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                    Amount (Optional)
                  </label>
                  <input
                    type="text"
                    value={cryptoData.amount}
                    onChange={(e) => setCryptoData({ ...cryptoData, amount: e.target.value })}
                    placeholder="0.05"
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={cryptoData.address}
                  onChange={(e) => setCryptoData({ ...cryptoData, address: e.target.value })}
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Styling & Customization Studio */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Visual Styling & Branding
            </label>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Live Preview Updates Instantly
            </span>
          </div>

          {/* Color Presets */}
          <div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
              Color Schemes:
            </span>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setFgColor(preset.fg);
                    setBgColor(preset.bg);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300" style={{ backgroundColor: preset.fg }} />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Pickers */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Foreground</div>
                <div className="font-mono text-slate-500 text-[11px]">{fgColor}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
              />
              <div className="text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Background</div>
                <div className="font-mono text-slate-500 text-[11px]">{bgColor}</div>
              </div>
            </div>
          </div>

          {/* Error Correction & Margin */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Error Correction Redundancy
              </label>
              <select
                value={errorCorrection}
                onChange={(e) => setErrorCorrection(e.target.value as any)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
              >
                <option value="L">Level L (7% Recovery)</option>
                <option value="M">Level M (15% Recovery)</option>
                <option value="Q">Level Q (25% Recovery)</option>
                <option value="H">Level H (30% - Best for Logos)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Quiet Zone Margin
                </label>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                  {margin} modules
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                value={margin}
                onChange={(e) => setMargin(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Center Icon Overlay */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-2">
              Center Icon Badge:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'none', label: 'None' },
                { id: 'wifi', label: 'Wi-Fi 📶' },
                { id: 'globe', label: 'Web 🌐' },
                { id: 'star', label: 'Star ⭐' },
                { id: 'shield', label: 'Verified 🛡️' },
              ].map((badge) => (
                <button
                  key={badge.id}
                  onClick={() => {
                    setCenterIcon(badge.id as any);
                    setCustomLogoUrl(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    centerIcon === badge.id && !customLogoUrl
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {badge.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live Output & Export Station */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Live Canvas Output Box */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative p-4 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60" style={{ backgroundColor: bgColor }}>
            <canvas ref={canvasRef} className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg" />
          </div>

          <div className="mt-4 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Target Payload
            </span>
            <p className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 max-w-[280px] truncate">
              {getRawPayload()}
            </p>
          </div>

          {/* Quick Raw String Copy */}
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(getRawPayload());
              if (ok) {
                setCopiedRaw(true);
                setTimeout(() => setCopiedRaw(false), 2000);
              }
            }}
            className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline"
          >
            {copiedRaw ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedRaw ? 'Payload Copied' : 'Copy Raw String'}</span>
          </button>
        </div>

        {/* Export Buttons Suite */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Export & Share
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={downloadPNG}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={downloadSVG}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download SVG</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyImageToClipboard}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedImage ? 'Image Copied' : 'Copy Image'}</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Poster</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Ready Sheet Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-2xl text-slate-900 border border-slate-200 flex flex-col items-center text-center">
            <h2 className="text-xl font-bold tracking-tight mb-1">
              {activeType === 'wifi' ? 'Scan to Connect Wi-Fi' : 'Scan QR Code'}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Point your smartphone camera to connect immediately
            </p>

            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="Printable QR"
                className="w-56 h-56 object-contain rounded-xl border border-slate-200 p-2 shadow-sm mb-4"
              />
            )}

            <div className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-left font-mono space-y-1 mb-6">
              <div className="font-bold text-slate-700">{activeType.toUpperCase()} PAYLOAD:</div>
              <div className="text-slate-600 break-all">{getRawPayload()}</div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
