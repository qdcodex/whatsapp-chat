import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { socketClient } from '@/lib/socketClient';
import { normalizePhone } from '@/lib/phone';

interface AuthState {
  currentUser: User | null;
  users: User[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  restoreSession: () => Promise<User | null>;
  login: (username: string, password: string) => Promise<User>;
  loginByPhone: (phone: string, otp: string) => Promise<User>;
  joinGroup: (data: { groupSlug: string; name: string; phone: string; otp: string }) => Promise<User>;
  logout: () => Promise<void>;
  createUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserChat: (userId: string, newValue: boolean) => Promise<void>;
  getUsersByAdmin: (adminId: string) => User[];
  getAdmins: () => User[];
  getUserById: (id: string) => User | undefined;
  getUserByPhone: (phone: string) => User | undefined;
  getMaskedPhone: (userId: string) => string;
  updateAvatar: (userId: string, avatar: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Pick<User, 'displayName' | 'avatar' | 'phone' | 'password'>>) => Promise<void>;
  handleRemoteProfileUpdate: (data: { userId: string; displayName?: string; avatar?: string }) => void;
  handleSettingsUpdate: (data: { userId: string; chatEnabled?: boolean }) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

async function postAuth(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  currentUser: null,
  users: [],
  isInitialized: false,

  // Loads the users visible to the logged-in account (server scopes the list)
  initialize: async () => {
    if (get().isInitialized) return;
    const res = await fetch('/api/users');
    if (!res.ok) return;
    const users: User[] = await res.json();
    const currentUser = get().currentUser;
    const freshCurrentUser = currentUser ? users.find(u => u.id === currentUser.id) ?? currentUser : null;
    set({ users, isInitialized: true, currentUser: freshCurrentUser });
  },

  // The server cookie is the source of truth; the persisted currentUser is only a hint
  restoreSession: async () => {
    const res = await fetch('/api/auth/me');
    const user: User | null = res.ok ? await res.json() : null;
    set({ currentUser: user });
    return user;
  },

  login: async (username, password) => {
    const user = await postAuth('/api/auth/login', { username, password });
    set({ currentUser: user, isInitialized: false });
    return user;
  },

  loginByPhone: async (phone, otp) => {
    const user = await postAuth('/api/auth/otp-login', { phone, otp });
    set({ currentUser: user, isInitialized: false });
    return user;
  },

  joinGroup: async (data) => {
    const { user } = await postAuth('/api/auth/join', data);
    set({ currentUser: user, isInitialized: false });
    return user;
  },

  // Full reload afterwards so no other account's data stays in memory
  logout: async () => {
    set({ currentUser: null, users: [], isInitialized: false });
    socketClient.disconnect();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    if (typeof window !== 'undefined') window.location.assign('/login');
  },

  createUser: async (data) => {
    // Guard duplicate phone on the client side before sending to server
    if (data.phone) {
      const duplicate = get().users.find(u => u.phone && normalizePhone(u.phone) === normalizePhone(data.phone!));
      if (duplicate) throw new Error('A user with this phone number already exists');
    }
    // The server sets role/workspace/password rules; only superadmin-chosen admin passwords are kept
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: generateId() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create user');
    }
    const newUser: User = await res.json();
    set(s => ({ users: [...s.users, newUser] }));
    return newUser;
  },

  deleteUser: async (id) => {
    set(s => ({ users: s.users.filter(u => u.id !== id) }));
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
  },

  toggleUserChat: async (userId, newValue) => {
    const user = get().users.find(u => u.id === userId);
    if (!user) return;
    const chatEnabled = newValue;
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, chatEnabled } : u),
    }));
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatEnabled }),
    });
    // Notify the affected user in real-time so their MessageComposer
    // shows/hides immediately without needing a page refresh
    socketClient.emit('user:settings-updated', { userId, chatEnabled });
  },

  getUsersByAdmin: (adminId) => get().users.filter(u => u.role === 'user' && u.adminId === adminId),
  getAdmins: () => get().users.filter(u => u.role === 'admin'),
  getUserById: (id) => get().users.find(u => u.id === id),
  getUserByPhone: (phone) => get().users.find(u => u.phone && u.phone === phone),

  getMaskedPhone: (userId) => {
    const user = get().users.find(u => u.id === userId);
    if (!user?.phone) return '';
    const phone = user.phone;
    if (phone.length <= 4) return '****';
    return phone.slice(0, -4) + '****';
  },

  updateAvatar: async (userId, avatar) => {
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, avatar } : u),
      currentUser: s.currentUser?.id === userId ? { ...s.currentUser, avatar } : s.currentUser,
    }));
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar }),
    });
  },

  updateUser: async (userId, data) => {
    // Only send non-empty values
    const patch = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== ''));
    // Passwords go to the server only; never keep them in client state
    const { password: _pw, ...localPatch } = patch;
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, ...localPatch } : u),
      currentUser: s.currentUser?.id === userId ? { ...s.currentUser, ...localPatch } : s.currentUser,
    }));
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    // Broadcast name/avatar change so all workspace members see it in real-time
    if (patch.displayName || patch.avatar) {
      socketClient.emit('user:profile-updated', {
        userId,
        displayName: patch.displayName,
        avatar: patch.avatar,
      });
    }
  },

  handleSettingsUpdate: ({ userId, chatEnabled }) => {
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, chatEnabled } : u),
      // If this IS the current user (user's own session), update currentUser too
      currentUser: s.currentUser?.id === userId
        ? { ...s.currentUser, chatEnabled }
        : s.currentUser,
    }));
  },

  handleRemoteProfileUpdate: ({ userId, displayName, avatar }) => {
    const patch: Partial<User> = {};
    if (displayName) patch.displayName = displayName;
    if (avatar)      patch.avatar      = avatar;
    if (!Object.keys(patch).length) return;
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, ...patch } : u),
      // Also update currentUser if it's the same person (e.g. two tabs)
      currentUser: s.currentUser?.id === userId ? { ...s.currentUser, ...patch } : s.currentUser,
    }));
  },
}),
    {
      name: 'broadcast-session',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
