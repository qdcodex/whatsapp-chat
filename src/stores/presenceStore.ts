import { create } from 'zustand';
import { broadcastChannelSync } from '@/lib/broadcastChannelSync';

// How often an open app checks in; isOnline() treats 45s without a check-in as offline
const PRESENCE_SYNC_MS = 20_000;

interface PresenceState {
  onlineUsers: Record<string, number>; // userId -> lastHeartbeat timestamp
  typingUsers: Record<string, number>; // `${userId}-${workspaceId}` -> timestamp
  typingInDM: Record<string, number>; // `${userId}-${targetId}` -> timestamp
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => number | undefined;
  setTyping: (userId: string, workspaceId: string) => void;
  clearTyping: (userId: string, workspaceId: string) => void;
  isTyping: (userId: string, workspaceId: string) => boolean;
  setTypingDM: (userId: string, targetId: string) => void;
  clearTypingDM: (userId: string, targetId: string) => void;
  isTypingDM: (userId: string, targetId: string) => boolean;
  initializeRealTime: (userId: string, workspaceId: string) => () => void;
  handleRemoteUserOnline: (data: { userId: string; timestamp: number }) => void;
  handleRemoteUserOffline: (data: { userId: string; timestamp: number }) => void;
  handleRemoteTypingStart: (data: { userId: string; targetId?: string; groupId?: string }) => void;
  handleRemoteTypingStop: (data: { userId: string; targetId?: string; groupId?: string }) => void;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  onlineUsers: {},
  typingUsers: {},
  typingInDM: {},

  setOnline: (userId) => {
    const timestamp = Date.now();
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [userId]: timestamp } }));
    broadcastChannelSync.broadcastPresence('update', {
      type: 'online',
      userId,
      timestamp,
    });
  },

  setOffline: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.onlineUsers;
      return { onlineUsers: rest };
    }),

  isOnline: (userId) => {
    const ts = get().onlineUsers[userId];
    return !!ts && Date.now() - ts < 45000;
  },

  getLastSeen: (userId) => get().onlineUsers[userId],

  setTyping: (userId, workspaceId) => {
    set((s) => ({ typingUsers: { ...s.typingUsers, [`${userId}-${workspaceId}`]: Date.now() } }));
    broadcastChannelSync.broadcastPresence('add', {
      type: 'typing-start',
      userId,
      groupId: workspaceId,
    });
  },

  clearTyping: (userId, workspaceId) => {
    set((s) => {
      const { [`${userId}-${workspaceId}`]: _, ...rest } = s.typingUsers;
      return { typingUsers: rest };
    });
    broadcastChannelSync.broadcastPresence('delete', {
      type: 'typing-stop',
      userId,
      groupId: workspaceId,
    });
  },

  isTyping: (userId, workspaceId) => {
    const ts = get().typingUsers[`${userId}-${workspaceId}`];
    return !!ts && Date.now() - ts < 3000;
  },

  setTypingDM: (userId, targetId) => {
    set((s) => ({ typingInDM: { ...s.typingInDM, [`${userId}-${targetId}`]: Date.now() } }));
    broadcastChannelSync.broadcastPresence('add', {
      type: 'typing-start',
      userId,
      targetId,
    });
  },

  clearTypingDM: (userId, targetId) => {
    set((s) => {
      const { [`${userId}-${targetId}`]: _, ...rest } = s.typingInDM;
      return { typingInDM: rest };
    });
    broadcastChannelSync.broadcastPresence('delete', {
      type: 'typing-stop',
      userId,
      targetId,
    });
  },

  isTypingDM: (userId, targetId) => {
    const ts = get().typingInDM[`${userId}-${targetId}`];
    return !!ts && Date.now() - ts < 3000;
  },

  initializeRealTime: (userId, workspaceId) => {
    broadcastChannelSync.initialize();

    // Set user as online immediately
    get().setOnline(userId);
    console.log('🟢 User set as online:', userId);

    // Keep user online with heartbeat every 15 seconds
    const heartbeatInterval = setInterval(() => {
      get().setOnline(userId);
      console.log('💓 Heartbeat - keeping user online:', userId);
      broadcastChannelSync.broadcastPresence('update', {
        type: 'online',
        userId,
        timestamp: Date.now()
      });
    }, 15000);

    // Listen for remote presence updates from other tabs
    const stopTabSync = broadcastChannelSync.onPresenceSync((event) => {
      if (event.action === 'add' || event.action === 'update') {
        if (event.data.type === 'online') {
          get().handleRemoteUserOnline(event.data);
        } else if (event.data.type === 'typing-start') {
          get().handleRemoteTypingStart(event.data);
        } else if (event.data.type === 'typing-stop') {
          get().handleRemoteTypingStop(event.data);
        }
      }
    });

    // Server check-in (works without the real-time server, e.g. on Vercel): while
    // the app is visible, say "I'm online" and fetch who else checked in recently.
    // A backgrounded app stops checking in, so it shows offline within ~45s.
    const syncWithServer = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await fetch('/api/presence', { method: 'POST' });
        const res = await fetch('/api/presence');
        if (!res.ok) return;
        const { serverNow, lastSeen } = (await res.json()) as { serverNow: number; lastSeen: Record<string, number> };
        const skew = Date.now() - serverNow; // convert server times to this device's clock
        set((s) => {
          const onlineUsers = { ...s.onlineUsers };
          for (const [id, ts] of Object.entries(lastSeen)) {
            const local = ts + skew;
            if (!onlineUsers[id] || onlineUsers[id] < local) onlineUsers[id] = local;
          }
          return { onlineUsers };
        });
      } catch { /* offline: try again next round */ }
    };
    syncWithServer();
    const serverSyncInterval = setInterval(syncWithServer, PRESENCE_SYNC_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') syncWithServer(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(serverSyncInterval);
      document.removeEventListener('visibilitychange', onVisible);
      stopTabSync();
    };
  },

  handleRemoteUserOnline: (data) => {
    set(s => ({ onlineUsers: { ...s.onlineUsers, [data.userId]: data.timestamp } }));
  },

  handleRemoteUserOffline: (data) => {
    set(s => {
      const { [data.userId]: _, ...rest } = s.onlineUsers;
      return { onlineUsers: rest };
    });
  },

  handleRemoteTypingStart: (data) => {
    set(s => {
      if (data.targetId) {
        return { typingInDM: { ...s.typingInDM, [`${data.userId}-${data.targetId}`]: Date.now() } };
      } else if (data.groupId) {
        return { typingUsers: { ...s.typingUsers, [`${data.userId}-${data.groupId}`]: Date.now() } };
      }
      return s;
    });
  },

  handleRemoteTypingStop: (data) => {
    set(s => {
      if (data.targetId) {
        const { [`${data.userId}-${data.targetId}`]: _, ...rest } = s.typingInDM;
        return { typingInDM: rest };
      } else if (data.groupId) {
        const { [`${data.userId}-${data.groupId}`]: _, ...rest } = s.typingUsers;
        return { typingUsers: rest };
      }
      return s;
    });
  },
}));
