"use client";

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useMessageStore } from '@/stores/messageStore';
import { useGroupStore } from '@/stores/groupStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentStore } from '@/stores/paymentStore';

// Checks the server session first; app data is only loaded for a logged-in user.
// Login/logout do a full page load, so this runs fresh for each account.
export function StoreInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      const user = await useAuthStore.getState().restoreSession();
      if (!user) return;
      await Promise.allSettled([
        useAuthStore.getState().initialize(),
        useWorkspaceStore.getState().initialize(),
        useMessageStore.getState().initialize(),
        useGroupStore.getState().initialize(),
        useNotificationStore.getState().initialize(),
        usePaymentStore.getState().initialize(),
      ]);
    })();
  }, []);

  return null;
}
