import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
  Send,
  Smartphone,
  Laptop,
  QrCode,
  Download,
  Info,
  Radio,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { getPublicShareUrl } from '../utils/urlHelper';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string;
  currentRoomName: string;
  channelFrequency: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  currentRoomName,
  channelFrequency,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'instant' | 'qr' | 'install'>('instant');
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const currentUrl = getPublicShareUrl(currentRoomId);
  const shareText = `📡 انضم إلى جهاز الاتصال اللاسلكي (أثير) معي الآن!\nالقناة: ${currentRoomName} (${channelFrequency})\nاضغط على الرابط للدخول والتحدث مباشرة:\n${currentUrl}`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(`📡 انضم للاتصال اللاسلكي: ${currentRoomName}`)}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `جهاز اتصال لاسلكي - ${currentRoomName}`,
          text: `انضم للاتصال اللاسلكي عبر الواي فاي والإنترنت على قناة: ${currentRoomName}`,
          url: currentUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col justify-between">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">إرسال ومشاركة جهاز اللاسلكي</h2>
              <p className="text-xs text-slate-400">أرسل الرابط للجوالات وأجهزة الكمبيوتر للانضمام فوراً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('instant')}
            className={`pb-2 text-xs font-semibold px-2 transition-colors border-b-2 ${
              activeTab === 'instant'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            إرسال سريع (واتساب ورابط)
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2 text-xs font-semibold px-2 transition-colors border-b-2 ${
              activeTab === 'qr'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            مسح رمز QR بالكاميرا
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`pb-2 text-xs font-semibold px-2 transition-colors border-b-2 ${
              activeTab === 'install'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            تثبيت كـ تطبيق للجوال
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {activeTab === 'instant' && (
            <>
              {/* Channel Info Card */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{currentRoomName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{channelFrequency}</div>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                  جاهز للإرسال
                </span>
              </div>

              {/* Direct Link Input with Copy button */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-medium block">
                  رابط الدخول المباشر (يعمل على الجوال والكمبيوتر):
                </label>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-transparent text-xs text-emerald-400 font-mono focus:outline-none truncate text-left dir-ltr px-1"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instant Social Dispatch Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>إرسال عبر الواتساب</span>
                </a>

                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 text-sky-400" />
                  <span>إرسال عبر تيليجرام</span>
                </a>
              </div>

              {/* System Share sheet trigger (for AirDrop, Bluetooth, SMS) */}
              <button
                onClick={handleNativeShare}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
              >
                <Share2 className="w-4 h-4" />
                <span>مشاركة عبر خيارات الهاتف (AirDrop / بلوتوث / رسائل)</span>
              </button>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                💡 <strong className="text-white">طريقة الاستخدام للطرف الآخر:</strong> بمجرد أن يفتح الطرف الآخر الرابط من هاتفه أو كمبيوتره، يدخل مباشرة إلى نفس التردد ويستطيع الضغط على زر التحدث (PTT) وسماعه فوراً دون الحاجة لتثبيت أي برامج أو تسجيل حساب.
              </div>
            </>
          )}

          {activeTab === 'qr' && (
            <div className="text-center py-2 space-y-4">
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                افتح كاميرا أي هاتف ذكي (أندرويد أو آيفون) ووجهها نحو الرمز للدخول والتحدث فوراً:
              </p>

              <div className="inline-block p-4 rounded-2xl bg-white shadow-xl">
                <div className="w-48 h-48 flex items-center justify-center relative bg-slate-900 rounded-xl overflow-hidden p-3">
                  <div className="absolute inset-0 bg-emerald-950/20"></div>
                  {/* High-contrast crisp QR visual */}
                  <div className="relative z-10 grid grid-cols-6 gap-1 w-full h-full p-2 bg-white rounded-lg">
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>

                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-300 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-300 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>

                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-emerald-600 rounded-xs flex items-center justify-center col-span-2 row-span-2">
                      <Radio className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-white"></div>

                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-white"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-xs"></div>

                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-300 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-xs"></div>

                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                    <div className="bg-slate-950 rounded-xs"></div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-emerald-400 font-mono">
                تردد القناة: <span className="font-bold text-white text-sm bg-slate-800 px-2.5 py-1 rounded">{channelFrequency}</span>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 leading-relaxed">
                يمكنك تثبيت هذا البرنامج كـ تطبيق كامل <strong className="text-white">(PWA)</strong> على شاشة هاتفك الرئيسية ليعمل بدون أشرطة المتصفح مثل التطبيقات الأصلية تماماً:
              </div>

              {isInstallable ? (
                <button
                  onClick={install}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت الآن على هذا الهاتف (Install App)</span>
                </button>
              ) : isInstalled ? (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold text-center">
                  ✔ التطبيق مثبت بالفعل على هذا الجهاز في الشاشة الرئيسية!
                </div>
              ) : null}

              {/* Instructions for iPhone / Safari */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>طريقة التثبيت على الآيفون (iPhone / Safari):</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside pr-1">
                  <li>افتح الرابط في متصفح Safari.</li>
                  <li>اضغط على زر المشاركة <strong className="text-white">(أيقونة المربع وسهم لأعلى ⎋)</strong> في أسفل الشاشة.</li>
                  <li>اختر <strong className="text-white">«إضافة إلى الصفحة الرئيسية» (Add to Home Screen)</strong>.</li>
                </ol>
              </div>

              {/* Instructions for Android / Chrome */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>طريقة التثبيت على الأندرويد (Android / Chrome):</span>
                </div>
                <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside pr-1">
                  <li>اضغط على النقاط الثلاث ⋮ في أعلى المتصفح.</li>
                  <li>اضغط على <strong className="text-white">«تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</strong>.</li>
                </ol>
              </div>

              {/* Instructions for PC */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-purple-400" />
                  <span>طريقة التثبيت على الكمبيوتر (Windows / Mac):</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pr-1">
                  اضغط على أيقونة التثبيت ⊕ في شريط عنوان المتصفح (Chrome أو Edge) لفتحه كنافذة مستقلة بدون متصفح.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>يمكن لعدد غير محدود من الهواتف والكمبيوترات الدخول معاً</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
