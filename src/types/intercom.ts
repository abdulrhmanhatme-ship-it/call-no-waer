export interface Participant {
  id: string;
  name: string;
  callSign?: string;
  role?: 'admin' | 'moderator' | 'user';
  isDirector?: boolean;
  isModerator?: boolean;
  isStealth?: boolean;
  deviceType: 'mobile' | 'desktop';
  networkType: 'lan' | 'wan';
  isTalking: boolean;
  batteryLevel?: number; // 0.0 to 1.0
  batteryCharging?: boolean;
  joinedAt: number;
  latency?: number; // ms
  rssi?: number; // Signal strength in dBm (-30 to -95)
}

export interface Channel {
  id: string;
  name: string;
  frequency: string; // e.g., '144.800 MHz', '433.100 MHz'
  band: 'VHF' | 'UHF' | 'PMR';
  description: string;
  activeCount: number;
  isPrivate?: boolean;
  isEncrypted?: boolean;
  pin?: string;
  creatorId?: string; // The user who opened/created this group (Group Moderator)
}

export interface BannedUser {
  id: string;
  name: string;
  bannedAt: number;
  bannedBy: string;
  roomId?: string; // channel id or empty for global
  isGlobal: boolean;
}

export interface DispatchMessage {
  id: string;
  senderId: string;
  senderName: string;
  isDirector?: boolean;
  isModerator?: boolean;
  text: string;
  urgency: 'normal' | 'priority' | 'emergency';
  timestamp: number;
}

export interface RecordedTransmission {
  id: string;
  senderId: string;
  senderName: string;
  isDirector?: boolean;
  timestamp: number;
  durationMs: number;
  audioChunks: string[]; // base64 Opus chunks for instant replay
}

export interface NetworkInfo {
  port: number | string;
  localAddresses: { name: string; address: string }[];
  currentHost: string;
  protocol: string;
  appUrl: string;
  isProd: boolean;
  version: string;
  stats: {
    totalConnected: number;
    activeChannels: number;
  };
}

export interface RadioSettings {
  pttMode: 'hold' | 'toggle';
  rogerBeep: boolean;
  rogerBeepType: 'tactical' | 'nasa' | 'classic' | 'chirp' | 'none';
  squelchNoise: boolean;
  squelchLevel: number; // 1 to 5
  voxEnabled: boolean;
  voxSensitivity: number;
  audioBitrate: 'low' | 'balanced' | 'high';
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGain: boolean;
  hapticFeedback: boolean;
  powerSaverMode: boolean;
  autoReplayBuffer: boolean;
  directorMode: boolean;
  masterKey: string;
  stealthMonitor: boolean;
}
