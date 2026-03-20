import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, MessageStatus } from '@/types';

interface MessageState {
  messages: Message[];
  sendMessage: (msg: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
  getMessagesByWorkspace: (workspaceId: string) => Message[];
  getBroadcastMessages: (workspaceId: string) => Message[];
  getDMMessages: (workspaceId: string, userId1: string, userId2: string) => Message[];
  getGroupMessages: (groupId: string) => Message[];
  getConversationPreview: (workspaceId: string, adminId: string, userId: string) => Message | undefined;
  markAsDelivered: (messageIds: string[]) => void;
  markAsRead: (messageIds: string[]) => void;
  getUnreadCount: (workspaceId: string, userId: string) => number;
  getUnreadDMCount: (workspaceId: string, currentUserId: string, otherUserId: string) => number;
  getUnreadGroupCount: (groupId: string, currentUserId: string) => number;
  getUnreadBroadcastCount: (workspaceId: string, currentUserId: string) => number;
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
          status: 'sent',
        };
        set((state) => ({ messages: [...state.messages, newMsg] }));

        // Auto-deliver after short delay
        setTimeout(() => {
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === newMsg.id && m.status === 'sent' ? { ...m, status: 'delivered' } : m
            ),
          }));
        }, 800);

        // Trigger browser notification
        if (typeof window !== 'undefined' && Notification.permission === 'granted') {
          const text = msg.text || (msg.audioUrl ? '🎤 Voice message' : msg.imageUrl ? '📷 Photo' : 'New message');
          new Notification('BroadcastHub', { body: text, icon: '/icon-192.png' });
        }
      },

      getMessagesByWorkspace: (workspaceId) =>
        get().messages.filter((m) => m.workspaceId === workspaceId).sort((a, b) => a.timestamp - b.timestamp),

      getBroadcastMessages: (workspaceId) =>
        get().messages.filter((m) => m.workspaceId === workspaceId && !m.recipientId && !m.groupId)
          .sort((a, b) => a.timestamp - b.timestamp),

      getDMMessages: (workspaceId, userId1, userId2) =>
        get().messages.filter(
          (m) =>
            m.workspaceId === workspaceId &&
            m.recipientId &&
            !m.groupId &&
            ((m.senderId === userId1 && m.recipientId === userId2) ||
              (m.senderId === userId2 && m.recipientId === userId1))
        ).sort((a, b) => a.timestamp - b.timestamp),

      getGroupMessages: (groupId) =>
        get().messages.filter((m) => m.groupId === groupId).sort((a, b) => a.timestamp - b.timestamp),

      getConversationPreview: (workspaceId, adminId, userId) => {
        const msgs = get().messages.filter(
          (m) =>
            m.workspaceId === workspaceId &&
            m.recipientId &&
            !m.groupId &&
            ((m.senderId === adminId && m.recipientId === userId) ||
              (m.senderId === userId && m.recipientId === adminId))
        );
        return msgs.sort((a, b) => b.timestamp - a.timestamp)[0];
      },

      markAsDelivered: (messageIds) => set((state) => ({
        messages: state.messages.map((m) =>
          messageIds.includes(m.id) && m.status === 'sent' ? { ...m, status: 'delivered' as MessageStatus } : m
        ),
      })),

      markAsRead: (messageIds) => set((state) => ({
        messages: state.messages.map((m) =>
          messageIds.includes(m.id) && m.status !== 'read' ? { ...m, status: 'read' as MessageStatus } : m
        ),
      })),

      getUnreadCount: (workspaceId, userId) =>
        get().messages.filter(
          (m) => m.workspaceId === workspaceId && m.recipientId === userId && m.status !== 'read'
        ).length,
    }),
    { name: 'broadcast-messages' }
  )
);
