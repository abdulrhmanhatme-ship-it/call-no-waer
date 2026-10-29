import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, Eye, EyeOff, KeyRound, X, Check, AlertCircle, Plus, Radio } from 'lucide-react';

interface DirectorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDirector: boolean;
  stealthMode: boolean;
  onAuthenticate: (masterKey: string) => void;
  onToggleStealth: (stealth: boolean) => void;
  onCreateEncryptedChannel: (name: string, pin: string, description: string) => void;
  errorMessage?: string | null;
}

export const DirectorAuthModal: React.FC<DirectorAuthModalProps> = ({
  isOpen,
  onClose,
  isDirector,
  stealthMode,
  onAuthenticate,
  onToggleStealth,
  onCreateEncryptedChannel,
  errorMessage,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState<'auth' | 'create'>(isDirector ? 'create' : 'auth');

  // New channel form
  const [newChanName, setNewChanName] = useState('');
  const [newChanPin, setNewChanPin] = useState('');
  const [newChanDesc, setNewChanDesc] = useState('');

  if (!isOpen) return null;

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyInput.trim()) {
      onAuthenticate(keyInput.trim());
      setKeyInput('');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChanName.trim() && newChanPin.trim()) {
      onCreateEncryptedChannel(newChanName.trim(), newChanPin.trim(), newChanDesc.trim());
      setNewChanName('');
      setNewChanPin('');
      setNewChanDesc('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>لوحة تحكم مدير النظام (القيادة)</span>
                {isDirector && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    مفعل
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">تحكم كامل بجميع المجموعات والتواجد الخفي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status & Options Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Active Director Status Card */}
          {isDirector ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>المفتاح الرئيسي نشط (صلاحية كاملة)</span>
                  </div>
                  <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold font-mono">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  تستطيع الآن الدخول لأي مجموعة مشفرة (س، ص، إلخ) بدون كلمة سر المجموعة، ولديك حق أولوية البث ومقاطعة أي متحدث.
                </p>
              </div>

              {/* Stealth Mode Toggle (الدخول الخفي) */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {stealthMode ? <EyeOff className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                    <span>وضع المراقبة الصامتة (التخفي)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {stealthMode
                      ? 'أنت مخفي تماماً من قائمة المشتركين ولن يراك أحد إلا عندما تتحدث!'
                      : 'أنت ظاهر في قائمة المشتركين كـ مدير نظام'}
                  </div>
                </div>

                <button
                  onClick={() => onToggleStealth(!stealthMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    stealthMode
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {stealthMode ? 'مخفي (نشط)' : 'ظاهر'}
                </button>
              </div>

              {/* Create Encrypted Group Form */}
              <div className="space-y-3 pt-1 border-t border-slate-800">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>إنشاء مجموعة مشفرة جديدة لفريقك</span>
                </div>
                <form onSubmit={handleCreateSubmit} className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="اسم المجموعة (مثلاً: مجموعة س، الاستطلاع)..."
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="رمز المرور لأعضاء المجموعة (PIN مثلاً: 4455)..."
                    value={newChanPin}
                    onChange={(e) => setNewChanPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="وصف المجموعة (اختياري)..."
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-md"
                  >
                    إنشاء وتشفير التردد
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                أدخل <strong className="text-amber-400">المفتاح الرئيسي لمدير النظام (Master Key)</strong> لفتح جميع القنوات المشفرة، تفعيل وضع التواجد الخفي، وإظهار شعار القيادة العليا عند التحدث:
              </p>

              {errorMessage && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="أدخل المفتاح الرئيسي للمدير (الافتراضي: 9900)..."
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-amber-400 pr-9"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>

                <button
                  type="submit"
                  disabled={!keyInput.trim()}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  تفعيل صلاحية مدير النظام
                </button>
              </form>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
                <div>🔑 <strong className="text-white">المفتاح الافتراضي المبرمج:</strong> <code className="text-amber-400 font-mono font-bold">9900</code></div>
                <div>👁 بمجرد الدخول، تدخل بوضع <strong className="text-white">التخفي الصامت</strong> ولن يعلم بوجودك أحد في أي غرفة حتى تضغط زر التحدث.</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
