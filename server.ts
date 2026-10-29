import express, { Request, Response } from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '', `http://${host}`);
    if (url.pathname === '/api/ws' || url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // allow other handlers
    }
  } catch (err) {
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';
const SYSTEM_VERSION = '2.5.2';

app.use(express.json({ limit: '10mb' }));

interface ClientSession {
  ws?: WebSocket | null;
  sseRes?: Response | null;
  id: string;
  name: string;
  roomId: string;
  deviceType: 'mobile' | 'desktop';
  networkType: 'lan' | 'wan';
  joinedAt: number;
  isTalking: boolean;
  batteryLevel?: number;
  batteryCharging?: boolean;
  isDirector?: boolean;
  isStealth?: boolean;
  unlockedChannels?: Set<string>;
  lastActive: number;
}

interface ServerChannel {
  id: string;
  name: string;
  frequency: string;
  band: 'VHF' | 'UHF' | 'PMR';
  description: string;
  isEncrypted: boolean;
  pin?: string;
  creatorId?: string;
}

interface BannedEntry {
  id: string;
  name: string;
  bannedAt: number;
  bannedBy: string;
  roomId?: string;
  isGlobal: boolean;
  reason?: string;
}

const DEFAULT_CHANNELS: ServerChannel[] = [
  { id: 'general', name: 'القناة العامة', frequency: '145.500 MHz', band: 'VHF', description: 'تردد مفتوح لكافة المشتركين والنداء العام', isEncrypted: false },
  { id: 'operations', name: 'غرفة العمليات المشفرة', frequency: '144.800 MHz', band: 'VHF', description: 'تنسيق المهام العسكرية والحرجة (مشفرة)', isEncrypted: true, pin: '7788' },
  { id: 'field', name: 'المجموعة الميدانية (س)', frequency: '433.075 MHz', band: 'UHF', description: 'اتصال مشفر للمجموعة الميدانية س', isEncrypted: true, pin: '1122' },
  { id: 'security', name: 'مجموعة الطوارئ (ص)', frequency: '446.006 MHz', band: 'PMR', description: 'اتصال مشفر للمجموعة ص الخاصة', isEncrypted: true, pin: '3344' },
];

const channelsMap = new Map<string, ServerChannel>(DEFAULT_CHANNELS.map((ch) => [ch.id, ch]));
const clients = new Map<string, ClientSession>();
const roomFloors = new Map<string, string | null>();
const bannedUsersMap = new Map<string, BannedEntry>();

const SYSTEM_MASTER_KEY = process.env.MASTER_KEY || '9900';

function getLocalNetworkAddresses(): { name: string; address: string }[] {
  const interfaces = os.networkInterfaces();
  const addresses: { name: string; address: string }[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ name, address: net.address });
      }
    }
  }
  return addresses;
}

function sendToClient(client: ClientSession, message: any) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);

  if (client.ws && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(payload);
    } catch {}
  }

  if (client.sseRes && !client.sseRes.writableEnded) {
    try {
      client.sseRes.write(`data: ${payload}\n\n`);
    } catch {}
  }
}

// Broadcast Roster specifically to everyone in roomId
function broadcastRoster(roomId: string) {
  const activeSpeakerId = roomFloors.get(roomId) || null;
  const channel = channelsMap.get(roomId);

  const allRoomClients = Array.from(clients.values()).filter((c) => {
    if (c.roomId !== roomId) return false;
    const isWsActive = c.ws && c.ws.readyState === WebSocket.OPEN;
    const isSseActive = c.sseRes && !c.sseRes.writableEnded;
    return isWsActive || isSseActive;
  });

  for (const recipient of allRoomClients) {
    const isModerator = channel?.creatorId === recipient.id;

    const visibleUsers = allRoomClients
      .filter((c) => {
        if (!c.isStealth) return true;
        if (recipient.isDirector) return true;
        if (c.isTalking) return true;
        return false;
      })
      .map((c) => ({
        id: c.id,
        name: c.isDirector && (c.isTalking || recipient.isDirector) ? '⚡ مدير النظام' : c.name,
        deviceType: c.deviceType,
        networkType: c.networkType,
        isTalking: c.isTalking,
        isDirector: c.isDirector,
        isModerator: channel?.creatorId === c.id,
        isStealth: c.isStealth,
        batteryLevel: c.batteryLevel,
        batteryCharging: c.batteryCharging,
        joinedAt: c.joinedAt,
      }));

    sendToClient(recipient, {
      type: 'ROSTER_UPDATE',
      roomId,
      users: visibleUsers,
      activeSpeakerId,
      isModerator,
    });
  }
}

// Broadcast updated channel subscriber counts to connected clients according to permissions
function broadcastAllChannels() {
  const counts: Record<string, number> = {};
  for (const client of clients.values()) {
    const isWsActive = client.ws && client.ws.readyState === WebSocket.OPEN;
    const isSseActive = client.sseRes && !client.sseRes.writableEnded;
    if (isWsActive || isSseActive) {
      counts[client.roomId] = (counts[client.roomId] || 0) + 1;
    }
  }

  const allChannels = Array.from(channelsMap.values()).map((ch) => ({
    id: ch.id,
    name: ch.name,
    frequency: ch.frequency,
    band: ch.band,
    description: ch.description,
    isEncrypted: ch.isEncrypted,
    creatorId: ch.creatorId,
    activeCount: counts[ch.id] || 0,
  }));

  for (const client of clients.values()) {
    let clientChannels = allChannels;
    if (!client.isDirector) {
      // Regular users ONLY receive public channels + channels they have explicitly unlocked or created
      clientChannels = allChannels.filter(
        (ch) =>
          !ch.isEncrypted ||
          (client.unlockedChannels && client.unlockedChannels.has(ch.id)) ||
          (ch.creatorId && ch.creatorId === client.id)
      );
    }

    sendToClient(client, {
      type: 'CHANNELS_UPDATED',
      channels: clientChannels,
    });
  }
}

function broadcastToRoom(roomId: string, senderId: string | null, message: any, excludeSender = true) {
  for (const client of clients.values()) {
    if (client.roomId === roomId) {
      if (excludeSender && client.id === senderId) continue;
      sendToClient(client, message);
    }
  }
}

function checkBanned(clientId: string, roomId: string): BannedEntry | null {
  const ban = bannedUsersMap.get(clientId);
  if (!ban) return null;
  if (ban.isGlobal || ban.roomId === roomId) {
    return ban;
  }
  return null;
}

// Handle action from either WebSocket or HTTP REST fallback
function handleClientAction(data: any, clientId: string, currentRoom: string): { success: boolean; newRoom?: string } {
  const session = clients.get(clientId);
  const isDirector = session?.isDirector || data.masterKey === SYSTEM_MASTER_KEY;

  if (session) {
    session.lastActive = Date.now();
  }

  switch (data.type) {
    case 'JOIN': {
      const ban = checkBanned(clientId, data.roomId || currentRoom);
      if (ban && !isDirector) {
        if (session) {
          sendToClient(session, {
            type: 'BANNED_ENTRY_DENIED',
            reason: `تم حظرك من هذه المجموعة بواسطة: ${ban.bannedBy}`,
          });
        }
        return { success: false };
      }

      const clientSession = clients.get(clientId) || {
        id: clientId,
        name: isDirector ? '⚡ مدير النظام' : data.name || `مشترك ${clientId.slice(-3)}`,
        roomId: currentRoom,
        deviceType: data.deviceType || 'mobile',
        networkType: data.networkType || 'lan',
        joinedAt: Date.now(),
        isTalking: false,
        batteryLevel: data.batteryLevel,
        batteryCharging: data.batteryCharging,
        isDirector,
        isStealth: isDirector && data.stealthMode !== false,
        lastActive: Date.now(),
      };

      clientSession.isDirector = isDirector;
      clientSession.isStealth = isDirector && data.stealthMode !== false;
      clientSession.roomId = data.roomId || currentRoom;
      clients.set(clientId, clientSession);

      broadcastRoster(clientSession.roomId);
      broadcastAllChannels();

      if (!clientSession.isStealth) {
        broadcastToRoom(
          clientSession.roomId,
          clientId,
          {
            type: 'SYSTEM_NOTIFICATION',
            text: `📡 انضم ${clientSession.name} إلى المجموعة`,
            timestamp: Date.now(),
          },
          true
        );
      }

      sendToClient(clientSession, {
        type: 'SYSTEM_VERSION_SYNC',
        version: SYSTEM_VERSION,
      });

      return { success: true, newRoom: clientSession.roomId };
    }

    case 'AUTHENTICATE_DIRECTOR': {
      if (session) {
        const isValid = data.masterKey === SYSTEM_MASTER_KEY;
        session.isDirector = isValid;
        if (isValid) {
          session.isStealth = data.stealthMode !== false;
          sendToClient(session, {
            type: 'DIRECTOR_AUTHENTICATED',
            isDirector: true,
            stealthMode: session.isStealth,
          });
          broadcastRoster(session.roomId);
        } else {
          sendToClient(session, {
            type: 'DIRECTOR_AUTHENTICATED',
            isDirector: false,
            error: 'رمز المفتاح الرئيسي غير صحيح',
          });
        }
      }
      return { success: true };
    }

    case 'TOGGLE_STEALTH': {
      if (session && session.isDirector) {
        session.isStealth = !!data.stealth;
        broadcastRoster(session.roomId);
      }
      return { success: true };
    }

    // Dynamic Room Switch with immediate exit and enter broadcasts
    case 'CHANGE_ROOM': {
      if (!session) return { success: false };

      const oldRoom = session.roomId || currentRoom;
      const targetRoomId = data.roomId || 'general';
      const targetChannel = channelsMap.get(targetRoomId);

      // If already in target room, just refresh roster
      if (oldRoom === targetRoomId) {
        broadcastRoster(targetRoomId);
        return { success: true, newRoom: targetRoomId };
      }

      // Ban check
      const ban = checkBanned(clientId, targetRoomId);
      if (ban && !isDirector) {
        sendToClient(session, {
          type: 'BANNED_ENTRY_DENIED',
          reason: `أنت محظور من دخول هذه المجموعة بواسطة: ${ban.bannedBy}`,
        });
        return { success: false };
      }

      // Encryption security check
      if (targetChannel && targetChannel.isEncrypted) {
        const isMaster = isDirector;
        const isPinCorrect = data.pin && data.pin === targetChannel.pin;

        if (!isMaster && !isPinCorrect) {
          sendToClient(session, {
            type: 'CHANNEL_ACCESS_DENIED',
            roomId: targetRoomId,
            reason: 'رمز المرور غير صحيح لهذه المجموعة المشفرة',
          });
          return { success: false };
        }
      }

      // 1. Notify members in the old room that this user has left!
      if (!session.isStealth) {
        broadcastToRoom(
          oldRoom,
          clientId,
          {
            type: 'SYSTEM_NOTIFICATION',
            text: `🚪 غادر ${session.name} المجموعة`,
            timestamp: Date.now(),
          },
          true
        );
      }

      // 2. Release floor in old room if user was speaking
      if (roomFloors.get(oldRoom) === clientId) {
        roomFloors.set(oldRoom, null);
        broadcastToRoom(
          oldRoom,
          clientId,
          {
            type: 'SPEAKER_STOPPED',
            speakerId: clientId,
            timestamp: Date.now(),
          },
          true
        );
      }

      // 3. Move session room
      session.roomId = targetRoomId;
      session.isTalking = false;

      // 4. Confirm to user that access is granted
      sendToClient(session, {
        type: 'CHANNEL_ACCESS_GRANTED',
        roomId: targetRoomId,
        channelName: targetChannel?.name || targetRoomId,
      });

      sendToClient(session, {
        type: 'SYSTEM_NOTIFICATION',
        text: `📡 تم تحويل التردد بنجاح إلى: ${targetChannel?.name || targetRoomId}`,
        timestamp: Date.now(),
      });

      // 5. Notify members in new room that this user joined!
      if (!session.isStealth) {
        broadcastToRoom(
          targetRoomId,
          clientId,
          {
            type: 'SYSTEM_NOTIFICATION',
            text: `📡 انضم ${session.name} إلى المجموعة`,
            timestamp: Date.now(),
          },
          true
        );
      }

      // 6. Refresh rosters in both rooms immediately!
      broadcastRoster(oldRoom);
      broadcastRoster(targetRoomId);

      // 7. Update all channel counts across all clients
      broadcastAllChannels();

      return { success: true, newRoom: targetRoomId };
    }

    // Moderation: KICK a user
    case 'KICK_USER': {
      const channel = channelsMap.get(currentRoom);
      const isModerator = channel?.creatorId === clientId;

      if (!isDirector && !isModerator) {
        if (session) {
          sendToClient(session, {
            type: 'ERROR_NOTIFICATION',
            text: 'صلاحية الطرد محصورة بمشرف المجموعة أو مدير النظام فقط',
          });
        }
        return { success: false };
      }

      const targetId = data.targetId;
      const target = clients.get(targetId);
      if (target) {
        const oldRoom = target.roomId;
        target.roomId = 'general';
        target.isTalking = false;
        if (roomFloors.get(oldRoom) === targetId) {
          roomFloors.set(oldRoom, null);
        }

        sendToClient(target, {
          type: 'YOU_WERE_KICKED',
          by: session?.name || 'المشرف',
          roomName: channel?.name || 'المجموعة',
        });

        broadcastToRoom(
          oldRoom,
          null,
          {
            type: 'SYSTEM_NOTIFICATION',
            text: `⚠️ تم إخراج (${target.name}) من القناة بواسطة ${isDirector ? 'مدير النظام' : 'مشرف المجموعة'}`,
            timestamp: Date.now(),
          },
          false
        );

        broadcastRoster(oldRoom);
        broadcastRoster('general');
        broadcastAllChannels();
      }
      return { success: true };
    }

    // Moderation: BAN a user
    case 'BAN_USER': {
      const channel = channelsMap.get(currentRoom);
      const isModerator = channel?.creatorId === clientId;

      if (!isDirector && !isModerator) {
        if (session) {
          sendToClient(session, {
            type: 'ERROR_NOTIFICATION',
            text: 'صلاحية الحظر محصورة بمشرف المجموعة أو مدير النظام فقط',
          });
        }
        return { success: false };
      }

      const targetId = data.targetId;
      const targetName = data.targetName || 'مشترك';
      const isGlobal = isDirector && !!data.isGlobal;

      const banEntry: BannedEntry = {
        id: targetId,
        name: targetName,
        bannedAt: Date.now(),
        bannedBy: isDirector ? '⚡ مدير النظام' : session?.name || 'مشرف المجموعة',
        roomId: isGlobal ? undefined : currentRoom,
        isGlobal,
        reason: data.reason || 'مخالفة تعليمات الاتصال اللاسلكي',
      };

      bannedUsersMap.set(targetId, banEntry);

      const target = clients.get(targetId);
      if (target) {
        const oldRoom = target.roomId;
        target.roomId = 'general';
        target.isTalking = false;
        if (roomFloors.get(oldRoom) === targetId) {
          roomFloors.set(oldRoom, null);
        }

        sendToClient(target, {
          type: 'YOU_WERE_BANNED',
          by: banEntry.bannedBy,
          reason: banEntry.reason,
        });

        broadcastToRoom(
          oldRoom,
          null,
          {
            type: 'SYSTEM_NOTIFICATION',
            text: `🚫 تم حظر (${targetName}) من دخول المجموعة بواسطة ${banEntry.bannedBy}`,
            timestamp: Date.now(),
          },
          false
        );

        broadcastRoster(oldRoom);
        broadcastRoster('general');
        broadcastAllChannels();
      }

      if (session) {
        sendToClient(session, {
          type: 'BANNED_LIST_UPDATED',
          bannedList: Array.from(bannedUsersMap.values()),
        });
      }

      return { success: true };
    }

    // Moderation: UNBAN a user
    case 'UNBAN_USER': {
      const channel = channelsMap.get(currentRoom);
      const isModerator = channel?.creatorId === clientId;

      if (!isDirector && !isModerator) {
        return { success: false };
      }

      const targetId = data.targetId;
      const ban = bannedUsersMap.get(targetId);
      if (ban) {
        bannedUsersMap.delete(targetId);

        broadcastToRoom(
          currentRoom,
          null,
          {
            type: 'SYSTEM_NOTIFICATION',
            text: `✅ تم فك الحظر عن (${ban.name}) بنجاح ويمكنه الدخول الآن`,
            timestamp: Date.now(),
          },
          false
        );

        if (session) {
          sendToClient(session, {
            type: 'BANNED_LIST_UPDATED',
            bannedList: Array.from(bannedUsersMap.values()),
          });
        }
      }
      return { success: true };
    }

    case 'GET_BANNED_LIST': {
      if (session && (isDirector || channelsMap.get(currentRoom)?.creatorId === clientId)) {
        sendToClient(session, {
          type: 'BANNED_LIST_UPDATED',
          bannedList: Array.from(bannedUsersMap.values()),
        });
      }
      return { success: true };
    }

    // Unlock channel directly by entering its PIN or Master Key
    case 'UNLOCK_CHANNEL_BY_PIN': {
      if (!session) return { success: false };
      const rawPin = String(data.pin || '').trim();

      // 1. Check Master Key (Director)
      if (rawPin === SYSTEM_MASTER_KEY) {
        session.isDirector = true;
        session.isStealth = data.stealthMode !== false;
        sendToClient(session, {
          type: 'DIRECTOR_AUTHENTICATED',
          isDirector: true,
          stealthMode: session.isStealth,
        });
        sendToClient(session, {
          type: 'CHANNEL_UNLOCK_SUCCESS',
          message: '⚡ مرحباً مدير النظام: تم تفعيل الصلاحيات الكاملة وإظهار كافة المجموعات المشفرة',
          isDirector: true,
        });
        broadcastAllChannels();
        broadcastRoster(session.roomId);
        return { success: true };
      }

      // 2. Check encrypted channels matching PIN
      let foundChannel: ServerChannel | undefined;
      for (const ch of channelsMap.values()) {
        if (ch.isEncrypted && ch.pin && ch.pin === rawPin) {
          foundChannel = ch;
          break;
        }
      }

      if (foundChannel) {
        if (!session.unlockedChannels) {
          session.unlockedChannels = new Set();
        }
        session.unlockedChannels.add(foundChannel.id);

        const oldRoom = session.roomId;
        const targetRoomId = foundChannel.id;

        // Perform smooth room switch
        if (oldRoom !== targetRoomId) {
          if (!session.isStealth) {
            broadcastToRoom(
              oldRoom,
              clientId,
              {
                type: 'SYSTEM_NOTIFICATION',
                text: `🚪 غادر ${session.name} المجموعة`,
                timestamp: Date.now(),
              },
              true
            );
          }

          if (roomFloors.get(oldRoom) === clientId) {
            roomFloors.set(oldRoom, null);
            broadcastToRoom(
              oldRoom,
              clientId,
              {
                type: 'SPEAKER_STOPPED',
                speakerId: clientId,
                timestamp: Date.now(),
              },
              true
            );
          }

          session.roomId = targetRoomId;
          session.isTalking = false;

          if (!session.isStealth) {
            broadcastToRoom(
              targetRoomId,
              clientId,
              {
                type: 'SYSTEM_NOTIFICATION',
                text: `📡 انضم ${session.name} إلى المجموعة`,
                timestamp: Date.now(),
              },
              true
            );
          }

          broadcastRoster(oldRoom);
          broadcastRoster(targetRoomId);
        }

        sendToClient(session, {
          type: 'CHANNEL_UNLOCK_SUCCESS',
          channel: {
            id: foundChannel.id,
            name: foundChannel.name,
            frequency: foundChannel.frequency,
            band: foundChannel.band,
            description: foundChannel.description,
            isEncrypted: foundChannel.isEncrypted,
          },
          message: `🔓 تم فك تشفير والاتصال بـ: ${foundChannel.name}`,
        });

        broadcastAllChannels();
        return { success: true, newRoom: targetRoomId };
      } else {
        sendToClient(session, {
          type: 'CHANNEL_UNLOCK_FAILED',
          reason: 'رمز التردد غير صحيح أو غير مسجل. تظل المجموعات المشفرة معزولة تماماً.',
        });
        return { success: false };
      }
    }

    // Group Creator: Any user can create their own private encrypted group
    case 'CREATE_ENCRYPTED_CHANNEL': {
      if (!session) return { success: false };
      const name = (data.name || '').trim();
      const pin = (data.pin || '').trim();
      if (!name || !pin) {
        sendToClient(session, {
          type: 'ERROR_NOTIFICATION',
          text: 'يرجى إدخال اسم المجموعة ورمز المرور (PIN)',
        });
        return { success: false };
      }

      const newId = `grp_${name.toLowerCase().replace(/[\s\W]+/g, '_')}_${Math.random().toString(36).substring(2, 6)}`;
      const randomFreq = (430 + Math.random() * 20).toFixed(3);
      const newChan: ServerChannel = {
        id: newId,
        name,
        frequency: `${randomFreq} MHz`,
        band: 'UHF',
        description: data.description || 'مجموعة خاصة تكتيكية',
        isEncrypted: true,
        pin,
        creatorId: clientId,
      };

      channelsMap.set(newId, newChan);

      if (!session.unlockedChannels) {
        session.unlockedChannels = new Set();
      }
      session.unlockedChannels.add(newId);

      // Automatically move creator into their new channel
      const oldRoom = session.roomId;
      if (oldRoom !== newId) {
        if (!session.isStealth) {
          broadcastToRoom(
            oldRoom,
            clientId,
            {
              type: 'SYSTEM_NOTIFICATION',
              text: `🚪 غادر ${session.name} المجموعة`,
              timestamp: Date.now(),
            },
            true
          );
        }
        if (roomFloors.get(oldRoom) === clientId) {
          roomFloors.set(oldRoom, null);
        }
        session.roomId = newId;
        session.isTalking = false;
        broadcastRoster(oldRoom);
        broadcastRoster(newId);
      }

      sendToClient(session, {
        type: 'CHANNEL_UNLOCK_SUCCESS',
        channel: {
          id: newChan.id,
          name: newChan.name,
          frequency: newChan.frequency,
          band: newChan.band,
          description: newChan.description,
          isEncrypted: newChan.isEncrypted,
        },
        message: `🛡 تم إنشاء (${newChan.name}) وتشفيرها برمز: [${pin}]. شارك هذا الرمز مع أعضاء مجموعتك للدخول المباشر.`,
      });

      broadcastAllChannels();
      return { success: true, newRoom: newId };
    }

    case 'TALK_REQUEST': {
      if (!session) return { success: false };

      const room = session.roomId;
      const currentFloor = roomFloors.get(room);

      if (session.isDirector) {
        if (currentFloor && currentFloor !== clientId) {
          const prevSpeaker = clients.get(currentFloor);
          if (prevSpeaker) {
            prevSpeaker.isTalking = false;
            sendToClient(prevSpeaker, { type: 'TALK_INTERRUPTED_BY_DIRECTOR' });
          }
        }
      } else if (currentFloor && currentFloor !== clientId) {
        sendToClient(session, {
          type: 'TALK_DENIED',
          reason: 'busy',
          activeSpeakerId: currentFloor,
        });
        return { success: false };
      }

      roomFloors.set(room, clientId);
      session.isTalking = true;

      sendToClient(session, { type: 'TALK_GRANTED', isDirector: session.isDirector });

      broadcastToRoom(
        room,
        clientId,
        {
          type: 'SPEAKER_STARTED',
          speakerId: clientId,
          speakerName: session.isDirector ? '⚡ مدير النظام (القيادة العليا)' : session.name,
          isDirector: session.isDirector,
          timestamp: Date.now(),
        },
        true
      );
      broadcastRoster(room);
      return { success: true };
    }

    case 'TALK_RELEASE': {
      if (session) {
        session.isTalking = false;
        const room = session.roomId;
        if (roomFloors.get(room) === clientId) {
          roomFloors.set(room, null);
        }
        sendToClient(session, { type: 'TALK_RELEASED', isDirector: session.isDirector });
        broadcastToRoom(
          room,
          clientId,
          {
            type: 'SPEAKER_STOPPED',
            speakerId: clientId,
            isDirector: session.isDirector,
            timestamp: Date.now(),
          },
          true
        );
        broadcastRoster(room);
      }
      return { success: true };
    }

    case 'AUDIO_DATA': {
      if (!session) return { success: false };

      broadcastToRoom(
        session.roomId,
        clientId,
        {
          type: 'AUDIO_STREAM',
          senderId: clientId,
          isDirector: session.isDirector,
          audio: data.audio,
          sampleRate: data.sampleRate || 16000,
          seq: data.seq,
        },
        true
      );
      return { success: true };
    }

    case 'TEXT_MESSAGE': {
      if (!session) return { success: false };
      broadcastToRoom(
        session.roomId,
        null,
        {
          type: 'TEXT_MESSAGE',
          id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: clientId,
          senderName: session.isDirector ? '⚡ مدير النظام' : session.name,
          isDirector: session.isDirector,
          text: data.text,
          urgency: session.isDirector ? 'priority' : data.urgency || 'normal',
          timestamp: Date.now(),
        },
        false
      );
      return { success: true };
    }

    case 'EMERGENCY_ALARM': {
      if (!session) return { success: false };
      broadcastToRoom(
        session.roomId,
        null,
        {
          type: 'EMERGENCY_ALARM',
          senderId: clientId,
          senderName: session.isDirector ? '⚡ مدير النظام' : session.name,
          isDirector: session.isDirector,
          timestamp: Date.now(),
        },
        false
      );
      return { success: true };
    }

    case 'UPDATE_STATUS': {
      if (session) {
        if (data.name && !session.isDirector) session.name = data.name;
        if (data.batteryLevel !== undefined) session.batteryLevel = data.batteryLevel;
        if (data.batteryCharging !== undefined) session.batteryCharging = data.batteryCharging;
        broadcastRoster(session.roomId);
      }
      return { success: true };
    }
  }

  return { success: true };
}

// WebSocket connection handling with heartbeat
wss.on('connection', (ws: WebSocket) => {
  let clientId = `user_${Math.random().toString(36).substring(2, 9)}`;
  let currentRoom = 'general';

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.id) clientId = data.id;
      if (data.roomId) currentRoom = data.roomId;

      let session = clients.get(clientId);
      if (!session) {
        session = {
          ws,
          id: clientId,
          name: data.name || `مشترك ${clientId.slice(-3)}`,
          roomId: currentRoom,
          deviceType: data.deviceType || 'mobile',
          networkType: data.networkType || 'lan',
          joinedAt: Date.now(),
          isTalking: false,
          batteryLevel: data.batteryLevel,
          batteryCharging: data.batteryCharging,
          lastActive: Date.now(),
        };
        clients.set(clientId, session);
      } else {
        if (session.ws && session.ws !== ws && session.ws.readyState === WebSocket.OPEN) {
          try {
            session.ws.terminate();
          } catch {}
        }
        session.ws = ws;
        session.lastActive = Date.now();
      }

      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', clientTime: data.clientTime, serverTime: Date.now(), version: SYSTEM_VERSION }));
        return;
      }

      const res = handleClientAction(data, clientId, currentRoom);
      if (res.newRoom) {
        currentRoom = res.newRoom;
      }
    } catch {}
  });

  ws.on('close', () => {
    const session = clients.get(clientId);
    if (session) {
      if (session.ws === ws) {
        session.ws = null;
      }
      if (!session.ws && !session.sseRes) {
        const room = session.roomId;
        if (roomFloors.get(room) === clientId) {
          roomFloors.set(room, null);
        }
        clients.delete(clientId);

        if (!session.isStealth) {
          broadcastToRoom(
            room,
            null,
            {
              type: 'SYSTEM_NOTIFICATION',
              text: `🚪 غادر ${session.name} المجموعة`,
              timestamp: Date.now(),
            },
            true
          );
        }

        broadcastRoster(room);
        broadcastAllChannels();
      }
    }
  });
});

// Periodic sweeper for dead/abandoned sessions (cleans up any zombie tabs every 15s)
setInterval(() => {
  const now = Date.now();
  let changed = false;

  for (const [id, session] of clients.entries()) {
    const isWsDead = !session.ws || session.ws.readyState !== WebSocket.OPEN;
    const isSseDead = !session.sseRes || session.sseRes.writableEnded;

    if (isWsDead && isSseDead) {
      const room = session.roomId;
      if (roomFloors.get(room) === id) {
        roomFloors.set(room, null);
      }
      clients.delete(id);
      changed = true;
      broadcastRoster(room);
    }
  }

  if (changed) {
    broadcastAllChannels();
  }
}, 15000);

// HTTP Real-Time Fallback via Server-Sent Events (SSE)
app.get('/api/radio/stream', (req: Request, res: Response) => {
  const clientId = (req.query.userId as string) || `user_${Math.random().toString(36).substring(2, 9)}`;
  const currentRoom = (req.query.roomId as string) || 'general';
  const name = (req.query.name as string) || `مشترك ${clientId.slice(-3)}`;
  const masterKey = req.query.masterKey as string;
  const isDirector = masterKey === SYSTEM_MASTER_KEY;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let session = clients.get(clientId);
  if (!session) {
    session = {
      sseRes: res,
      id: clientId,
      name: isDirector ? '⚡ مدير النظام' : name,
      roomId: currentRoom,
      deviceType: 'mobile',
      networkType: 'wan',
      joinedAt: Date.now(),
      isTalking: false,
      isDirector,
      isStealth: isDirector,
      lastActive: Date.now(),
    };
    clients.set(clientId, session);
  } else {
    session.sseRes = res;
    session.roomId = currentRoom;
    session.isDirector = isDirector;
    session.lastActive = Date.now();
  }

  res.write(
    `data: ${JSON.stringify({
      type: 'JOINED_SUCCESS',
      id: clientId,
      roomId: currentRoom,
      serverTime: Date.now(),
      isDirector,
      version: SYSTEM_VERSION,
      mode: 'sse',
    })}\n\n`
  );

  broadcastRoster(currentRoom);
  broadcastAllChannels();

  const pingInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': ping\n\n');
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    if (session) {
      session.sseRes = null;
      if (!session.ws || session.ws.readyState !== WebSocket.OPEN) {
        const room = session.roomId;
        if (roomFloors.get(room) === clientId) {
          roomFloors.set(room, null);
        }
        clients.delete(clientId);

        if (!session.isStealth) {
          broadcastToRoom(
            room,
            null,
            {
              type: 'SYSTEM_NOTIFICATION',
              text: `🚪 غادر ${session.name} المجموعة`,
              timestamp: Date.now(),
            },
            true
          );
        }

        broadcastRoster(room);
        broadcastAllChannels();
      }
    }
  });
});

app.post('/api/radio/action', (req: Request, res: Response) => {
  const { action, userId, roomId } = req.body;
  if (!action || !userId) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  const result = handleClientAction(action, userId, roomId || 'general');
  res.json({ success: result.success });
});

// API Info Endpoints
app.get('/api/network-info', (req: Request, res: Response) => {
  const localAddresses = getLocalNetworkAddresses();
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol;

  res.json({
    port: PORT,
    localAddresses,
    currentHost: host,
    protocol,
    appUrl: process.env.APP_URL || `${protocol}://${host}`,
    version: SYSTEM_VERSION,
    isProd,
    stats: {
      totalConnected: clients.size,
      activeChannels: Array.from(new Set(Array.from(clients.values()).map((c) => c.roomId))).length,
    },
  });
});

app.get('/api/channels', (req: Request, res: Response) => {
  const masterKey = req.query.masterKey as string;
  const userId = req.query.userId as string;
  const isMaster = masterKey === SYSTEM_MASTER_KEY;
  const session = userId ? clients.get(userId) : null;

  const counts: Record<string, number> = {};
  for (const client of clients.values()) {
    const isWsActive = client.ws && client.ws.readyState === WebSocket.OPEN;
    const isSseActive = client.sseRes && !client.sseRes.writableEnded;
    if (isWsActive || isSseActive) {
      counts[client.roomId] = (counts[client.roomId] || 0) + 1;
    }
  }

  let channelsList = Array.from(channelsMap.values()).map((ch) => ({
    id: ch.id,
    name: ch.name,
    frequency: ch.frequency,
    band: ch.band,
    description: ch.description,
    isEncrypted: ch.isEncrypted,
    creatorId: ch.creatorId,
    activeCount: counts[ch.id] || 0,
  }));

  if (!isMaster && !session?.isDirector) {
    channelsList = channelsList.filter(
      (ch) =>
        !ch.isEncrypted ||
        (session?.unlockedChannels && session.unlockedChannels.has(ch.id)) ||
        (ch.creatorId && session?.id && ch.creatorId === session.id)
    );
  }

  res.json({ channels: channelsList });
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`📡 Atheer Intercom Server running on http://0.0.0.0:${PORT} (v${SYSTEM_VERSION})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
