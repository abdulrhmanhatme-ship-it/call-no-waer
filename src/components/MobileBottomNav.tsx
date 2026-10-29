import React from 'react';
import { Radio, Layers, Users, MessageSquare } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'console' | 'channels' | 'roster' | 'dispatch';
  setActiveTab: (tab: 'console' | 'channels' | 'roster' | 'dispatch') => void;
  onlineCount: number;
  unreadCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onlineCount,
  unreadCount = 0,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 h-16 pb-safe sm:hidden grid grid-cols-4 items-center px-1 shadow-2xl">
      {/* 1. Walkie Console */}
      <button
        onClick={() => setActiveTab('console')}
        className={`min-h-[48px] flex flex-col items-center justify-center transition-all ${
          activeTab === 'console'
            ? 'text-emerald-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Radio className={`w-5 h-5 ${activeTab === 'console' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[10px] mt-1 tracking-tight">اللاسلكي</span>
      </button>

      {/* 2. Channels */}
      <button
        onClick={() => setActiveTab('channels')}
        className={`min-h-[48px] flex flex-col items-center justify-center transition-all ${
          activeTab === 'channels'
            ? 'text-emerald-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Layers className={`w-5 h-5 ${activeTab === 'channels' ? 'stroke-[2.5]' : ''}`} />
        <span className="text-[10px] mt-1 tracking-tight">القنوات</span>
      </button>

      {/* 3. Participants / Roster */}
      <button
        onClick={() => setActiveTab('roster')}
        className={`min-h-[48px] flex flex-col items-center justify-center relative transition-all ${
          activeTab === 'roster'
            ? 'text-emerald-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <Users className={`w-5 h-5 ${activeTab === 'roster' ? 'stroke-[2.5]' : ''}`} />
          {onlineCount > 0 && (
            <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-bold font-mono">
              {onlineCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-1 tracking-tight">المشتركون</span>
      </button>

      {/* 4. Tactical Messages */}
      <button
        onClick={() => setActiveTab('dispatch')}
        className={`min-h-[48px] flex flex-col items-center justify-center relative transition-all ${
          activeTab === 'dispatch'
            ? 'text-emerald-400 font-bold scale-105'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <MessageSquare className={`w-5 h-5 ${activeTab === 'dispatch' ? 'stroke-[2.5]' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </div>
        <span className="text-[10px] mt-1 tracking-tight">الرسائل</span>
      </button>
    </nav>
  );
};
