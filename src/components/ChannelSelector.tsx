import React, { useState } from 'react';
import {
  Radio,
  Users,
  Plus,
  Shield,
  ShieldAlert,
  Compass,
  ChevronRight,
  Lock,
  Unlock,
  KeyRound,
  Check,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { Channel } from '../types/intercom';

interface ChannelSelectorProps {
  currentRoomId: string;
  onSelectChannel: (channelId: string, pin?: string) => void;
  channels: Channel[];
  isDirector: boolean;
  onOpenDirectorModal: () => void;
  onUnlockChannelByPin: (pin: string) => void;
  onCreateEncryptedChannel: (name: string, pin: string, description: string) => void;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  currentRoomId,
  onSelectChannel,
  channels,
  isDirector,
  onOpenDirectorModal,
  onUnlockChannelByPin,
  onCreateEncryptedChannel,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPin, setCreatePin] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    onUnlockChannelByPin(pinInput.trim());
    setPinInput('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('يرجى إدخال اسم المجموعة');
      return;
    }
    if (!createPin.trim()) {
      setCreateError('يرجى تحديد رمز المرور السري (PIN)');
      return;
    }

    onCreateEncryptedChannel(createName.trim(), createPin.trim(), createDesc.trim());
    setCreateName('');
    setCreatePin('');
    setCreateDesc('');
    setCreateError(null);
    setShowCreateModal(false);
  };

  const getChannelIcon = (id: string, isEncrypted?: boolean) => {
    if (isEncrypted) {
      return <Lock className="w-5 h-5 text-amber-400" />;
    }
    switch (id) {
      case 'general':
        return <Radio className="w-5 h-5 text-emerald-400" />;
      case 'operations':
        return <Shield className="w-5 h-5 text-sky-400" />;
      case 'field':
        return <Compass className="w-5 h-5 text-amber-400" />;
      case 'security':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      default:
        return <Radio className="w-5 h-5 text-purple-400" />;
    }
  };

  const encryptedChannelsCount = channels.filter((c) => c.isEncrypted).length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Top Tactical Gateway Bar: The Secret Code Input Field */}
      <div className="p-4 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">بوابة الترددات المشفرة السرية</h3>
              <p className="text-[10px] text-slate-400">أدخل رمز المجموعة (PIN) للاتصال المباشر وفك التشفير</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مجموعة مشفرة</span>
          </button>
        </div>

        {/* Input box for PIN code */}
        <form onSubmit={handlePinSubmit} className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="اكتب رمز التردد السري الخاص بمجموعتك (PIN)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/80 rounded-xl px-4 py-2.5 text-xs text-center font-mono tracking-widest text-white placeholder:text-slate-600 focus:outline-none transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-600">
              PIN
            </span>
          </div>

          <button
            type="submit"
            disabled={!pinInput.trim()}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-950/40"
          >
            <span>دخول المجموعة</span>
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </form>

        {/* Tactical Privacy Disclaimer */}
        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 bg-slate-950/60 p-2 rounded-xl border border-slate-900">
          <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>
            نظام عزل تام: المجموعات المشفرة مخفية بالكامل ولا تظهر لأي مستخدم لا يملك رمزها السري، مما يتيح عمل مجموعات متعددة دون معرفة بوجود بعضها. مدير النظام وحده يستطيع كشف جميع الترددات بالمفتاح العام.
          </span>
        </div>
      </div>

      {/* Header & Director Status */}
      <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 pt-1">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>الترددات المتاحة لك الآن</span>
            {isDirector && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                ⚡ وضع مدير النظام (كافة المجموعات مكشوفة)
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-400">
            {isDirector
              ? `تظهر لك الآن كافة المجموعات النشطة في الشبكة (${channels.length} مجموعات)`
              : encryptedChannelsCount > 0
              ? `أنت متصل بالتردد العام بالإضافة إلى (${encryptedChannelsCount}) مجموعة مشفرة تم فك قفلها`
              : 'أنت في التردد العام. يمكنك فتح أي مجموعة مشفرة أخرى بكتابة رمزها بالأعلى'}
          </p>
        </div>

        <button
          onClick={onOpenDirectorModal}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ${
            isDirector
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
              : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{isDirector ? 'لوحة القيادة' : 'دخول مدير النظام'}</span>
        </button>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {channels.map((channel) => {
          const isSelected = channel.id === currentRoomId;
          const isEncrypted = channel.isEncrypted;

          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`text-right p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                      isEncrypted
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {getChannelIcon(channel.id, isEncrypted)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{channel.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                          التردد الحالي
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{channel.description}</div>
                  </div>
                </div>

                <div className="text-left font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                  <span className={isEncrypted ? 'text-amber-400' : 'text-emerald-400'}>
                    {channel.frequency || '145.500 MHz'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 w-full font-mono">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{channel.activeCount} متصل</span>
                </div>

                <div className="flex items-center gap-1">
                  {isEncrypted ? (
                    <span className="text-amber-400 text-[11px] font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>{isSelected ? 'متصل بالمشفر' : 'مجموعة مشفرة'}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                      <span>{isSelected ? 'التردد النشط' : 'انتقال للتردد'}</span>
                      <ChevronRight className="w-3 h-3 rotate-180" />
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal: Create New Encrypted Group */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">إنشاء مجموعة مشفرة جديدة</h3>
                <p className="text-[11px] text-slate-400">ستكون المجموعة معزولة تماماً ولن يدخلها إلا من تعطيه رمزها</p>
              </div>
            </div>

            {createError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المجموعة المشفرة</label>
                <input
                  type="text"
                  placeholder="مثال: فرقة الفرسان، حراسة الشرق، الفريق الأول..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  رمز المرور السري (PIN)
                  <span className="text-[10px] text-emerald-400 font-normal mr-1">(أعطه فقط لأعضاء مجموعتك)</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: 5544 أو 9021..."
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">وصف أو مهمة المجموعة (اختياري)</label>
                <input
                  type="text"
                  placeholder="تنسيق العمليات الميدانية الخاصة"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!createName.trim() || !createPin.trim()}
                  className="px-4 py-2 text-xs font-bold bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>إنشاء وتشفير التردد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
