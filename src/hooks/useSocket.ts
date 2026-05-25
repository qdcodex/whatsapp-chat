import { useEffect, useCallback, useRef, useState } from 'react';
import { socketClient } from '@/lib/socketClient';

interface UseSocketOptions {
  userId: string;
  workspaceId: string;
}

export function useSocket({ userId, workspaceId }: UseSocketOptions) {
  const isConnectingRef = useRef(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    // Don't connect until we have both userId and workspaceId — avoids
    // spamming the server with empty-credential connections before login.
    if (!userId || !workspaceId) return;
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    socketClient.connect(userId, workspaceId);

    return () => {
      // Don't disconnect on unmount - keep the connection alive
    };
  }, [userId, workspaceId]);

  const on = useCallback((event: string, callback: Function) => {
    socketClient.on(event, callback);
    return () => socketClient.off(event, callback);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketClient.emit(event, data);
  }, []);

  const startTyping = useCallback((targetId?: string, groupId?: string) => {
    socketClient.startTyping(targetId, groupId);
  }, []);

  const stopTyping = useCallback((targetId?: string, groupId?: string) => {
    socketClient.stopTyping(targetId, groupId);
  }, []);

  const setTypingWithDebounce = useCallback(
    (targetId?: string, groupId?: string) => {
      socketClient.setTypingWithDebounce(targetId, groupId);
    },
    []
  );

  // Listen for socket errors
  useEffect(() => {
    const unsubscribe = on('error', (error: any) => {
      const message = error?.message || 'Socket connection error';
      setSocketError(message);
      console.error('Socket error:', message);
      // Auto-clear error after 5 seconds
      const timeout = setTimeout(() => setSocketError(null), 5000);
      return () => clearTimeout(timeout);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [on]);

  return {
    isConnected: socketClient.isConnected(),
    socketError,
    on,
    emit,
    startTyping,
    stopTyping,
    setTypingWithDebounce,
    socketClient,
  };
}
