import { create } from 'zustand';
import type { PaymentNotification } from '@/types';

interface NotificationState {
  paymentNotifications: PaymentNotification[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  addPaymentNotification: (data: Omit<PaymentNotification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  markAllPaymentNotificationsRead: () => Promise<void>;
  markPaymentNotificationRead: (id: string) => Promise<void>;
  getUnreadPaymentCount: () => number;
  clearPaymentNotifications: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  paymentNotifications: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    // notificationStore shares the payment notifications collection
    const res = await fetch('/api/payments/notifications');
    const paymentNotifications: PaymentNotification[] = await res.json();
    set({ paymentNotifications, isInitialized: true });
  },

  addPaymentNotification: async (data) => {
    const notif: PaymentNotification = { ...data, id: generateId(), read: false, createdAt: Date.now() };
    set(s => ({ paymentNotifications: [notif, ...s.paymentNotifications] }));
    await fetch('/api/payments/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notif),
    }).catch(() => {/* non-critical */});
  },

  markAllPaymentNotificationsRead: async () => {
    set(s => ({ paymentNotifications: s.paymentNotifications.map(n => ({ ...n, read: true })) }));
    await fetch('/api/payments/notifications', { method: 'PATCH' });
  },

  markPaymentNotificationRead: async (id) => {
    set(s => ({ paymentNotifications: s.paymentNotifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    await fetch(`/api/payments/notifications/${id}`, { method: 'PATCH' });
  },

  getUnreadPaymentCount: () => get().paymentNotifications.filter(n => !n.read).length,
  clearPaymentNotifications: () => set({ paymentNotifications: [] }),
}));
