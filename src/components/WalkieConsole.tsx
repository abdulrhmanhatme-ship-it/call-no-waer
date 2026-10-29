import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Activity,
  AlertTriangle,
  Lock,
  Unlock,
  Battery,
  BatteryCharging,
  Zap,
  Sliders,
  RotateCcw,
  Signal
} from 'lucide-react';
import { RadioSettings, Participant, Channel } from '../types/intercom';
import { playRadioSound } from '../utils/soundEffects';

interface WalkieConsoleProps {
  currentRoomId: string;
  currentChannel: Channel;
  isTransmitting: boolean;
  activeSpeaker: Participant | null;
  onStartTalk: () => void;
  onStopTalk: () => void;
  audioLevel: number; // 0 to 100
  settings: RadioSettings;
  onUpdateSettings: (newSettings: Partial<RadioSettings>) => void;
  batteryLevel: number;
  batteryCharging: boolean;
  onSendEmergencyAlarm: () => void;
  peerCount: number;
  connectionState: 'connected' | 'connecting' | 'disconnected';
  onReplayLastTransmission: () => boolean;
  hasRecordedTransmission: boolean;
  lastTransmissionInfo?: { senderName: string; timeAgo: string } | null;
  isDirector: boolean;
  onOpenDirectorModal: () => void;
  onUnlockChannelByPin?: (pin: string) => void;
}

export const WalkieConsole: React.FC<WalkieConsoleProps> = ({
  currentRoomId,
  currentChannel,
  isTransmitting,
  activeSpeaker,
  onStartTalk,
  onStopTalk,
  audioLevel,
  settings,
  onUpdateSettings,
  batteryLevel,
  batteryCharging,
  onSendEmergencyAlarm,
  peerCount,
  connectionState,
  onReplayLastTransmission,
  hasRecordedTransmission,
  lastTransmissionInfo,
  isDirector,
  onOpenDirectorModal,
  onUnlockChannelByPin,
}) => {
  const [isLockedOn, setIsLockedOn] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showQuickPinModal, setShowQuickPinModal] = useState(false);
  const [quickPinValue, setQuickPinValue] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  // Keyboard shortcut: Hold Spacebar to transmit
  useEffect(() => {
    let spacePressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat && !spacePressed) {
        e.preventDefault();
        spacePressed = true;
        if (settings.pttMode === 'toggle') {
          if (isTransmitting) {
            onStopTalk();
          } else {
            onStartTalk();
          }
        } else {
          onStartTalk();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spacePressed) {
        e.preventDefault();
        spacePressed = false;
        if (settings.pttMode === 'hold' && !isLockedOn) {
          onStopTalk();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings.pttMode, isTransmitting, isLockedOn, onStartTalk, onStopTalk]);

  // Touch and Mouse handlers for PTT
  const handlePttDown = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (activeSpeaker && !isTransmitting) {
      playRadioSound('busy');
      return;
    }

    if (settings.pttMode === 'toggle') {
      if (isTransmitting) {
        setIsLockedOn(false);
        onStopTalk();
      } else {
        setIsLockedOn(true);
        onStartTalk();
      }
    } else {
      onStartTalk();
    }
  };

  const handlePttUp = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (settings.pttMode === 'hold' && !isLockedOn) {
      onStopTalk();
    }
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTransmitting) {
      setIsLockedOn(!isLockedOn);
    } else {
      setIsLockedOn(true);
      onStartTalk();
    }
  };

  const handleReplayClick = () => {
    setIsReplaying(true);
    playRadioSound('squelch');
    onReplayLastTransmission();
    setTimeout(() => setIsReplaying(false), 2500);
  };

  const isChannelBusy = !!activeSpeaker && !isTransmitting;
  const batteryPct = Math.round(batteryLevel * 100);

  return (
    <div className="flex flex-col items-center justify-between h-full max-h-[calc(100dvh-130px)] sm:max-h-none sm:min-h-[580px] w-full max-w-lg mx-auto p-3 sm:p-5 bg-slate-900/95 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className={`absolute -top-20 -left-20 w-60 h-60 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          isTransmitting
            ? 'bg-emerald-500/20'
            : isChannelBusy
            ? 'bg-amber-500/20'
            : 'bg-slate-700/10'
        }`}
      />

      {/* Realistic Radio Top Header Bar */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2 z-10 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span className="font-bold text-white truncate max-w-[120px] sm:max-w-none">{currentChannel.name}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {currentChannel.frequency || '145.500 MHz'}
          </span>
        </div>

        {/* Battery, Director HUD & Settings */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Quick Secret PIN Unlock Button */}
          <button
            onClick={() => setShowQuickPinModal(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
            title="فك تشفير تردد مجموعة سرية"
          >
            <Lock className="w-2.5 h-2.5" />
            <span>رمز التردد</span>
          </button>

          {/* Director Master Status Button */}
          <button
            onClick={onOpenDirectorModal}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
              isDirector
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-amber-400'
            }`}
            title="لوحة تحكم مدير النظام والمجموعات المشفرة"
          >
            <span>{isDirector ? '⚡ القيادة' : '🔒 مفتاح المدير'}</span>
          </button>

          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px]"
            title="حالة شحن البطارية ونظام التوفير"
          >
            {batteryCharging ? (
              <BatteryCharging className="w-3 h-3 text-emerald-400" />
            ) : (
              <Battery className={`w-3 h-3 ${batteryPct < 20 ? 'text-rose-400' : 'text-slate-300'}`} />
            )}
            <span className="tabular-nums font-bold">{batteryPct}%</span>
          </div>

          <button
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="إعدادات اللاسلكي وحساسية الصوت"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realistic Walkie-Talkie LCD Screen Display */}
      <div className="w-full my-1.5 sm:my-2.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative shadow-inner shrink-0">
        {/* Top LCD Status Line */}
        <div className="w-full flex items-center justify-between text-[10px] text-slate-400 font-mono border-b border-slate-900 pb-1.5 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-emerald-400">
              <Signal className="w-2.5 h-2.5" />
              <span>S9+</span>
            </span>
            <span>·</span>
            <span>SQL-{settings.squelchLevel || 2}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isDirector && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                ADMIN
              </span>
            )}
            <span className="text-[9px] text-slate-500 font-bold uppercase">
              {settings.audioBitrate === 'low' ? '12k OPUS' : '24k OPUS'}
            </span>
            <span>·</span>
            <span className="text-[10px] text-slate-400">{peerCount} متصل</span>
          </div>
        </div>

        {/* Transmission Status Badge */}
        <div className="text-center my-0.5">
          {isTransmitting ? (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold animate-pulse shadow-md ${
                isDirector
                  ? 'bg-amber-500/30 border border-amber-400 text-amber-200 shadow-amber-500/20'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isDirector ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span>
                {isDirector
                  ? '⚡ بث القيادة العليا - مدير النظام (PRIORITY)'
                  : 'TX · جاري البث (أنت تتحدث)'}
              </span>
            </div>
          ) : isChannelBusy ? (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-md ${
                activeSpeaker?.isDirector
                  ? 'bg-amber-500/30 border border-amber-400 text-amber-200 shadow-amber-500/30 ring-2 ring-amber-500/20'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>
                {activeSpeaker?.isDirector
                  ? '⚡ بث القيادة العليا - مدير النظام يتحدث'
                  : `RX · استماع: ${activeSpeaker?.name}`}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>READY · التردد شاغر ومستعد</span>
            </div>
          )}
        </div>

        {/* Audio Frequency Equalizer Visualizer */}
        <div className="h-8 sm:h-10 flex items-center justify-center gap-1 w-full max-w-[240px] my-1">
          {[...Array(14)].map((_, i) => {
            const active = isTransmitting || isChannelBusy;
            const variance = Math.sin((i / 14) * Math.PI) * (audioLevel || 20);
            const height = active ? Math.max(6, Math.min(36, variance + (i % 3) * 5)) : 4;

            return (
              <div
                key={i}
                style={{ height: `${height}px` }}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isTransmitting
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : isChannelBusy
                    ? 'bg-amber-400 shadow-sm shadow-amber-400/50'
                    : 'bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {/* Instant Replay Banner if available */}
        {hasRecordedTransmission && (
          <div className="w-full flex items-center justify-between text-[10px] pt-1.5 mt-0.5 border-t border-slate-900">
            <span className="text-slate-400 truncate max-w-[140px]">
              آخر نداء: {lastTransmissionInfo?.senderName || 'مشترك'}
            </span>
            <button
              onClick={handleReplayClick}
              disabled={isTransmitting || isChannelBusy || isReplaying}
              className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded flex items-center gap-1 transition-colors disabled:opacity-40"
            >
              <RotateCcw className={`w-2.5 h-2.5 ${isReplaying ? 'animate-spin' : ''}`} />
              <span>{isReplaying ? 'جاري التشغيل...' : 'إعادة الاستماع'}</span>
            </button>
          </div>
        )}
      </div>

      {/* The Central Push-To-Talk Button (Thumb Zone Ergonomic) */}
      <div className="relative my-auto flex flex-col items-center justify-center shrink-0">
        {/* Outer Ripple Effect when transmitting */}
        {isTransmitting && (
          <div className="absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full bg-emerald-500/15 animate-ping pointer-events-none" />
        )}

        {/* Lock PTT Toggle indicator button */}
        <button
          onClick={toggleLock}
          className={`absolute -top-2 -right-2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center text-xs shadow-lg transition-all ${
            isLockedOn
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold scale-105'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title={isLockedOn ? 'فك القفل' : 'تثبيت التحدث المفتوح'}
        >
          {isLockedOn ? <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
        </button>

        {/* Large Tactile Two-Way Radio PTT Disc */}
        <button
          onMouseDown={handlePttDown}
          onMouseUp={handlePttUp}
          onTouchStart={handlePttDown}
          onTouchEnd={handlePttUp}
          disabled={isChannelBusy}
          className={`touch-none-select w-36 h-36 xs:w-40 xs:h-40 sm:w-48 sm:h-48 rounded-full border-4 flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-150 transform active:scale-95 shadow-2xl ${
            isChannelBusy
              ? 'bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed'
              : isTransmitting
              ? 'bg-emerald-500 border-emerald-300 text-slate-950 shadow-emerald-500/40 scale-102 ring-6 sm:ring-8 ring-emerald-500/20'
              : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-white hover:border-slate-600 shadow-slate-950/60'
          }`}
        >
          {isTransmitting ? (
            <Mic className="w-10 h-10 sm:w-14 sm:h-14 animate-pulse" />
          ) : isChannelBusy ? (
            <MicOff className="w-10 h-10 sm:w-14 sm:h-14 opacity-40" />
          ) : (
            <Mic className="w-10 h-10 sm:w-14 sm:h-14 opacity-90" />
          )}

          <span className="text-sm sm:text-base font-bold mt-1.5 sm:mt-2">
            {isTransmitting
              ? 'تحدث الآن...'
              : isChannelBusy
              ? 'التردد مشغول'
              : 'اضغط للتحدث (PTT)'}
          </span>
          <span className="text-[10px] opacity-75 font-mono">
            {settings.pttMode === 'toggle' ? 'وضع النقرة (Toggle)' : 'استمر بالضغط (Hold)'}
          </span>
        </button>

        {/* Keyboard hint (hidden on mobile, visible on desktop) */}
        <div className="hidden sm:flex text-[11px] text-slate-400 mt-2 font-medium items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
            Space
          </kbd>
          <span>اضغط مفتاح المسافة للكمبيوتر أو المس الشاشة للجوال</span>
        </div>
      </div>

      {/* Bottom Controls Bar: Volume & SOS Alert */}
      <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-slate-800 z-10 shrink-0">
        {/* Speaker Volume Slider */}
        <div className="flex items-center gap-1.5 flex-1 max-w-[180px] sm:max-w-xs">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-[10px] text-slate-400 font-mono tabular-nums w-6">
            {isMuted ? '0%' : `${volume}%`}
          </span>
        </div>

        {/* SOS Emergency Alert */}
        <div>
          {showSosConfirm ? (
            <div className="flex items-center gap-1 bg-rose-950 border border-rose-500/50 p-1 rounded-lg">
              <button
                onClick={() => {
                  onSendEmergencyAlarm();
                  setShowSosConfirm(false);
                }}
                className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors"
              >
                تأكيد SOS!
              </button>
              <button
                onClick={() => setShowSosConfirm(false)}
                className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
              >
                إلغاء
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSosConfirm(true)}
              className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 rounded-lg flex items-center gap-1 transition-colors"
              title="إطلاق نداء استغاثة وطوارئ SOS"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>طوارئ SOS</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Drawer Slide-over */}
      {showSettingsDrawer && (
        <div className="absolute inset-0 bg-slate-900/98 backdrop-blur-md z-30 p-4 sm:p-5 flex flex-col justify-between rounded-2xl sm:rounded-3xl animate-in fade-in duration-150">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>إعدادات جهاز اللاسلكي والترددات</span>
              </h3>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                إغلاق
              </button>
            </div>

            <div className="space-y-3 mt-3 text-xs overflow-y-auto max-h-[380px] pr-1">
              {/* PTT Mode Switch */}
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-white">طريقة التحدث (PTT Mode)</div>
                  <div className="text-[10px] text-slate-400">استمرار بالضغط أو ضغطة واحدة للفتح والإغلاق</div>
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg">
                  <button
                    onClick={() => onUpdateSettings({ pttMode: 'hold' })}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      settings.pttMode === 'hold' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Hold
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ pttMode: 'toggle' })}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      settings.pttMode === 'toggle' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Toggle
                  </button>
                </div>
              </div>

              {/* Roger Beep Tone Selector */}
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-white">نغمة انتهاء البث (Roger Beep)</div>
                  <div className="text-[10px] text-slate-400">نغمة تنبيه المستمعين عند إفلات زر اللاسلكي</div>
                </div>
                <select
                  value={settings.rogerBeepType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    onUpdateSettings({ rogerBeepType: val, rogerBeep: val !== 'none' });
                    if (val === 'nasa') playRadioSound('roger_nasa');
                    else if (val === 'tactical') playRadioSound('roger_tactical');
                    else if (val === 'classic') playRadioSound('roger_classic');
                  }}
                  className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                >
                  <option value="tactical">تكتيكي عسكري</option>
                  <option value="nasa">ناسا الفضائي</option>
                  <option value="classic">كلاسيكي</option>
                  <option value="none">بدون نغمة</option>
                </select>
              </div>

              {/* Squelch Noise Tail */}
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-white">صوت شوشرة الهواء (Squelch)</div>
                  <div className="text-[10px] text-slate-400">محاكاة نبرة الهواء في أجهزة اللاسلكي الحقيقية</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.squelchNoise}
                  onChange={(e) => {
                    onUpdateSettings({ squelchNoise: e.target.checked });
                    if (e.target.checked) playRadioSound('squelch');
                  }}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* Audio Bitrate Optimization */}
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-white">استهلاك المعالج والبطارية</div>
                  <div className="text-[10px] text-slate-400">12kbps يحفظ البطارية ويمنع سخونة الهاتف</div>
                </div>
                <select
                  value={settings.audioBitrate}
                  onChange={(e) => onUpdateSettings({ audioBitrate: e.target.value as any })}
                  className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs"
                >
                  <option value="low">فائق الخفة (12 kbps)</option>
                  <option value="balanced">متوازن (24 kbps)</option>
                  <option value="high">دقة عالية (36 kbps)</option>
                </select>
              </div>

              {/* Hardware Noise Cancellation */}
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-white">عزل الضوضاء والصدى</div>
                  <div className="text-[10px] text-slate-400">تصفية الهواء والضجيج المحيط</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => onUpdateSettings({ noiseSuppression: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSettingsDrawer(false)}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-colors text-xs mt-2"
          >
            حفظ وضبط
          </button>
        </div>
      )}

      {/* Quick PIN Modal for instant encrypted group entry */}
      {showQuickPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-xs w-full space-y-3 shadow-2xl">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">دخول تردد مشفر</h4>
                <p className="text-[10px] text-slate-400">أدخل رمز المجموعة السري (PIN)</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickPinValue.trim()) return;
                onUnlockChannelByPin?.(quickPinValue.trim());
                setQuickPinValue('');
                setShowQuickPinModal(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="رمز المرور (PIN)..."
                value={quickPinValue}
                onChange={(e) => setQuickPinValue(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:border-emerald-500"
                autoFocus
              />

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowQuickPinModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!quickPinValue.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-400 transition-colors disabled:opacity-40"
                >
                  اتصال مباشر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
