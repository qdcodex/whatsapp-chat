import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  users: User[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (username: string, password: string) => User | null;
  loginByPhone: (phone: string) => User | null;
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserChat: (userId: string) => Promise<void>;
  getUsersByAdmin: (adminId: string) => User[];
  getAdmins: () => User[];
  getUserById: (id: string) => User | undefined;
  getMaskedPhone: (userId: string) => string;
  updateAvatar: (userId: string, avatar: string) => Promise<void>;
  updateUser: (userId: string, data: Partial<Pick<User, 'displayName' | 'avatar' | 'phone' | 'password'>>) => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
  currentUser: null,
  users: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    const res = await fetch('/api/users');
    if (!res.ok) return;
    const users: User[] = await res.json();
    set({ users, isInitialized: true });
  },

  login: (username, password) => {
    const user = get().users.find(u => u.username === username && u.password === password);
    if (user) { set({ currentUser: user }); return user; }
    return null;
  },

  loginByPhone: (phone) => {
    const user = get().users.find(u => u.phone && u.phone === phone);
    if (user) { set({ currentUser: user }); return user; }
    return null;
  },

  logout: () => set({ currentUser: null }),

  createUser: async (data) => {
    const newUser: User = { ...data, id: generateId(), createdAt: Date.now() };
    set(s => ({ users: [...s.users, newUser] }));
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    return newUser;
  },

  deleteUser: async (id) => {
    set(s => ({ users: s.users.filter(u => u.id !== id) }));
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
  },

  toggleUserChat: async (userId) => {
    const user = get().users.find(u => u.id === userId);
    if (!user) return;
    const chatEnabled = user.chatEnabled === undefined ? true : !user.chatEnabled;
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, chatEnabled } : u),
    }));
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatEnabled }),
    });
  },

  getUsersByAdmin: (adminId) => get().users.filter(u => u.role === 'user' && u.adminId === adminId),
  getAdmins: () => get().users.filter(u => u.role === 'admin'),
  getUserById: (id) => get().users.find(u => u.id === id),

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
    set(s => ({
      users: s.users.map(u => u.id === userId ? { ...u, ...patch } : u),
      currentUser: s.currentUser?.id === userId ? { ...s.currentUser, ...patch } : s.currentUser,
    }));
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  },
}),
    {
      name: 'broadcast-session',
      partialize: (state) => ({ currentUser: state.currentUser }),
    }
  )
);
