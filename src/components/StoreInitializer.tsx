"use client";

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useMessageStore } from '@/stores/messageStore';
import { useGroupStore } from '@/stores/groupStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentStore } from '@/stores/paymentStore';

export function StoreInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    Promise.all([
      useAuthStore.getState().initialize(),
      useWorkspaceStore.getState().initialize(),
      useMessageStore.getState().initialize(),
      useGroupStore.getState().initialize(),
      useNotificationStore.getState().initialize(),
      usePaymentStore.getState().initialize(),
    ]);
  }, []);

  return null;
}
