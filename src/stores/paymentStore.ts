import { create } from 'zustand';
import type { AdminSubscription, PaymentNotification } from '@/types';
import {
  DEFAULT_BILLING_DAYS, MS_PER_DAY, getPaymentStatus as statusOf, isMessagingPaused as pausedOf,
  type PaymentStatus,
} from '@/lib/subscription';

export type { PaymentStatus };

async function patchSubscription(adminId: string, body: Record<string, unknown>): Promise<AdminSubscription | null> {
  const res = await fetch(`/api/payments/subscriptions/${adminId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.ok ? res.json() : null;
}

interface PaymentState {
  subscriptions: AdminSubscription[];
  notifications: PaymentNotification[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  ensureSubscription: (adminId: string, adminName: string, workspaceId: string) => Promise<void>;
  setMonthlyAmount: (adminId: string, amount: number) => Promise<void>;
  setBillingCycleDays: (adminId: string, days: number) => Promise<void>;
  togglePaymentActive: (adminId: string, adminName: string, workspaceId: string) => Promise<void>;
  getSubscription: (adminId: string) => AdminSubscription | undefined;
  getAllSubscriptions: () => AdminSubscription[];
  recordPayment: (adminId: string, note?: string) => Promise<void>;
  claimPayment: (adminId: string, note?: string) => Promise<void>;
  rejectClaim: (adminId: string) => Promise<void>;
  getPaymentStatus: (adminId: string) => PaymentStatus;
  isMessagingPaused: (adminId: string) => boolean;
  getDaysRemaining: (adminId: string) => number | null;
  getDaysOverdue: (adminId: string) => number | null;
  getBillingCycleDays: (adminId: string) => number;
  notifications_unreadCount: () => number;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

export const usePaymentStore = create<PaymentState>()((set, get) => ({
  subscriptions: [],
  notifications: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    const [sRes, nRes] = await Promise.all([
      fetch('/api/payments/subscriptions'),
      fetch('/api/payments/notifications'),
    ]);
    if (!sRes.ok || !nRes.ok) return;
    const [subscriptions, notifications] = await Promise.all([sRes.json(), nRes.json()]);
    set({ subscriptions, notifications, isInitialized: true });
  },

  ensureSubscription: async (adminId, adminName, workspaceId) => {
    if (get().subscriptions.find(s => s.adminId === adminId)) return;
    const sub: AdminSubscription = { adminId, adminName, workspaceId, monthlyAmount: 0, billingCycleDays: DEFAULT_BILLING_DAYS, history: [], paymentActive: true };
    set(s => ({ subscriptions: [...s.subscriptions, sub] }));
    await fetch('/api/payments/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
  },

  setMonthlyAmount: async (adminId, amount) => {
    set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? { ...sub, monthlyAmount: amount } : sub) }));
    const saved = await patchSubscription(adminId, { monthlyAmount: amount });
    if (saved) set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? saved : sub) }));
  },

  setBillingCycleDays: async (adminId, days) => {
    set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? { ...sub, billingCycleDays: days } : sub) }));
    const saved = await patchSubscription(adminId, { billingCycleDays: days });
    if (saved) set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? saved : sub) }));
  },

  togglePaymentActive: async (adminId, adminName, workspaceId) => {
    const existing = get().subscriptions.find(s => s.adminId === adminId);
    const paymentActive = existing ? (existing.paymentActive === false ? true : false) : true;
    if (!existing) {
      const sub: AdminSubscription = { adminId, adminName, workspaceId, monthlyAmount: 0, billingCycleDays: DEFAULT_BILLING_DAYS, history: [], paymentActive };
      set(s => ({ subscriptions: [...s.subscriptions, sub] }));
      await fetch('/api/payments/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
    } else {
      set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? { ...sub, paymentActive } : sub) }));
      const saved = await patchSubscription(adminId, { paymentActive });
      if (saved) set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? saved : sub) }));
    }
  },

  getSubscription: (adminId) => get().subscriptions.find(s => s.adminId === adminId),
  getAllSubscriptions: () => get().subscriptions,

  // Superadmin only (server-enforced): records a payment and starts the next cycle
  recordPayment: async (adminId, note) => {
    const res = await fetch('/api/payments/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || 'Failed to record payment');
    }
    const { subscription, notification } = await res.json();
    set(s => ({
      subscriptions: s.subscriptions.some(sub => sub.adminId === adminId)
        ? s.subscriptions.map(sub => sub.adminId === adminId ? subscription : sub)
        : [...s.subscriptions, subscription],
      notifications: [notification, ...s.notifications],
    }));
  },

  // Admin: "I've paid" — waits for the superadmin to confirm
  claimPayment: async (adminId, note) => {
    const res = await fetch('/api/payments/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to send payment claim');
    set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? data.subscription : sub) }));
  },

  rejectClaim: async (adminId) => {
    const res = await fetch('/api/payments/claim', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to reject claim');
    set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? data.subscription : sub) }));
  },

  getPaymentStatus: (adminId) => statusOf(get().subscriptions.find(s => s.adminId === adminId)),
  isMessagingPaused: (adminId) => pausedOf(get().subscriptions.find(s => s.adminId === adminId)),

  getDaysRemaining: (adminId) => {
    const sub = get().subscriptions.find(s => s.adminId === adminId);
    if (!sub?.nextDueAt) return null;
    return Math.ceil((sub.nextDueAt - Date.now()) / MS_PER_DAY);
  },

  getDaysOverdue: (adminId) => {
    const sub = get().subscriptions.find(s => s.adminId === adminId);
    if (!sub?.nextDueAt) return null;
    const days = Math.ceil((Date.now() - sub.nextDueAt) / MS_PER_DAY);
    return days > 0 ? days : null;
  },

  getBillingCycleDays: (adminId) => {
    const sub = get().subscriptions.find(s => s.adminId === adminId);
    return sub?.billingCycleDays ?? DEFAULT_BILLING_DAYS;
  },

  notifications_unreadCount: () => get().notifications.filter(n => !n.read).length,

  markNotificationRead: async (id) => {
    set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
    await fetch(`/api/payments/notifications/${id}`, { method: 'PATCH' });
  },

  markAllNotificationsRead: async () => {
    set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) }));
    await fetch('/api/payments/notifications', { method: 'PATCH' });
  },

  clearNotifications: async () => {
    set({ notifications: [] });
    await fetch('/api/payments/notifications', { method: 'DELETE' });
  },
}));
