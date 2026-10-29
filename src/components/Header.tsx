import React from 'react';
import { Wifi, Radio, Users, QrCode, Share2, Download, MessageSquare, Shield } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  activeTab: 'console' | 'channels' | 'roster' | 'dispatch';
  setActiveTab: (tab: 'console' | 'channels' | 'roster' | 'dispatch') => void;
  onlineCount: number;
  currentChannelName: string;
  channelFrequency: string;
  onOpenNetworkModal: () => void;
  onOpenShareModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onlineCount,
  currentChannelName,
  channelFrequency,
  onOpenNetworkModal,
  onOpenShareModal,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 h-14 shrink-0 flex items-center">
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Wordmark Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Radio className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
              أثير <span className="text-[10px] text-emerald-400 font-mono">ATHEER</span>
            </span>
            <span className="text-[9px] text-slate-400 font-mono sm:hidden">
              {channelFrequency}
            </span>
          </div>
        </div>

        {/* Zone 2: Desktop Nav Tabs (hidden on mobile, replaced by bottom bar) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'console'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            جهاز اللاسلكي
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'channels'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            القنوات ({currentChannelName})
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'roster'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>المشتركون ({onlineCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'dispatch'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الرسائل التكتيكية
          </button>
        </nav>

        {/* Zone 3: Primary Actions (Share & Network & Install) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* PWA Install Button (if available) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-1 transition-colors"
              title="تثبيت التطبيق على الشاشة الرئيسية"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">تثبيت التطبيق</span>
            </button>
          )}

          {/* Share Modal Trigger */}
          <button
            onClick={onOpenShareModal}
            className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
            title="إرسال الرابط للجوالات وأجهزة الكمبيوتر"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>مشاركة للجوال والكمبيوتر</span>
          </button>

          {/* Wi-Fi Guide trigger */}
          <button
            onClick={onOpenNetworkModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1"
            title="طريقة ربط الواي فاي والإنترنت"
          >
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden lg:inline text-[11px]">الربط والواي فاي</span>
          </button>
        </div>
      </div>
    </header>
  );
};
