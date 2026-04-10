import { create } from 'zustand';
import type { Message, MessageStatus } from '@/types';

const isNotExpired = (timestamp: number, days: number) =>
  Date.now() - timestamp < days * 24 * 60 * 60 * 1000;

const isVisibleTo = (msg: Message, userId?: string) => {
  if (msg.deletedForEveryone) return false;
  if (userId && msg.deletedFor?.includes(userId)) return false;
  return true;
};

interface MessageState {
  messages: Message[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  sendMessage: (msg: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
  deleteMessage: (messageId: string, userId: string, mode: 'for_me' | 'for_everyone') => void;
  getMessagesByWorkspace: (workspaceId: string) => Message[];
  getBroadcastMessages: (workspaceId: string, autoDeleteDays?: number) => Message[];
  getDMMessages: (workspaceId: string, userId1: string, userId2: string, currentUserId?: string, autoDeleteDays?: number) => Message[];
  getGroupMessages: (groupId: string, currentUserId?: string, autoDeleteDays?: number) => Message[];
  getConversationPreview: (workspaceId: string, adminId: string, userId: string) => Message | undefined;
  markAsDelivered: (messageIds: string[]) => void;
  markAsRead: (messageIds: string[]) => void;
  getUnreadCount: (workspaceId: string, userId: string) => number;
  getUnreadDMCount: (workspaceId: string, currentUserId: string, otherUserId: string) => number;
  getUnreadGroupCount: (groupId: string, currentUserId: string) => number;
  getUnreadBroadcastCount: (workspaceId: string, currentUserId: string) => number;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useMessageStore = create<MessageState>()((set, get) => ({
  messages: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    const res = await fetch('/api/messages');
    const messages: Message[] = await res.json();
    set({ messages, isInitialized: true });
  },

  sendMessage: (msg) => {
    const newMsg: Message = { ...msg, id: generateId(), timestamp: Date.now(), status: 'sent' };
    set(s => ({ messages: [...s.messages, newMsg] }));

    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    });

    // Auto-deliver
    setTimeout(() => {
      set(s => ({
        messages: s.messages.map(m => m.id === newMsg.id && m.status === 'sent' ? { ...m, status: 'delivered' } : m),
      }));
      fetch(`/api/messages/${newMsg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      });
    }, 800);

    if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      const text = msg.text || (msg.audioUrl ? '🎤 Voice message' : msg.imageUrl ? '📷 Photo' : 'New message');
      new Notification('BroadcastHub', { body: text, icon: '/icon-192.png' });
    }
  },

  deleteMessage: (messageId, userId, mode) => {
    if (mode === 'for_everyone') {
      set(s => ({ messages: s.messages.map(m => m.id === messageId ? { ...m, deletedForEveryone: true } : m) }));
      fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedForEveryone: true }),
      });
    } else {
      set(s => ({
        messages: s.messages.map(m =>
          m.id === messageId ? { ...m, deletedFor: [...(m.deletedFor || []), userId] } : m
        ),
      }));
      fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ $push: { deletedFor: userId } }),
      });
    }
  },

  getMessagesByWorkspace: (workspaceId) =>
    get().messages.filter(m => m.workspaceId === workspaceId).sort((a, b) => a.timestamp - b.timestamp),

  getBroadcastMessages: (workspaceId, autoDeleteDays) =>
    get().messages.filter(m =>
      m.workspaceId === workspaceId && !m.recipientId && !m.groupId &&
      !m.deletedForEveryone && (!autoDeleteDays || isNotExpired(m.timestamp, autoDeleteDays))
    ).sort((a, b) => a.timestamp - b.timestamp),

  getDMMessages: (workspaceId, userId1, userId2, currentUserId, autoDeleteDays) =>
    get().messages.filter(m =>
      m.workspaceId === workspaceId && m.recipientId && !m.groupId &&
      ((m.senderId === userId1 && m.recipientId === userId2) ||
       (m.senderId === userId2 && m.recipientId === userId1)) &&
      isVisibleTo(m, currentUserId) && (!autoDeleteDays || isNotExpired(m.timestamp, autoDeleteDays))
    ).sort((a, b) => a.timestamp - b.timestamp),

  getGroupMessages: (groupId, currentUserId, autoDeleteDays) =>
    get().messages.filter(m =>
      m.groupId === groupId && isVisibleTo(m, currentUserId) &&
      (!autoDeleteDays || isNotExpired(m.timestamp, autoDeleteDays))
    ).sort((a, b) => a.timestamp - b.timestamp),

  getConversationPreview: (workspaceId, adminId, userId) => {
    const msgs = get().messages.filter(m =>
      m.workspaceId === workspaceId && m.recipientId && !m.groupId && !m.deletedForEveryone &&
      ((m.senderId === adminId && m.recipientId === userId) ||
       (m.senderId === userId && m.recipientId === adminId))
    );
    return msgs.sort((a, b) => b.timestamp - a.timestamp)[0];
  },

  markAsDelivered: (messageIds) => {
    set(s => ({ messages: s.messages.map(m => messageIds.includes(m.id) && m.status === 'sent' ? { ...m, status: 'delivered' as MessageStatus } : m) }));
  },

  markAsRead: (messageIds) => {
    set(s => ({ messages: s.messages.map(m => messageIds.includes(m.id) && m.status !== 'read' ? { ...m, status: 'read' as MessageStatus } : m) }));
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: messageIds }),
    });
  },

  getUnreadCount: (workspaceId, userId) =>
    get().messages.filter(m => m.workspaceId === workspaceId && m.recipientId === userId && m.status !== 'read' && !m.deletedForEveryone).length,

  getUnreadDMCount: (workspaceId, currentUserId, otherUserId) =>
    get().messages.filter(m =>
      m.workspaceId === workspaceId && m.recipientId && !m.groupId &&
      m.senderId === otherUserId && m.recipientId === currentUserId &&
      m.status !== 'read' && isVisibleTo(m, currentUserId)
    ).length,

  getUnreadGroupCount: (groupId, currentUserId) =>
    get().messages.filter(m => m.groupId === groupId && m.senderId !== currentUserId && m.status !== 'read' && isVisibleTo(m, currentUserId)).length,

  getUnreadBroadcastCount: (workspaceId, currentUserId) =>
    get().messages.filter(m =>
      m.workspaceId === workspaceId && !m.recipientId && !m.groupId &&
      m.senderId !== currentUserId && m.status !== 'read' && !m.deletedForEveryone
    ).length,
}));
