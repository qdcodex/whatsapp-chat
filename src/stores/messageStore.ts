import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message } from '@/types';

interface MessageState {
  messages: Message[];
  sendMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void;
  getMessagesByWorkspace: (workspaceId: string) => Message[];
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
    }),
    { name: 'broadcast-messages' }
  )
);
