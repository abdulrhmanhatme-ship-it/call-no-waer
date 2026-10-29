import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { WalkieConsole } from './components/WalkieConsole';
import { RosterList } from './components/RosterList';
import { ChannelSelector } from './components/ChannelSelector';
import { TacticalChat } from './components/TacticalChat';
import { NetworkDiscoveryModal } from './components/NetworkDiscoveryModal';
import { ShareModal } from './components/ShareModal';
import { DirectorAuthModal } from './components/DirectorAuthModal';
import { ModerationModal } from './components/ModerationModal';
import { AutoUpdater } from './components/AutoUpdater';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Participant, Channel, DispatchMessage, NetworkInfo, RadioSettings, BannedUser } from './types/intercom';
import { globalAudioEngine } from './utils/audioEngine';
import { playRadioSound } from './utils/soundEffects';
import { useBattery } from './hooks/useBattery';

const CLIENT_VERSION = '2.5.2';

const DEFAULT_SETTINGS: RadioSettings = {
  pttMode: 'hold',
  rogerBeep: true,
  rogerBeepType: 'tactical',
  squelchNoise: false,
  squelchLevel: 2,
  voxEnabled: false,
  voxSensitivity: 50,
  audioBitrate: 'low',
  noiseSuppression: true,
  echoCancellation: true,
  autoGain: true,
  hapticFeedback: true,
  powerSaverMode: true,
  autoReplayBuffer: true,
  directorMode: false,
  masterKey: '',
  stealthMonitor: true,
};

const DEFAULT_CHANNELS: Channel[] = [
  { id: 'general', name: 'التردد العام (مفتوح للجميع)', frequency: '145.500 MHz', band: 'VHF', description: 'تردد عام مفتوح للنداء الأولي وتجربة الجهاز', isEncrypted: false, activeCount: 0 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'console' | 'channels' | 'roster' | 'dispatch'>('console');
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [directorModalOpen, setDirectorModalOpen] = useState(false);
  const [moderationModalOpen, setModerationModalOpen] = useState(false);
  const [directorError, setDirectorError] = useState<string | null>(null);

  // Version sync
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  // Moderation / Banned list
  const [bannedList, setBannedList] = useState<BannedUser[]>([]);

  // User identity with tab isolation (each browser tab gets unique radio station ID)
  const [userId] = useState(() => {
    const sessionSaved = sessionStorage.getItem('atheer_tab_user_id');
    if (sessionSaved) return sessionSaved;
    const generated = `usr_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem('atheer_tab_user_id', generated);
    return generated;
  });

  // Director Master state
  const [isDirector, setIsDirector] = useState(() => {
    return localStorage.getItem('atheer_is_director') === 'true';
  });

  const [stealthMode, setStealthMode] = useState(() => {
    const saved = localStorage.getItem('atheer_stealth_mode');
    return saved !== null ? saved === 'true' : true;
  });

  const [masterKey, setMasterKey] = useState(() => {
    return localStorage.getItem('atheer_master_key') || '';
  });

  const [userName, setUserName] = useState(() => {
    if (localStorage.getItem('atheer_is_director') === 'true') {
      return '⚡ مدير النظام';
    }
    return localStorage.getItem('atheer_user_name') || `لاسلكي ${userId.slice(-4)}`;
  });

  // Current channel
  const [currentRoomId, setCurrentRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('channel') || 'general';
  });

  // System notification toast banner
  const [systemNotification, setSystemNotification] = useState<{ text: string; id: number } | null>(null);

  // Synchronized refs for connection stability (prevents reconnection storms during channel changes)
  const currentRoomIdRef = useRef(currentRoomId);
  const userNameRef = useRef(userName);
  const masterKeyRef = useRef(masterKey);
  const stealthModeRef = useRef(stealthMode);
  const isDirectorRef = useRef(isDirector);

  useEffect(() => { currentRoomIdRef.current = currentRoomId; }, [currentRoomId]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { masterKeyRef.current = masterKey; }, [masterKey]);
  useEffect(() => { stealthModeRef.current = stealthMode; }, [stealthMode]);
  useEffect(() => { isDirectorRef.current = isDirector; }, [isDirector]);

  // Auto-dismiss system notification
  useEffect(() => {
    if (!systemNotification) return;
    const timer = setTimeout(() => {
      setSystemNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [systemNotification]);

  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<DispatchMessage[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

  // Replay state
  const [hasRecordedTransmission, setHasRecordedTransmission] = useState(false);
  const [lastTransmissionInfo, setLastTransmissionInfo] = useState<{ senderName: string; timeAgo: string } | null>(null);

  // States
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [networkType, setNetworkType] = useState<'lan' | 'wan'>('lan');

  const battery = useBattery();
  const batteryRef = useRef(battery);
  useEffect(() => { batteryRef.current = battery; }, [battery]);

  const [settings, setSettings] = useState<RadioSettings>(() => {
    try {
      const saved = localStorage.getItem('atheer_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (newSettings: Partial<RadioSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('atheer_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const wsRef = useRef<WebSocket | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const deviceType: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';

  // Fetch server network info & channels
  const fetchNetworkInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
        if (data.version) {
          setServerVersion(data.version);
        }
      }
      const chanRes = await fetch('/api/channels');
      if (chanRes.ok) {
        const chanData = await chanRes.json();
        if (chanData.channels) {
          setChannels(chanData.channels);
        }
      }
    } catch {
      // quiet
    }
  }, []);

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  const triggerRogerBeep = useCallback(() => {
    if (!settings.rogerBeep || settings.rogerBeepType === 'none') return;
    if (settings.rogerBeepType === 'nasa') playRadioSound('roger_nasa');
    else if (settings.rogerBeepType === 'tactical') playRadioSound('roger_tactical');
    else if (settings.rogerBeepType === 'classic') playRadioSound('roger_classic');
  }, [settings.rogerBeep, settings.rogerBeepType]);

  const sendRadioAction = useCallback(
    async (action: any) => {
      const payload = {
        ...action,
        id: userId,
        roomId: currentRoomIdRef.current,
      };

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify(payload));
          return true;
        } catch {}
      }

      try {
        await fetch('/api/radio/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            roomId: currentRoomIdRef.current,
            action: payload,
          }),
        });
        return true;
      } catch {
        return false;
      }
    },
    [userId]
  );

  useEffect(() => {
    globalAudioEngine.setOnVolumeLevel((level) => {
      setAudioLevel(level);
    });

    globalAudioEngine.setOnAudioChunk((base64Data, seq) => {
      sendRadioAction({
        type: 'AUDIO_DATA',
        audio: base64Data,
        seq,
        sampleRate: 16000,
      });
    });
  }, [sendRadioAction]);

  const handleIncomingMessage = useCallback(
    (data: any) => {
      switch (data.type) {
        case 'ROSTER_UPDATE': {
          if (data.roomId === currentRoomIdRef.current) {
            setParticipants(data.users || []);
            setActiveSpeakerId(data.activeSpeakerId);
          }

          setChannels((prev) =>
            prev.map((ch) =>
              ch.id === data.roomId
                ? { ...ch, activeCount: (data.users || []).length }
                : ch
            )
          );
          break;
        }

        case 'SYSTEM_NOTIFICATION': {
          if (data.text) {
            setSystemNotification({ text: data.text, id: Date.now() });
            setMessages((prev) => [
              ...prev,
              {
                id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                senderId: 'system',
                senderName: '📡 إشعار النظام',
                text: data.text,
                urgency: 'normal',
                timestamp: data.timestamp || Date.now(),
              },
            ]);
            playRadioSound('click');
          }
          break;
        }

        case 'CHANNEL_ACCESS_GRANTED': {
          // Channel switch confirmed
          break;
        }

        case 'CHANNEL_UNLOCK_SUCCESS': {
          playRadioSound('chirp');
          if (data.message) {
            setSystemNotification({ text: data.message, id: Date.now() });
          }
          if (data.isDirector) {
            setIsDirector(true);
            setUserName('⚡ مدير النظام');
            localStorage.setItem('atheer_is_director', 'true');
          }
          if (data.channel) {
            setChannels((prev) => {
              if (prev.some((c) => c.id === data.channel.id)) return prev;
              return [...prev, data.channel];
            });
            setCurrentRoomId(data.channel.id);
            currentRoomIdRef.current = data.channel.id;
            setActiveTab('console');
          }
          break;
        }

        case 'CHANNEL_UNLOCK_FAILED': {
          playRadioSound('busy');
          setSystemNotification({ text: data.reason || 'رمز التردد غير صحيح', id: Date.now() });
          break;
        }

        case 'SYSTEM_VERSION_SYNC': {
          if (data.version) {
            setServerVersion(data.version);
          }
          break;
        }

        case 'TALK_GRANTED': {
          setIsTransmitting(true);
          if (data.isDirector) {
            playRadioSound('director_chime');
          } else {
            playRadioSound('chirp');
          }
          if (settings.hapticFeedback && 'vibrate' in navigator) {
            navigator.vibrate([40]);
          }
          break;
        }

        case 'TALK_DENIED': {
          setIsTransmitting(false);
          playRadioSound('busy');
          break;
        }

        case 'TALK_INTERRUPTED_BY_DIRECTOR': {
          setIsTransmitting(false);
          globalAudioEngine.stopRecording();
          playRadioSound('busy');
          break;
        }

        case 'TALK_RELEASED': {
          setIsTransmitting(false);
          triggerRogerBeep();
          break;
        }

        case 'SPEAKER_STARTED': {
          setActiveSpeakerId(data.speakerId);
          if (data.isDirector) {
            playRadioSound('director_chime');
          } else if (settings.squelchNoise) {
            playRadioSound('squelch');
          }
          setLastTransmissionInfo({
            senderName: data.speakerName || 'مشترك',
            timeAgo: 'الآن',
          });
          break;
        }

        case 'SPEAKER_STOPPED': {
          setActiveSpeakerId(null);
          triggerRogerBeep();
          globalAudioEngine.finishIncomingTransmission();
          setHasRecordedTransmission(globalAudioEngine.hasRecordedTransmission());
          break;
        }

        case 'AUDIO_STREAM': {
          if (data.audio) {
            globalAudioEngine.receiveAudioChunk(data.audio);
          }
          break;
        }

        case 'CHANNELS_UPDATED': {
          if (data.channels) {
            setChannels(data.channels);
          }
          break;
        }

        case 'BANNED_LIST_UPDATED': {
          if (data.bannedList) {
            setBannedList(data.bannedList);
          }
          break;
        }

        case 'YOU_WERE_KICKED': {
          playRadioSound('busy');
          setSystemNotification({
            text: `⚠️ تم إخراجك من قِبل ${data.by} وإعادتك للقناة العامة.`,
            id: Date.now(),
          });
          setCurrentRoomId('general');
          currentRoomIdRef.current = 'general';
          setActiveTab('console');
          break;
        }

        case 'YOU_WERE_BANNED': {
          playRadioSound('alarm');
          setSystemNotification({
            text: `🚫 تم حظرك من قِبل: ${data.by} (السبب: ${data.reason || 'مخالفة التعليمات'})`,
            id: Date.now(),
          });
          setCurrentRoomId('general');
          currentRoomIdRef.current = 'general';
          setActiveTab('console');
          break;
        }

        case 'BANNED_ENTRY_DENIED': {
          setSystemNotification({
            text: `🚫 ${data.reason || 'أنت محظور من دخول هذه القناة.'}`,
            id: Date.now(),
          });
          break;
        }

        case 'CHANNEL_ACCESS_DENIED': {
          setSystemNotification({
            text: `🔒 ${data.reason || 'رمز المرور غير صحيح'}`,
            id: Date.now(),
          });
          break;
        }

        case 'DIRECTOR_AUTHENTICATED': {
          if (data.isDirector) {
            setIsDirector(true);
            setUserName('⚡ مدير النظام');
            localStorage.setItem('atheer_is_director', 'true');
            setDirectorError(null);
          } else {
            setDirectorError(data.error || 'رمز المفتاح الرئيسي غير صحيح');
          }
          break;
        }

        case 'TEXT_MESSAGE': {
          setMessages((prev) => [...prev, data]);
          if (data.isDirector) {
            playRadioSound('director_chime');
          } else {
            playRadioSound('click');
          }
          break;
        }

        case 'EMERGENCY_ALARM': {
          playRadioSound('alarm');
          if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 500]);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: `alarm_${Date.now()}`,
              senderId: data.senderId,
              senderName: data.senderName,
              text: '🚨 إطلاق نداء استغاثة وطوارئ لاسلكي عاجل!',
              urgency: 'emergency',
              timestamp: data.timestamp,
            },
          ]);
          break;
        }
      }
    },
    [settings.hapticFeedback, settings.squelchNoise, triggerRogerBeep]
  );

  const connectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
    }

    const sseUrl = `/api/radio/stream?userId=${encodeURIComponent(userId)}&roomId=${encodeURIComponent(currentRoomIdRef.current)}&name=${encodeURIComponent(userNameRef.current)}&masterKey=${encodeURIComponent(masterKeyRef.current)}`;
    const sse = new EventSource(sseUrl);
    sseRef.current = sse;

    sse.onopen = () => {
      setConnectionState('connected');
    };

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
      } catch {}
    };

    sse.onerror = () => {};
  }, [userId, handleIncomingMessage]);

  const connectRadio = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionState('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        if (sseRef.current) {
          sseRef.current.close();
          sseRef.current = null;
        }

        ws.send(
          JSON.stringify({
            type: 'JOIN',
            id: userId,
            name: isDirectorRef.current ? '⚡ مدير النظام' : userNameRef.current,
            roomId: currentRoomIdRef.current,
            masterKey: masterKeyRef.current,
            stealthMode: stealthModeRef.current,
            deviceType,
            networkType,
            batteryLevel: batteryRef.current.level,
            batteryCharging: batteryRef.current.charging,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch {}
      };

      ws.onclose = () => {
        wsRef.current = null;
        connectSSE();
      };

      ws.onerror = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        connectSSE();
      };
    } catch {
      connectSSE();
    }
  }, [userId, deviceType, networkType, handleIncomingMessage, connectSSE]);

  useEffect(() => {
    connectRadio();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
      if (sseRef.current) sseRef.current.close();
    };
  }, [connectRadio]);

  const handleStartTalk = async () => {
    if (!isDirector && activeSpeakerId && activeSpeakerId !== userId) {
      playRadioSound('busy');
      return;
    }

    const success = await globalAudioEngine.startRecording(settings.audioBitrate);
    if (success) {
      sendRadioAction({ type: 'TALK_REQUEST' });
    }
  };

  const handleStopTalk = () => {
    globalAudioEngine.stopRecording();
    sendRadioAction({ type: 'TALK_RELEASE' });
    setIsTransmitting(false);
  };

  const handleReplayLastTransmission = () => {
    return globalAudioEngine.replayLastTransmission();
  };

  const handleSelectChannel = (channelId: string, pin?: string) => {
    if (isTransmitting) handleStopTalk();
    if (channelId === currentRoomId) {
      setActiveTab('console');
      return;
    }

    currentRoomIdRef.current = channelId;
    setCurrentRoomId(channelId);
    setActiveSpeakerId(null);

    // Immediately reflect the user in their new channel without showing old channel members
    setParticipants([
      {
        id: userId,
        name: isDirector ? '⚡ مدير النظام' : userName,
        deviceType,
        networkType,
        isTalking: false,
        isDirector,
        isModerator: false,
        batteryLevel: battery.level,
        batteryCharging: battery.charging,
        joinedAt: Date.now(),
      },
    ]);

    setMessages([]);

    const url = new URL(window.location.href);
    url.searchParams.set('channel', channelId);
    window.history.pushState({}, '', url.toString());

    sendRadioAction({
      type: 'CHANGE_ROOM',
      id: userId,
      roomId: channelId,
      pin,
      masterKey,
    });
    setActiveTab('console');
  };

  const handleAuthenticateDirector = (enteredKey: string) => {
    setMasterKey(enteredKey);
    localStorage.setItem('atheer_master_key', enteredKey);
    sendRadioAction({
      type: 'AUTHENTICATE_DIRECTOR',
      masterKey: enteredKey,
      stealthMode,
    });
  };

  const handleToggleStealth = (stealth: boolean) => {
    setStealthMode(stealth);
    localStorage.setItem('atheer_stealth_mode', String(stealth));
    sendRadioAction({
      type: 'TOGGLE_STEALTH',
      stealth,
    });
  };

  const handleCreateEncryptedChannel = (name: string, pin: string, description: string) => {
    sendRadioAction({
      type: 'CREATE_ENCRYPTED_CHANNEL',
      name,
      pin,
      description,
      masterKey,
    });
  };

  const handleUnlockChannelByPin = (pin: string) => {
    sendRadioAction({
      type: 'UNLOCK_CHANNEL_BY_PIN',
      pin,
    });
  };

  // Moderation Handlers: Kick, Ban, Unban
  const handleKickUser = (targetId: string) => {
    sendRadioAction({
      type: 'KICK_USER',
      targetId,
      masterKey,
    });
  };

  const handleBanUser = (targetId: string, targetName: string) => {
    sendRadioAction({
      type: 'BAN_USER',
      targetId,
      targetName,
      isGlobal: isDirector,
      masterKey,
    });
  };

  const handleUnbanUser = (targetId: string) => {
    sendRadioAction({
      type: 'UNBAN_USER',
      targetId,
      masterKey,
    });
  };

  const handleSendMessage = (text: string, urgency: 'normal' | 'priority' | 'emergency') => {
    sendRadioAction({
      type: 'TEXT_MESSAGE',
      text,
      urgency,
    });
  };

  const handleSendEmergencyAlarm = () => {
    sendRadioAction({
      type: 'EMERGENCY_ALARM',
    });
  };

  const handleUpdateMyName = (newName: string) => {
    if (isDirector) return;
    setUserName(newName);
    localStorage.setItem('atheer_user_name', newName);
    sendRadioAction({
      type: 'UPDATE_STATUS',
      name: newName,
    });
  };

  const currentChannel = channels.find((c) => c.id === currentRoomId) || {
    id: currentRoomId,
    name: currentRoomId,
    frequency: '145.500 MHz',
    band: 'VHF' as const,
    description: '',
    activeCount: participants.length,
  };

  const activeSpeaker = participants.find((p) => p.id === activeSpeakerId) || null;
  const canModerate = isDirector || currentChannel.creatorId === userId;

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 overflow-hidden select-none">
      {/* Automatic System Hot Updater */}
      <AutoUpdater
        currentClientVersion={CLIENT_VERSION}
        serverVersion={serverVersion}
      />

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onlineCount={participants.length}
        currentChannelName={currentChannel.name}
        channelFrequency={currentChannel.frequency}
        onOpenNetworkModal={() => setNetworkModalOpen(true)}
        onOpenShareModal={() => setShareModalOpen(true)}
      />

      {/* Floating System Notification Toast (Appears when someone leaves or joins or switches groups) */}
      {systemNotification && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm flex justify-center animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-2xl shadow-emerald-950/50 text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="truncate">{systemNotification.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 py-1.5 sm:py-3 flex flex-col justify-center overflow-y-auto pb-20 sm:pb-4">
        {activeTab === 'console' && (
          <WalkieConsole
            currentRoomId={currentRoomId}
            currentChannel={currentChannel}
            isTransmitting={isTransmitting}
            activeSpeaker={activeSpeaker}
            onStartTalk={handleStartTalk}
            onStopTalk={handleStopTalk}
            audioLevel={audioLevel}
            settings={settings}
            onUpdateSettings={updateSettings}
            batteryLevel={battery.level}
            batteryCharging={battery.charging}
            onSendEmergencyAlarm={handleSendEmergencyAlarm}
            peerCount={participants.length}
            connectionState={connectionState}
            onReplayLastTransmission={handleReplayLastTransmission}
            hasRecordedTransmission={hasRecordedTransmission}
            lastTransmissionInfo={lastTransmissionInfo}
            isDirector={isDirector}
            onOpenDirectorModal={() => setDirectorModalOpen(true)}
            onUnlockChannelByPin={handleUnlockChannelByPin}
          />
        )}

        {activeTab === 'channels' && (
          <ChannelSelector
            currentRoomId={currentRoomId}
            onSelectChannel={handleSelectChannel}
            channels={channels}
            isDirector={isDirector}
            onOpenDirectorModal={() => setDirectorModalOpen(true)}
            onUnlockChannelByPin={handleUnlockChannelByPin}
            onCreateEncryptedChannel={handleCreateEncryptedChannel}
          />
        )}

        {activeTab === 'roster' && (
          <RosterList
            participants={participants}
            currentUserId={userId}
            currentUserName={userName}
            onUpdateMyName={handleUpdateMyName}
            activeSpeakerId={activeSpeakerId}
            currentChannelName={currentChannel.name}
            canModerate={canModerate}
            isDirector={isDirector}
            onKickUser={handleKickUser}
            onBanUser={handleBanUser}
            onOpenModerationModal={() => {
              sendRadioAction({ type: 'GET_BANNED_LIST', masterKey });
              setModerationModalOpen(true);
            }}
          />
        )}

        {activeTab === 'dispatch' && (
          <TacticalChat
            messages={messages}
            currentUserId={userId}
            onSendMessage={handleSendMessage}
            currentChannelName={currentChannel.name}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onlineCount={participants.length}
        unreadCount={messages.length > 0 && activeTab !== 'dispatch' ? 1 : 0}
      />

      {/* Desktop Only Status Footer */}
      <footer className="hidden sm:flex border-t border-slate-900 bg-slate-950/80 py-2 px-4 text-xs text-slate-500 shrink-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>نظام أثير اللاسلكي المباشر (v{CLIENT_VERSION})</span>
            <span>·</span>
            <span>التردد: {currentChannel.frequency}</span>
            <span>·</span>
            {isDirector && <span className="text-amber-400 font-bold">⚡ وضع مدير النظام مفعل</span>}
          </div>
          <button
            onClick={() => setShareModalOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 font-bold"
          >
            إرسال ومشاركة الرابط للجوالات ↗
          </button>
        </div>
      </footer>

      {/* Director Master Key & Encrypted Group Modal */}
      <DirectorAuthModal
        isOpen={directorModalOpen}
        onClose={() => setDirectorModalOpen(false)}
        isDirector={isDirector}
        stealthMode={stealthMode}
        onAuthenticate={handleAuthenticateDirector}
        onToggleStealth={handleToggleStealth}
        onCreateEncryptedChannel={handleCreateEncryptedChannel}
        errorMessage={directorError}
      />

      {/* Moderation Banned List Modal */}
      <ModerationModal
        isOpen={moderationModalOpen}
        onClose={() => setModerationModalOpen(false)}
        bannedList={bannedList}
        onUnbanUser={handleUnbanUser}
        isDirector={isDirector}
        currentRoomName={currentChannel.name}
      />

      {/* Instant Share & Send Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        currentRoomId={currentRoomId}
        currentRoomName={currentChannel.name}
        channelFrequency={currentChannel.frequency}
      />

      {/* Network Explanation & Wi-Fi Guide Modal */}
      <NetworkDiscoveryModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
        networkInfo={networkInfo}
        currentRoomId={currentRoomId}
      />
    </div>
  );
}
