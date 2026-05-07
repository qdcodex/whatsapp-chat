import { useEffect, useCallback, useRef } from 'react';
import { socketClient } from '@/lib/socketClient';

interface UseSocketOptions {
  userId: string;
  workspaceId: string;
}

export function useSocket({ userId, workspaceId }: UseSocketOptions) {
  const isConnectingRef = useRef(false);

  useEffect(() => {
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

  return {
    isConnected: socketClient.isConnected(),
    on,
    emit,
    startTyping,
    stopTyping,
    setTypingWithDebounce,
    socketClient,
  };
}
