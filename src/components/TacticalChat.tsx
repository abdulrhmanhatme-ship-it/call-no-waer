import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertTriangle, MessageSquare, ShieldAlert, Sparkles, CheckCheck } from 'lucide-react';
import { DispatchMessage } from '../types/intercom';

interface TacticalChatProps {
  messages: DispatchMessage[];
  currentUserId: string;
  onSendMessage: (text: string, urgency: 'normal' | 'priority' | 'emergency') => void;
  currentChannelName: string;
}

export const TacticalChat: React.FC<TacticalChatProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  currentChannelName,
}) => {
  const [inputText, setInputText] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'priority' | 'emergency'>('normal');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), urgency);
    setInputText('');
    setUrgency('normal');
  };

  const quickBroadcasts = [
    'علم، جاري التنفيذ ✔',
    'الرجاء إخلاء القناة للضرورة ⚠️',
    'تم الوصول للموقع المحدد 📍',
    'هل تسمعونني بوضوح؟ 🎙',
    'كل شيء تحت السيطرة 👍',
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[580px] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white">الرسائل التكتيكية السريعة</span>
          <span className="text-xs text-slate-400 font-mono">({currentChannelName})</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">تحديث فوري عبر الشبكة</span>
      </div>

      {/* Quick message shortcuts bar */}
      <div className="p-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickBroadcasts.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(preset, 'normal')}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition-colors border border-slate-700/50"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 opacity-30 mb-2" />
            <span>لا توجد رسائل مكتوبة في هذه القناة حتى الآن.</span>
            <span className="text-[11px] text-slate-600 mt-1">الرسائل تظهر لجميع المشتركين على الواي فاي والإنترنت فوراً.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isEmergency = msg.urgency === 'emergency';
            const isSystem = msg.senderId === 'system';
            const isPriority = msg.urgency === 'priority';

            if (isSystem) {
              return (
                <div key={msg.id} className="w-full flex justify-center my-1.5 animate-in fade-in duration-200">
                  <div className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-emerald-400/90 font-mono flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{msg.text}</span>
                    <span className="text-slate-600 text-[9px]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                  <span className="font-semibold text-slate-300">{msg.senderName}</span>
                  <span>·</span>
                  <span className="font-mono text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-sm text-xs leading-relaxed ${
                    isEmergency
                      ? 'bg-rose-950/80 border border-rose-500 text-rose-100 shadow-md shadow-rose-950/30'
                      : isPriority
                      ? 'bg-amber-950/80 border border-amber-500 text-amber-100'
                      : isMe
                      ? 'bg-emerald-600 text-slate-950 font-medium rounded-tr-sm'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {isEmergency && (
                    <div className="flex items-center gap-1 font-bold text-rose-300 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>نداء طارئ عاجل:</span>
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-center gap-2">
          {/* Priority flag toggle */}
          <button
            type="button"
            onClick={() => {
              if (urgency === 'normal') setUrgency('priority');
              else if (urgency === 'priority') setUrgency('emergency');
              else setUrgency('normal');
            }}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-colors ${
              urgency === 'emergency'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : urgency === 'priority'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
            title="تحديد درجة الأهمية"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline text-[10px] font-bold">
              {urgency === 'emergency' ? 'طارئ' : urgency === 'priority' ? 'هام' : 'عادي'}
            </span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="اكتب نداء أو رسالة نصية سريعة..."
            className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
