import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Star,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  Globe,
  User,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Coins,
  FileText,
  Volume2,
  Download,
  Sparkles,
  Tag,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';
import { ParsedQRData, QRContentType, ScanRecord } from '../types';
import { copyToClipboard, downloadICal, downloadVCard } from '../utils/exporter';

interface ScanResultModalProps {
  record: ScanRecord;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateRecord: (id: string, updates: { notes?: string; tags?: string[] }) => void;
  onOpenInGenerator: (content: string, type: QRContentType) => void;
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  record,
  onClose,
  onToggleFavorite,
  onUpdateRecord,
  onOpenInGenerator,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notes, setNotes] = useState(record.notes || '');
  const [newTagInput, setNewTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(record.tags || []);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { parsed } = record;

  const handleCopy = async (textToCopy: string, isPwd = false) => {
    const success = await copyToClipboard(textToCopy);
    if (success) {
      if (isPwd) {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } else {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: parsed.title,
          text: record.content,
        });
      } catch {
        // Share cancelled
      }
    } else {
      handleCopy(record.content);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const updated = [...tags, trimmed];
      setTags(updated);
      onUpdateRecord(record.id, { tags: updated, notes });
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    onUpdateRecord(record.id, { tags: updated, notes });
  };

  const handleNotesBlur = () => {
    if (notes !== record.notes) {
      onUpdateRecord(record.id, { notes, tags });
    }
  };

  // Text to Speech readout
  const speakText = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = parsed.wifi
      ? `Wi-Fi network ${parsed.wifi.ssid}. Security type ${parsed.wifi.securityType}.`
      : parsed.contact
      ? `Contact card for ${parsed.contact.name || 'unnamed'}. Phone ${parsed.contact.phone || 'none'}.`
      : parsed.title || record.content;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Icon selector
  const getTypeIcon = () => {
    switch (parsed.type) {
      case 'wifi':
        return { icon: Wifi, bg: 'bg-blue-500', color: 'text-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-950/40' };
      case 'url':
        return { icon: Globe, bg: 'bg-emerald-500', color: 'text-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40' };
      case 'contact':
        return { icon: User, bg: 'bg-purple-500', color: 'text-purple-500', lightBg: 'bg-purple-50 dark:bg-purple-950/40' };
      case 'email':
        return { icon: Mail, bg: 'bg-indigo-500', color: 'text-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-950/40' };
      case 'phone':
        return { icon: Phone, bg: 'bg-teal-500', color: 'text-teal-500', lightBg: 'bg-teal-50 dark:bg-teal-950/40' };
      case 'sms':
        return { icon: MessageSquare, bg: 'bg-cyan-500', color: 'text-cyan-500', lightBg: 'bg-cyan-50 dark:bg-cyan-950/40' };
      case 'geo':
        return { icon: MapPin, bg: 'bg-rose-500', color: 'text-rose-500', lightBg: 'bg-rose-50 dark:bg-rose-950/40' };
      case 'calendar':
        return { icon: Calendar, bg: 'bg-amber-500', color: 'text-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/40' };
      case 'crypto':
        return { icon: Coins, bg: 'bg-orange-500', color: 'text-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-950/40' };
      default:
        return { icon: FileText, bg: 'bg-slate-600', color: 'text-slate-600', lightBg: 'bg-slate-100 dark:bg-slate-800' };
    }
  };

  const typeMeta = getTypeIcon();
  const TypeIcon = typeMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        id="scan-result-modal-box"
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${typeMeta.bg} text-white flex items-center justify-center shadow-md`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {parsed.type} Code Detected
                </span>
                {record.format && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {record.format}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-[280px] sm:max-w-md">
                {parsed.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleFavorite(record.id)}
              className={`p-2 rounded-xl transition-colors ${
                record.isFavorite
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={record.isFavorite ? 'Remove from favorites' : 'Star this scan'}
            >
              <Star className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* URL Security Inspection */}
          {parsed.type === 'url' && parsed.urlAnalysis && (
            <div
              className={`p-4 rounded-2xl border ${
                parsed.urlAnalysis.isSafe
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {parsed.urlAnalysis.isSafe ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Security Inspection:{' '}
                    <span className={parsed.urlAnalysis.isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                      {parsed.urlAnalysis.isSafe ? 'Verified Safe Link' : 'Caution Advised'}
                    </span>
                  </span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Trust: {parsed.urlAnalysis.score}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Domain: <strong className="text-slate-800 dark:text-slate-200">{parsed.urlAnalysis.domain}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Protocol: <strong className="text-slate-800 dark:text-slate-200">{parsed.urlAnalysis.protocol}</strong></span>
                </div>
              </div>

              {parsed.urlAnalysis.flags.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  {parsed.urlAnalysis.flags.map((flag, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wi-Fi Details Card */}
          {parsed.type === 'wifi' && parsed.wifi && (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300 font-bold">
                    Network Name (SSID)
                  </span>
                  <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {parsed.wifi.ssid}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Security</span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {parsed.wifi.securityType}
                  </div>
                </div>
              </div>

              {parsed.wifi.password ? (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-300 font-bold">
                    Network Password
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 font-mono text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{showPassword ? parsed.wifi.password : '••••••••••••'}</span>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleCopy(parsed.wifi?.password || '', true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {copiedPassword ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPassword ? 'Copied' : 'Copy Password'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Open network (no password required)
                </div>
              )}
            </div>
          )}

          {/* Contact (vCard) Card */}
          {parsed.type === 'contact' && parsed.contact && (
            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-2 text-xs">
              {parsed.contact.name && (
                <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{parsed.contact.name}</span>
                </div>
              )}
              {parsed.contact.title && (
                <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">Job Title / Org</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {[parsed.contact.title, parsed.contact.organization].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}
              {parsed.contact.phone && (
                <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">Phone</span>
                  <a
                    href={`tel:${parsed.contact.phone}`}
                    className="font-mono font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {parsed.contact.phone}
                  </a>
                </div>
              )}
              {parsed.contact.email && (
                <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/60 pb-2">
                  <span className="text-slate-500 dark:text-slate-400">Email</span>
                  <a
                    href={`mailto:${parsed.contact.email}`}
                    className="font-mono font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {parsed.contact.email}
                  </a>
                </div>
              )}
              {parsed.contact.address && (
                <div className="flex items-start justify-between pt-1">
                  <span className="text-slate-500 dark:text-slate-400">Address</span>
                  <span className="text-slate-800 dark:text-slate-200 text-right max-w-xs">{parsed.contact.address}</span>
                </div>
              )}
            </div>
          )}

          {/* Calendar Event Card */}
          {parsed.type === 'calendar' && parsed.calendar && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{parsed.calendar.title}</div>
              {parsed.calendar.startTime && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Date / Time</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {parsed.calendar.startTime} {parsed.calendar.endTime ? `to ${parsed.calendar.endTime}` : ''}
                  </span>
                </div>
              )}
              {parsed.calendar.location && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="text-slate-800 dark:text-slate-200">{parsed.calendar.location}</span>
                </div>
              )}
              {parsed.calendar.description && (
                <div className="pt-2 text-slate-600 dark:text-slate-300 border-t border-amber-100 dark:border-amber-900/40">
                  {parsed.calendar.description}
                </div>
              )}
            </div>
          )}

          {/* Raw Scanned Payload Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Content Payload
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={speakText}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isSpeaking ? 'Stop Read' : 'Read Aloud'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(record.content)}
                  className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 break-all max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-800 select-all">
              {record.content}
            </div>
          </div>

          {/* Notes & Tagging */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Tag className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tags & Labeling</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-500"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Add Tag"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-0.5 outline-none focus:border-indigo-500 w-24 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <textarea
                placeholder="Add a private note about this scan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={2}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInGenerator(record.content, parsed.type)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              title="Open content in QR Generator to style and download"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Design QR</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>

          {/* Primary Action Button based on Type */}
          <div className="flex items-center gap-2">
            {parsed.type === 'url' && (
              <a
                href={record.content.startsWith('http') ? record.content : `https://${record.content}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
              >
                <span>Visit Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {parsed.type === 'contact' && (
              <button
                onClick={() => downloadVCard(record.content, `${parsed.contact?.name || 'contact'}.vcf`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Contact (.vcf)</span>
              </button>
            )}

            {parsed.type === 'calendar' && (
              <button
                onClick={() => downloadICal(record.content, `${parsed.calendar?.title || 'event'}.ics`)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all active:scale-95"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Add to Calendar (.ics)</span>
              </button>
            )}

            {parsed.type === 'phone' && (
              <a
                href={`tel:${parsed.contact?.phone || record.content.replace('tel:', '')}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Dial Number</span>
              </a>
            )}

            {parsed.type === 'email' && (
              <a
                href={record.content.startsWith('mailto:') ? record.content : `mailto:${parsed.email?.to}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </a>
            )}

            {parsed.type === 'geo' && parsed.geo && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${parsed.geo.latitude},${parsed.geo.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Open in Maps</span>
              </a>
            )}

            {parsed.type === 'text' && (
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(record.content)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Google</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
