import { create } from 'zustand';
import type { AdminSubscription, PaymentNotification } from '@/types';

const DEFAULT_BILLING_DAYS = 28;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type PaymentStatus = 'active' | 'expiring_soon' | 'overdue' | 'not_set';

const generateId = () => Math.random().toString(36).substring(2, 15);

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
  recordPayment: (adminId: string, adminName: string, workspaceId: string, note?: string) => Promise<void>;
  getPaymentStatus: (adminId: string) => PaymentStatus;
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
    await fetch(`/api/payments/subscriptions/${adminId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyAmount: amount }),
    });
  },

  setBillingCycleDays: async (adminId, days) => {
    set(s => ({ subscriptions: s.subscriptions.map(sub => sub.adminId === adminId ? { ...sub, billingCycleDays: days } : sub) }));
    await fetch(`/api/payments/subscriptions/${adminId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingCycleDays: days }),
    });
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
      await fetch(`/api/payments/subscriptions/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentActive }),
      });
    }
  },

  getSubscription: (adminId) => get().subscriptions.find(s => s.adminId === adminId),
  getAllSubscriptions: () => get().subscriptions,

  recordPayment: async (adminId, adminName, workspaceId, note) => {
    const res = await fetch('/api/payments/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, adminName, workspaceId, note }),
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

  getPaymentStatus: (adminId) => {
    const sub = get().subscriptions.find(s => s.adminId === adminId);
    // Not required if no subscription, payment explicitly stopped, or fee never set
    if (!sub || sub.paymentActive === false || sub.monthlyAmount === 0 || !sub.nextDueAt) return 'not_set';
    const daysRemaining = Math.ceil((sub.nextDueAt - Date.now()) / MS_PER_DAY);
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining <= 7) return 'expiring_soon';
    return 'active';
  },

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
