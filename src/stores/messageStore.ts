import { create } from 'zustand';
import type { Message, MessageStatus } from '@/types';
import { broadcastChannelSync } from '@/lib/broadcastChannelSync';
import { socketClient } from '@/lib/socketClient';

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
  refreshMessages: (workspaceId: string) => Promise<void>;
  initializeRealTime: (userId: string, workspaceId: string) => () => void;
  handleRemoteMessage: (message: Message) => void;
  handleRemoteStatusUpdate: (update: { messageId: string; status: MessageStatus }) => void;
  handleRemoteDelete: (data: { messageId: string; deletedForEveryone?: boolean; deletedFor?: string }) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useMessageStore = create<MessageState>()((set, get) => ({
  messages: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    const res = await fetch('/api/messages');
    if (!res.ok) return;
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
      // Update local state immediately
      set(s => ({
        messages: s.messages.map(m =>
          m.id === messageId ? { ...m, deletedForEveryone: true } : m
        ),
      }));
      // Persist to DB
      fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedForEveryone: true }),
      });
      // Broadcast via socket so ALL other users see it deleted instantly
      socketClient.emit('message:delete', {
        messageId,
        deletedForEveryone: true,
      });
      // Sync other tabs on same device
      broadcastChannelSync.broadcastMessage('delete', { messageId, deletedForEveryone: true });
    } else {
      // "Delete for me" — only this user's view, no socket broadcast needed
      set(s => ({
        messages: s.messages.map(m =>
          m.id === messageId
            ? { ...m, deletedFor: [...(m.deletedFor || []), userId] }
            : m
        ),
      }));
      fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedFor: userId }),
      });
      // Sync other tabs on same device
      broadcastChannelSync.broadcastMessage('delete', { messageId, deletedFor: userId });
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

  refreshMessages: async (workspaceId) => {
    const res = await fetch(`/api/messages?workspaceId=${workspaceId}`);
    if (!res.ok) return;
    const fresh: Message[] = await res.json();
    set(s => ({
      messages: [
        ...s.messages.filter(m => m.workspaceId !== workspaceId),
        ...fresh,
      ],
    }));
  },

  initializeRealTime: (userId, workspaceId) => {
    broadcastChannelSync.initialize();

    broadcastChannelSync.onMessageSync((event) => {
      if (event.action === 'add') {
        get().handleRemoteMessage(event.data);
      } else if (event.action === 'update') {
        get().handleRemoteStatusUpdate(event.data);
      } else if (event.action === 'delete') {
        get().handleRemoteDelete(event.data);
      }
    });

    // Listen for real-time delete from other users via socket
    socketClient.on('message:deleted', (data: { messageId: string; deletedForEveryone?: boolean; deletedFor?: string }) => {
      get().handleRemoteDelete(data);
    });

    // Listen for new messages from other users via socket
    socketClient.on('message:new', (data: Message) => {
      get().handleRemoteMessage(data);
    });

    // Only refresh on page visibility change, not constantly
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        get().refreshMessages(workspaceId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Manual refresh every 30 seconds (not 500ms!)
    const pollInterval = setInterval(() => {
      get().refreshMessages(workspaceId);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  },

  handleRemoteMessage: (message) => {
    set(s => {
      const exists = s.messages.find(m => m.id === message.id);
      if (exists) return s;
      return { messages: [...s.messages, message] };
    });
    broadcastChannelSync.broadcastMessage('add', message);
  },

  handleRemoteStatusUpdate: (update) => {
    set(s => ({
      messages: s.messages.map(m =>
        m.id === update.messageId ? { ...m, status: update.status } : m
      ),
    }));
    broadcastChannelSync.broadcastMessage('update', update);
  },

  handleRemoteDelete: (data) => {
    set(s => ({
      messages: s.messages.map(m => {
        if (m.id !== data.messageId) return m;
        if (data.deletedForEveryone) return { ...m, deletedForEveryone: true };
        if (data.deletedFor) return { ...m, deletedFor: [...(m.deletedFor || []), data.deletedFor] };
        return m;
      }),
    }));
    broadcastChannelSync.broadcastMessage('delete', data);
  },
}));
