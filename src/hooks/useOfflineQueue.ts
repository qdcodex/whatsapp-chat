import { useEffect, useCallback } from 'react';
import { idb } from '@/lib/idb';
import { useMessageStore } from '@/stores/messageStore';

export function useOfflineQueue() {
  const sendMessage = useMessageStore((s) => s.sendMessage);

  const syncOfflineMessages = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const queue = (await idb.getOfflineQueue()) as any[];
      for (const item of queue) {
        try {
          // Send the message
          sendMessage(item.message);
          // Remove from offline queue
          await idb.removeFromOfflineQueue(item.id);
        } catch (error) {
          console.error('Failed to sync message:', error);
        }
      }
    } catch (error) {
      console.error('Error syncing offline messages:', error);
    }
  }, [sendMessage]);

  useEffect(() => {
    // Handle online event
    const handleOnline = () => {
      console.log('🟢 Back online - syncing messages');
      syncOfflineMessages();
    };

    // Handle offline event
    const handleOffline = () => {
      console.log('🔴 Offline - queuing messages');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync on mount if online
    if (navigator.onLine) {
      syncOfflineMessages();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineMessages]);

  return { syncOfflineMessages };
}
