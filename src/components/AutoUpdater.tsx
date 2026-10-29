import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface AutoUpdaterProps {
  currentClientVersion: string;
  serverVersion: string | null;
}

export const AutoUpdater: React.FC<AutoUpdaterProps> = ({
  currentClientVersion,
  serverVersion,
}) => {
  const [dismissedVer, setDismissedVer] = useState<string | null>(null);

  const hasUpdate = Boolean(serverVersion && serverVersion !== currentClientVersion && dismissedVer !== serverVersion);

  const handleManualReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch {}
    window.location.reload();
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/60 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-medium animate-in fade-in slide-in-from-top-2">
      <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>يتوفر تحديث جديد للنظام ({serverVersion})</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleManualReload}
          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-[11px] transition-colors"
        >
          تحديث الآن
        </button>
        <button
          onClick={() => setDismissedVer(serverVersion)}
          className="px-2 py-1 text-slate-400 hover:text-white text-[11px] transition-colors"
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
};
