import { create } from 'zustand';

interface PresenceState {
  onlineUsers: Record<string, number>; // userId -> lastHeartbeat timestamp
  typingUsers: Record<string, number>; // `${userId}-${workspaceId}` -> timestamp
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  isOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => number | undefined;
  setTyping: (userId: string, workspaceId: string) => void;
  clearTyping: (userId: string, workspaceId: string) => void;
  isTyping: (userId: string, workspaceId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  onlineUsers: {},
  typingUsers: {},

  setOnline: (userId) =>
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [userId]: Date.now() } })),

  setOffline: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.onlineUsers;
      return { onlineUsers: rest };
    }),

  isOnline: (userId) => {
    const ts = get().onlineUsers[userId];
    return !!ts && Date.now() - ts < 30000; // 30s heartbeat window
  },

  getLastSeen: (userId) => get().onlineUsers[userId],

  setTyping: (userId, workspaceId) =>
    set((s) => ({ typingUsers: { ...s.typingUsers, [`${userId}-${workspaceId}`]: Date.now() } })),

  clearTyping: (userId, workspaceId) =>
    set((s) => {
      const { [`${userId}-${workspaceId}`]: _, ...rest } = s.typingUsers;
      return { typingUsers: rest };
    }),

  isTyping: (userId, workspaceId) => {
    const ts = get().typingUsers[`${userId}-${workspaceId}`];
    return !!ts && Date.now() - ts < 3000; // 3s typing window
  },
}));
