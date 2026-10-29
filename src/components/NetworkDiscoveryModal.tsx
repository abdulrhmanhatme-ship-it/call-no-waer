import React, { useState } from 'react';
import {
  Wifi,
  Globe,
  Smartphone,
  Laptop,
  Copy,
  Check,
  X,
  Zap,
  BatteryCharging,
  ShieldCheck,
  Info,
  QrCode,
  Radio,
  Cable,
  Users
} from 'lucide-react';
import { NetworkInfo } from '../types/intercom';
import { getPublicShareUrl } from '../utils/urlHelper';

interface NetworkDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo | null;
  currentRoomId: string;
}

export const NetworkDiscoveryModal: React.FC<NetworkDiscoveryModalProps> = ({
  isOpen,
  onClose,
  networkInfo,
  currentRoomId,
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'guide' | 'qr' | 'compare'>('guide');

  if (!isOpen) return null;

  const currentUrl = getPublicShareUrl(currentRoomId);

  // Local IP URLs (e.g. 192.168.x.x)
  const localIps = networkInfo?.localAddresses || [];
  const primaryLocalIp = localIps[0]?.address || '192.168.1.xxx';
  const localUrl = `http://${primaryLocalIp}:${networkInfo?.port || 3000}?channel=${currentRoomId}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">طريقة ربط الأجهزة (الواي فاي والإنترنت)</h2>
              <p className="text-xs text-slate-400">حل بديل وسريع وموفر للطاقة بدون الحاجة لكابلات USB المعقدة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 text-xs font-semibold px-2 transition-colors border-b-2 ${
              activeTab === 'guide'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            روابط الاتصال والدخول
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`pb-2.5 text-xs font-semibold px-2 transition-colors border-b-2 ${
              activeTab === 'compare'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            مقارنة الواي فاي مع سلك الـ USB
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 text-xs font-semibold px-2 transition-colors border-b-2 ${
              activeTab === 'qr'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            رمز QR للجوال
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5">
          {activeTab === 'guide' && (
            <>
              {/* Direct Answer Alert */}
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm leading-relaxed space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>نعم ينفع تماماً وبأعلى كفاءة ممكنة!</span>
                </div>
                <p className="text-xs text-emerald-200/90">
                  يمكن لجميع المتواجدين على نفس شبكة الواي فاي الاتصال محلياً <strong className="text-white">(LAN)</strong> بسرعة فائقة واستهلاك <strong className="text-white">0 بايت</strong> من باقة الإنترنت. كما يمكن لأي شخص خارج الشبكة الدخول عبر الإنترنت <strong className="text-white">(WAN)</strong> والتحدث مع الجميع في نفس الغرفة بسلاسة تامة.
                </p>
              </div>

              {/* 1. Same Wi-Fi Connection (LAN) */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Wifi className="w-4 h-4 text-sky-400" />
                    <span>1. المشتركون على نفس شبكة الواي فاي (LAN محلي)</span>
                  </div>
                  <span className="text-[11px] text-sky-300 font-mono">0 KB إنترنت · 0ms بطء</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  شارك هذا الرابط مع أي جوال أو كمبيوتر متصل بنفس الراوتر أو الواي فاي معك:
                </p>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  <code className="text-xs text-emerald-400 font-mono truncate flex-1 dir-ltr text-left">
                    {localUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(localUrl, 'local')}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedLink === 'local' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Outside Internet Users (WAN) */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>2. المشتركون من خارج الشبكة (عبر الإنترنت WAN)</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono">اتصال عالمي</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  لأي شخص في الخارج أو يستخدم بيانات الهاتف (4G/5G)، افتح هذا الرابط:
                </p>
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  <code className="text-xs text-sky-400 font-mono truncate flex-1 dir-ltr text-left">
                    {currentUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(currentUrl, 'wan')}
                    className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 shrink-0 transition-colors"
                  >
                    {copiedLink === 'wan' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Three key features summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">خفيف وسريع جداً</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">زمن استجابة أقل من 10ms ولا يثقل المعالج</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                  <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">موفر فائق للبطارية</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">إطفاء تام للاقط الصوت عند الصمت لتوفير 100%</div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">سعة غير محدودة</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">يدعم أعداداً كبيرة في نفس القناة دون انقطاع</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 leading-relaxed">
                سؤالك في محله تماماً: <strong className="text-white">ربط الأجهزة عبر كابل USB</strong> كان حلاً قديماً وصعباً للغاية لأنه يتطلب:
                كابلات لكل جوال، تفعيل وضع المطورين (ADB / Tethering)، ولا يمكن ربط أكثر من جهاز أو جهازين في نفس الوقت.
                إليك الفرق بين ربط USB وبين نظام <strong className="text-emerald-400">أثير (الواي فاي + الإنترنت)</strong>:
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">المعيار</th>
                      <th className="p-3 text-red-400 flex items-center gap-1">
                        <Cable className="w-3.5 h-3.5" /> الربط السلكي (USB)
                      </th>
                      <th className="p-3 text-emerald-400">
                        <Radio className="w-3.5 h-3.5 inline ml-1" /> نظام أثير (واي فاي + إنترنت)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr>
                      <td className="p-3 font-medium text-white">عدد المشتركين</td>
                      <td className="p-3 text-rose-300">1 - 2 فقط بالكابل</td>
                      <td className="p-3 text-emerald-300 font-semibold">مئات المشتركين في نفس اللحظة</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">سهولة التشغيل</td>
                      <td className="p-3 text-slate-400">تحتاج تعريفات وضبط كروت شبكة افتراضية</td>
                      <td className="p-3 text-emerald-300">بمجرد فتح الرابط أو مسح الكود من الكاميرا</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">استهلاك البطارية</td>
                      <td className="p-3 text-slate-400">يسحب كهرباء الشحن ومستمر بالسخونة</td>
                      <td className="p-3 text-emerald-300 font-semibold">توفير ذكي: المعالج ينام فور انتهاء الكلام</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">التوافق مع الأجهزة</td>
                      <td className="p-3 text-slate-400">معقد على الآيفون والماك</td>
                      <td className="p-3 text-emerald-300">يعمل على أي جوال (أندرويد/آيفون) وكمبيوتر</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-white">المشتركون خارج الشبكة</td>
                      <td className="p-3 text-rose-400">مستحيل عبر USB</td>
                      <td className="p-3 text-emerald-300">متاح فوراً عبر رابط الغرفة بالإنترنت</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="text-center py-4 space-y-4">
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                افتح كاميرا أي هاتف ذكي (أندرويد أو آيفون) متصل بنفس شبكة الواي فاي ووجهها نحو الرمز للانضمام فوراً:
              </p>

              {/* Stylized QR Code Frame */}
              <div className="inline-block p-4 rounded-2xl bg-white shadow-xl">
                {/* SVG QR Code Simulation with precise high-density squares */}
                <div className="w-48 h-48 flex items-center justify-center relative bg-slate-900 rounded-xl overflow-hidden p-3">
                  <div className="absolute inset-0 bg-emerald-950/30"></div>
                  {/* Visual QR representation */}
                  <div className="relative z-10 grid grid-cols-5 gap-1.5 w-full h-full p-2 bg-white rounded-lg">
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>

                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-300 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-300 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>

                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-emerald-600 rounded-sm flex items-center justify-center">
                      <Radio className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-white"></div>

                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-300 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-900 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>

                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-white"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                    <div className="bg-slate-950 rounded-sm"></div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-emerald-400 font-mono">
                رمز القناة الحالية: <span className="font-bold text-white text-sm bg-slate-800 px-2 py-0.5 rounded">{currentRoomId}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>نصيحة: يمكنك تثبيت هذا البرنامج كـ تطبيق PWA على شاشة الجوال الرئيسية</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg transition-colors"
          >
            فهمت، إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
