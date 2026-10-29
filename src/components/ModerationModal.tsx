import React from 'react';
import { ShieldAlert, UserX, Check, X, Unlock, UserCheck, AlertCircle } from 'lucide-react';
import { BannedUser } from '../types/intercom';

interface ModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bannedList: BannedUser[];
  onUnbanUser: (targetId: string) => void;
  isDirector: boolean;
  currentRoomName: string;
}

export const ModerationModal: React.FC<ModerationModalProps> = ({
  isOpen,
  onClose,
  bannedList,
  onUnbanUser,
  isDirector,
  currentRoomName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col justify-between max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">إدارة المحظورين وفك الحظر</h2>
              <p className="text-[11px] text-slate-400">صلاحية لمشرف المجموعة ومدير النظام</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banned List Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {bannedList.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs space-y-2">
              <UserCheck className="w-8 h-8 mx-auto opacity-30 text-emerald-400" />
              <p>لا يوجد أي أشخاص محظورين حالياً.</p>
              <p className="text-[11px] text-slate-600">يمكنك حظر أي شخص مسيء من قائمة المشتركين وفك حظره هنا في أي وقت.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bannedList.map((ban) => (
                <div
                  key={ban.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                      <UserX className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{ban.name}</div>
                      <div className="text-[10px] text-slate-400">
                        حُظر بواسطة: <span className="text-rose-300">{ban.bannedBy}</span>
                        {ban.isGlobal && <span className="text-amber-400 font-bold mr-1"> (حظر شامل)</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(ban.bannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onUnbanUser(ban.id)}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>فك الحظر</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>يتم تطبيق فك الحظر والسماح بالدخول فوراً.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
