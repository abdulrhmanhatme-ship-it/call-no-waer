import React, { useState } from 'react';
import {
  Users,
  Smartphone,
  Laptop,
  Wifi,
  Globe,
  Battery,
  BatteryCharging,
  Radio,
  Edit2,
  Check,
  UserCheck,
  Activity,
  UserX,
  UserMinus,
  ShieldCheck,
  ShieldAlert,
  Unlock
} from 'lucide-react';
import { Participant } from '../types/intercom';

interface RosterListProps {
  participants: Participant[];
  currentUserId: string;
  currentUserName: string;
  onUpdateMyName: (name: string) => void;
  activeSpeakerId: string | null;
  currentChannelName: string;
  canModerate: boolean; // True if isDirector OR isModerator
  isDirector: boolean;
  onKickUser: (targetId: string) => void;
  onBanUser: (targetId: string, targetName: string) => void;
  onOpenModerationModal: () => void;
}

export const RosterList: React.FC<RosterListProps> = ({
  participants,
  currentUserId,
  currentUserName,
  onUpdateMyName,
  activeSpeakerId,
  currentChannelName,
  canModerate,
  isDirector,
  onKickUser,
  onBanUser,
  onOpenModerationModal,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUserName);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; name: string; action: 'kick' | 'ban' } | null>(null);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateMyName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  const handleExecuteModeration = () => {
    if (!confirmTarget) return;
    if (confirmTarget.action === 'kick') {
      onKickUser(confirmTarget.id);
    } else {
      onBanUser(confirmTarget.id, confirmTarget.name);
    }
    setConfirmTarget(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* User Call Sign & Profile Card */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">معرفك باللاسلكي</div>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-2.5 py-1 text-xs bg-slate-950 border border-emerald-500/50 rounded text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 bg-emerald-500 text-slate-950 rounded hover:bg-emerald-400 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-white">{currentUserName}</span>
                {!isDirector && (
                  <button
                    onClick={() => {
                      setNameInput(currentUserName);
                      setIsEditingName(true);
                    }}
                    className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                    title="تعديل اسمك"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-left text-xs text-slate-400">
          <div className="font-mono text-[11px] text-emerald-400">متصل بالقناة</div>
          <div className="font-semibold text-white">{currentChannelName}</div>
        </div>
      </div>

      {/* Moderator / Director Control Bar */}
      {canModerate && (
        <div className="p-3 bg-slate-900/90 rounded-2xl border border-amber-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-amber-300">
              {isDirector ? 'صلاحيات مدير النظام' : 'صلاحيات مشرف المجموعة (منشئ القناة)'}
            </span>
            <span className="text-slate-400 hidden sm:inline">· يمكنك طرد أو حظر أي مشترك وفك حظره لاحقاً</span>
          </div>

          <button
            onClick={onOpenModerationModal}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>قائمة المحظورين (فك الحظر)</span>
          </button>
        </div>
      )}

      {/* Participants Counter Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>المشتركون المتصلون ({participants.length})</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-sky-400" />
            <span>واي فاي محلي</span>
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>عبر الإنترنت</span>
          </span>
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-2">
        {participants.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
            لا يوجد مشتركون آخرون في هذه القناة حالياً. شارك الرابط لدعوة زملائك!
          </div>
        ) : (
          participants.map((peer) => {
            const isMe = peer.id === currentUserId;
            const isTalking = peer.id === activeSpeakerId || peer.isTalking;
            const batteryPct = peer.batteryLevel !== undefined ? Math.round(peer.batteryLevel * 100) : null;

            return (
              <div
                key={peer.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isTalking
                    ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                    : isMe
                    ? 'bg-slate-900/90 border-slate-700/80'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Left side: Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      peer.isDirector
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : isTalking
                        ? 'bg-emerald-500 text-slate-950 animate-bounce'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {peer.deviceType === 'mobile' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : (
                      <Laptop className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {peer.name} {isMe && <span className="text-xs text-slate-400 font-normal">(أنت)</span>}
                      </span>
                      {peer.isDirector && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          مدير النظام
                        </span>
                      )}
                      {peer.isModerator && !peer.isDirector && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                          مشرف
                        </span>
                      )}
                      {isTalking && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-spin" />
                          <span>يتحدث</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{peer.deviceType === 'mobile' ? 'هاتف ذكي' : 'كمبيوتر'}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        {peer.networkType === 'lan' ? (
                          <>
                            <Wifi className="w-3 h-3 text-sky-400" />
                            <span className="text-sky-300">نفس الواي فاي</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">عبر الإنترنت</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Moderation actions & battery */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {batteryPct !== null && (
                    <div
                      className="hidden xs:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800"
                      title={peer.batteryCharging ? 'متصل بالشاحن' : 'مستوى البطارية'}
                    >
                      {peer.batteryCharging ? (
                        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Battery
                          className={`w-3.5 h-3.5 ${
                            batteryPct < 20 ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        />
                      )}
                      <span className="tabular-nums">{batteryPct}%</span>
                    </div>
                  )}

                  {/* Kick / Ban Action Buttons for Moderator / Director */}
                  {canModerate && !isMe && !peer.isDirector && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConfirmTarget({ id: peer.id, name: peer.name, action: 'kick' })}
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title={`طرد ${peer.name} من القناة`}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmTarget({ id: peer.id, name: peer.name, action: 'ban' })}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title={`حظر ${peer.name} نهائياً`}
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="متصل ونشط" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Kick / Ban */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full space-y-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  confirmTarget.action === 'ban'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {confirmTarget.action === 'ban' ? <UserX className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {confirmTarget.action === 'ban' ? 'تأكيد حظر المشترك' : 'تأكيد طرد المشترك'}
                </h3>
                <p className="text-[11px] text-slate-400">{confirmTarget.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmTarget.action === 'ban'
                ? `هل أنت متأكد من حظر (${confirmTarget.name}) نهائياً؟ لن يتمكن من العودة إلا بعد فك الحظر عنه.`
                : `هل أنت متأكد من إخراج (${confirmTarget.name}) من هذه المجموعة وإعادته للقناة العامة؟`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmTarget(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteModeration}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-colors ${
                  confirmTarget.action === 'ban'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {confirmTarget.action === 'ban' ? 'نعم، احظره' : 'نعم، اطرده'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
