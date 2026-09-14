import React, { useState, useMemo } from 'react';
import {
  Search,
  Star,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  Filter,
  ExternalLink,
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
  Clock,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { QRContentType, ScanRecord } from '../types';
import { exportHistoryToCSV, exportHistoryToJSON, copyToClipboard } from '../utils/exporter';

interface HistoryListProps {
  records: ScanRecord[];
  onSelectRecord: (record: ScanRecord) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onImportBackup: (importedRecords: ScanRecord[]) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  records,
  onSelectRecord,
  onToggleFavorite,
  onDeleteRecord,
  onClearAll,
  onImportBackup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | QRContentType>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Type filter
      if (activeFilter === 'favorites' && !rec.isFavorite) return false;
      if (activeFilter !== 'all' && activeFilter !== 'favorites' && rec.parsed.type !== activeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = rec.content.toLowerCase().includes(q);
        const matchesTitle = rec.parsed.title?.toLowerCase().includes(q);
        const matchesNotes = rec.notes?.toLowerCase().includes(q);
        const matchesTags = rec.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesContent && !matchesTitle && !matchesNotes && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [records, activeFilter, searchQuery]);

  const handleCopy = async (id: string, text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map((r) => r.id));
    }
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => onDeleteRecord(id));
    setSelectedIds([]);
  };

  const handleExportSelected = () => {
    const items = records.filter((r) => selectedIds.includes(r.id));
    exportHistoryToCSV(items.length ? items : records);
  };

  // Import JSON backup
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

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getTypeIcon = (type: QRContentType) => {
    switch (type) {
      case 'wifi':
        return <Wifi className="w-4 h-4 text-blue-500" />;
      case 'url':
        return <Globe className="w-4 h-4 text-emerald-500" />;
      case 'contact':
        return <User className="w-4 h-4 text-purple-500" />;
      case 'email':
        return <Mail className="w-4 h-4 text-indigo-500" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-teal-500" />;
      case 'sms':
        return <MessageSquare className="w-4 h-4 text-cyan-500" />;
      case 'geo':
        return <MapPin className="w-4 h-4 text-rose-500" />;
      case 'calendar':
        return <Calendar className="w-4 h-4 text-amber-500" />;
      case 'crypto':
        return <Coins className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      {/* Top Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, url, tags, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Global Export / Import actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
            <input type="file" accept=".json" onChange={handleFileImport} className="hidden" />
          </label>

          <button
            onClick={() => exportHistoryToCSV(records)}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => exportHistoryToJSON(records)}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Scans', count: records.length },
          { id: 'favorites', label: 'Starred', icon: Star, count: records.filter((r) => r.isFavorite).length },
          { id: 'url', label: 'Websites' },
          { id: 'wifi', label: 'Wi-Fi' },
          { id: 'contact', label: 'Contacts' },
          { id: 'calendar', label: 'Events' },
          { id: 'geo', label: 'Maps' },
          { id: 'text', label: 'Text / Barcode' },
        ].map((chip) => {
          const isActive = activeFilter === chip.id;
          const ChipIcon = (chip as any).icon;
          return (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {ChipIcon && <ChipIcon className="w-3.5 h-3.5 text-amber-500 fill-current" />}
              <span>{chip.label}</span>
              {typeof chip.count === 'number' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                  {chip.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk Action Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
          <span>{selectedIds.length} records selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              className="px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Export Selected
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Records Feed */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* Table header */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
            />
            <span>Record Details</span>
          </div>
          <span>Actions</span>
        </div>

        {/* List items */}
        {filteredRecords.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <div className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
              No matching scan history records
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery ? 'Try clearing your search term or selecting another filter.' : 'Scan a QR code using the Live Scanner or Image Uploader to see history here.'}
            </p>
          </div>
        ) : (
          filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(rec.id)}
                  onChange={() => {
                    setSelectedIds((prev) =>
                      prev.includes(rec.id) ? prev.filter((id) => id !== rec.id) : [...prev, rec.id]
                    );
                  }}
                  className="w-4 h-4 mt-1 rounded text-indigo-600 accent-indigo-600 cursor-pointer flex-shrink-0"
                />

                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getTypeIcon(rec.parsed.type)}
                </div>

                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => onSelectRecord(rec)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {rec.parsed.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                      {formatRelativeTime(rec.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-md my-0.5">
                    {rec.content}
                  </p>

                  {/* Notes / Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {rec.tags?.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                    {rec.notes && (
                      <span className="text-[11px] text-slate-400 italic truncate max-w-xs">
                        "{rec.notes}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onToggleFavorite(rec.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    rec.isFavorite
                      ? 'text-amber-500 hover:text-amber-600'
                      : 'text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400'
                  }`}
                  title={rec.isFavorite ? 'Remove star' : 'Star scan'}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={() => handleCopy(rec.id, rec.content)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copy content"
                >
                  {copiedId === rec.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => onSelectRecord(rec)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Inspect
                </button>

                <button
                  onClick={() => onDeleteRecord(rec.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear All Footer */}
      {records.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 pt-1">
          <span>Showing {filteredRecords.length} of {records.length} items stored in local database</span>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all history records?')) {
                onClearAll();
              }
            }}
            className="text-rose-600 dark:text-rose-400 font-semibold hover:underline"
          >
            Clear Entire History
          </button>
        </div>
      )}
    </div>
  );
};
