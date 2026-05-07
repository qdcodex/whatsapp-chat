import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

interface OnlineUser {
  userId: string;
  timestamp: number;
  socketId?: string;
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
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    // Listen for user coming online
    const unsubOnline = on('user:online', (data: OnlineUser) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]));
    });

    // Listen for user going offline
    const unsubOffline = on('user:offline', (data: OnlineUser) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
    });

    // Listen for typing start
    const unsubTypingStart = on(
      'user:typing-start',
      (data: { userId: string; targetId?: string; groupId?: string }) => {
        setTypingUsers((prev) => new Set([...prev, data.userId]));
      }
    );

    // Listen for typing stop
    const unsubTypingStop = on(
      'user:typing-stop',
      (data: { userId: string; targetId?: string; groupId?: string }) => {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    );

    // Request current online users on mount
    emit('request:online-users');

    // Listen for online users list
    const unsubOnlineUsers = on(
      'online-users',
      (data: { onlineUsers: string[]; timestamp: number }) => {
        setOnlineUsers(new Set(data.onlineUsers));
      }
    );

    return () => {
      unsubOnline();
      unsubOffline();
      unsubTypingStart();
      unsubTypingStop();
      unsubOnlineUsers();
    };
  }, [enabled, on, emit]);

  const isUserOnline = useCallback(
    (checkUserId: string) => onlineUsers.has(checkUserId),
    [onlineUsers]
  );

  const isUserTyping = useCallback(
    (typingUserId: string) => typingUsers.has(typingUserId),
    [typingUsers]
  );

  return {
    onlineUsers,
    typingUsers,
    isUserOnline,
    isUserTyping,
  };
}
