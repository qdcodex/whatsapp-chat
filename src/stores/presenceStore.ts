import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const usePresenceStore = create<PresenceState>()(
  persist(
    (set, get) => ({
  onlineUsers: {},
  typingUsers: {},
  typingInDM: {},

  setOnline: (userId) =>
    set((s) => ({ onlineUsers: { ...s.onlineUsers, [userId]: Date.now() } })),

  setOffline: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.onlineUsers;
      return { onlineUsers: rest };
    }),

  isOnline: (userId) => {
    const ts = get().onlineUsers[userId];
    return !!ts && Date.now() - ts < 30000;
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
    return !!ts && Date.now() - ts < 3000;
  },

  setTypingDM: (userId, targetId) =>
    set((s) => ({ typingInDM: { ...s.typingInDM, [`${userId}-${targetId}`]: Date.now() } })),

  clearTypingDM: (userId, targetId) =>
    set((s) => {
      const { [`${userId}-${targetId}`]: _, ...rest } = s.typingInDM;
      return { typingInDM: rest };
    }),

  isTypingDM: (userId, targetId) => {
    const ts = get().typingInDM[`${userId}-${targetId}`];
    return !!ts && Date.now() - ts < 3000;
  },
}),
    { name: 'broadcast-presence' }
  )
);
