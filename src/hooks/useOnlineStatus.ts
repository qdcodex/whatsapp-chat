import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

interface OnlineUser {
  userId: string;
  timestamp: number;
  socketId?: string;
}

interface TypingData {
  userId: string;
  targetId?: string;
  groupId?: string;
  timestamp?: number;
}

interface UseOnlineStatusOptions {
  userId: string;
  workspaceId: string;
  enabled?: boolean;
}

export function useOnlineStatus({
  userId,
  workspaceId,
  enabled = true,
}: UseOnlineStatusOptions) {
  const { on, emit } = useSocket({ userId, workspaceId });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  // DM typing: key = userId who is typing
  const [dmTypingUsers, setDmTypingUsers] = useState<Set<string>>(new Set());
  // Group typing: key = `${groupId}:${userId}`
  const [groupTypingMap, setGroupTypingMap] = useState<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    if (!enabled || !userId || !workspaceId) return;

    // User came online
    const unsubOnline = on('user:online', (data: OnlineUser) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    // User went offline
    const unsubOffline = on('user:offline', (data: OnlineUser) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Typing start — split DM vs group
    const unsubTypingStart = on('user:typing-start', (data: TypingData) => {
      if (data.userId === userId) return; // Don't show own typing

      if (data.targetId) {
        // DM: only show if current user is the target
        if (data.targetId === userId) {
          setDmTypingUsers((prev) => new Set([...prev, data.userId]));
        }
      } else if (data.groupId) {
        // Group: add to group typing map
        setGroupTypingMap((prev) => {
          const next = new Map(prev);
          const groupSet = new Set(next.get(data.groupId!) || []);
          groupSet.add(data.userId);
          next.set(data.groupId!, groupSet);
          return next;
        });
      }
    });

    // Typing stop
    const unsubTypingStop = on('user:typing-stop', (data: TypingData) => {
      if (data.targetId) {
        setDmTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      } else if (data.groupId) {
        setGroupTypingMap((prev) => {
          const next = new Map(prev);
          const groupSet = new Set(next.get(data.groupId!) || []);
          groupSet.delete(data.userId);
          if (groupSet.size === 0) {
            next.delete(data.groupId!);
          } else {
            next.set(data.groupId!, groupSet);
          }
          return next;
        });
      }
    });

    // Handle the online-users list response
    const unsubOnlineUsers = on(
      'online-users',
      (data: { onlineUsers: string[]; timestamp: number }) => {
        setOnlineUsers(new Set(data.onlineUsers));
      }
    );

    // Request online users when socket first connects (handles async connection timing)
    const unsubConnected = on('connected', () => {
      emit('request:online-users');
    });

    // Also try immediately in case socket is already connected
    emit('request:online-users');

    return () => {
      unsubOnline();
      unsubOffline();
      unsubTypingStart();
      unsubTypingStop();
      unsubOnlineUsers();
      unsubConnected();
    };
  }, [enabled, userId, workspaceId, on, emit]);

  /** Is a given user currently online? */
  const isUserOnline = useCallback(
    (checkUserId: string) => onlineUsers.has(checkUserId),
    [onlineUsers]
  );

  /** Is a given user typing in a DM to the current user? */
  const isDMUserTyping = useCallback(
    (typingUserId: string) => dmTypingUsers.has(typingUserId),
    [dmTypingUsers]
  );

  /** Is anyone (besides current user) typing in a given group? */
  const isGroupTyping = useCallback(
    (groupId: string) => {
      const set = groupTypingMap.get(groupId);
      return !!(set && set.size > 0);
    },
    [groupTypingMap]
  );

  /** Get all user IDs typing in a given group (for display) */
  const getGroupTypingUsers = useCallback(
    (groupId: string): string[] => {
      return Array.from(groupTypingMap.get(groupId) || []);
    },
    [groupTypingMap]
  );

  return {
    onlineUsers,
    isUserOnline,
    isDMUserTyping,
    isGroupTyping,
    getGroupTypingUsers,
  };
}
