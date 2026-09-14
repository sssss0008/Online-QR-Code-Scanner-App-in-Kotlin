import React from 'react';
import {
  BarChart3,
  Star,
  Globe,
  Wifi,
  User,
  ShieldCheck,
  TrendingUp,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { ScanRecord } from '../types';

interface StatsDashboardProps {
  records: ScanRecord[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ records }) => {
  const total = records.length;
  const favorites = records.filter((r) => r.isFavorite).length;

  // Breakdown by Type
  const typeCounts: Record<string, number> = {};
  records.forEach((r) => {
    const t = r.parsed.type;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  // Source breakdown
  const cameraCount = records.filter((r) => r.source === 'camera').length;
  const imageCount = records.filter((r) => r.source === 'image').length;
  const batchCount = records.filter((r) => r.source === 'batch').length;

  // Security ratio (for URLs)
  const urlRecords = records.filter((r) => r.parsed.type === 'url');
  const httpsCount = urlRecords.filter((r) => r.content.startsWith('https://')).length;
  const httpCount = urlRecords.length - httpsCount;
  const safeScore = urlRecords.length > 0 ? Math.round((httpsCount / urlRecords.length) * 100) : 100;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* 4 Key Metric Hero Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Scanned</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {total}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Active scan database</span>
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Starred / Favs</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {favorites}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              {total > 0 ? Math.round((favorites / total) * 100) : 0}% of all records
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Security Score</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {safeScore}%
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              {httpsCount} verified SSL domains
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Batch Operations</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {batchCount}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
              Continuous auto-scans
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Section: Type Distribution & Capture Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Type Distribution */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider">
            Scanned Content Distribution
          </h3>

          <div className="space-y-3">
            {[
              { type: 'url', label: 'Web URLs & Portals', color: 'bg-emerald-500' },
              { type: 'wifi', label: 'Wi-Fi Network Credentials', color: 'bg-blue-500' },
              { type: 'contact', label: 'Contact vCards / MeCards', color: 'bg-purple-500' },
              { type: 'text', label: 'Plain Text & Barcodes', color: 'bg-slate-500' },
              { type: 'calendar', label: 'iCal Events', color: 'bg-amber-500' },
              { type: 'geo', label: 'Geographic Locations', color: 'bg-rose-500' },
              { type: 'crypto', label: 'Crypto Wallets', color: 'bg-orange-500' },
            ].map((item) => {
              const count = typeCounts[item.type] || 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.label}
                    </span>
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Capture Methods & Device Insights */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wider mb-4">
              Capture Origin Breakdown
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Live Video Stream</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{cameraCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Image Uploads & Paste</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{imageCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Continuous Batch Engine</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{batchCount}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <p>
              All scans are parsed 100% on-device in your browser sandbox using zero cloud telemetry for maximum privacy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
