import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message } from '@/types';

interface MessageState {
  messages: Message[];
  sendMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  getMessagesByWorkspace: (workspaceId: string) => Message[];
  getBroadcastMessages: (workspaceId: string) => Message[];
  getDMMessages: (workspaceId: string, userId1: string, userId2: string) => Message[];
  getConversationPreview: (workspaceId: string, adminId: string, userId: string) => Message | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useMessageStore = create<MessageState>()(
  persist(
    (set, get) => ({
      messages: [],

      sendMessage: (msg) => {
        const newMsg: Message = {
          ...msg,
          id: generateId(),
          timestamp: Date.now(),
        };
        set((state) => ({ messages: [...state.messages, newMsg] }));
      },

      getMessagesByWorkspace: (workspaceId) => {
        return get()
          .messages.filter((m) => m.workspaceId === workspaceId)
          .sort((a, b) => a.timestamp - b.timestamp);
      },

      getBroadcastMessages: (workspaceId) => {
        return get()
          .messages.filter((m) => m.workspaceId === workspaceId && !m.recipientId)
          .sort((a, b) => a.timestamp - b.timestamp);
      },

      getDMMessages: (workspaceId, userId1, userId2) => {
        return get()
          .messages.filter(
            (m) =>
              m.workspaceId === workspaceId &&
              m.recipientId &&
              ((m.senderId === userId1 && m.recipientId === userId2) ||
                (m.senderId === userId2 && m.recipientId === userId1))
          )
          .sort((a, b) => a.timestamp - b.timestamp);
      },

      getConversationPreview: (workspaceId, adminId, userId) => {
        const msgs = get().messages.filter(
          (m) =>
            m.workspaceId === workspaceId &&
            m.recipientId &&
            ((m.senderId === adminId && m.recipientId === userId) ||
              (m.senderId === userId && m.recipientId === adminId))
        );
        return msgs.sort((a, b) => b.timestamp - a.timestamp)[0];
      },
    }),
    { name: 'broadcast-messages' }
  )
);
