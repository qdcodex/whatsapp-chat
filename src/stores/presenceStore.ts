import { create } from 'zustand';
import { broadcastChannelSync } from '@/lib/broadcastChannelSync';

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
    broadcastChannelSync.onPresenceSync((event) => {
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

    return () => clearInterval(heartbeatInterval);
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
