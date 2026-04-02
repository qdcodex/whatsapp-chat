import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  currentUser: User | null;
  users: User[];
  login: (username: string, password: string) => User | null;
  loginByPhone: (phone: string) => User | null;
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt'>) => User;
  deleteUser: (id: string) => void;
  toggleUserChat: (userId: string) => void;
  getUsersByAdmin: (adminId: string) => User[];
  getAdmins: () => User[];
  getUserById: (id: string) => User | undefined;
  getMaskedPhone: (userId: string) => string;
  updateAvatar: (userId: string, avatar: string) => void;
  updateUser: (userId: string, data: Partial<Pick<User, 'displayName' | 'avatar'>>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultUsers: User[] = [
  {
    id: 'sa-1',
    username: 'superadmin',
    password: 'admin123',
    role: 'superadmin',
    displayName: 'Super Admin',
    createdAt: Date.now(),
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: defaultUsers,

      login: (username, password) => {
        const user = get().users.find(
          (u) => u.username === username && u.password === password
        );
        if (user) {
          set({ currentUser: user });
          return user;
        }
        return null;
      },

      loginByPhone: (phone) => {
        const user = get().users.find(
          (u) => u.phone && u.phone === phone
        );
        if (user) {
          set({ currentUser: user });
          return user;
        }
        return null;
      },

      logout: () => set({ currentUser: null }),

      createUser: (data) => {
        const newUser: User = {
          ...data,
          id: generateId(),
          createdAt: Date.now(),
        };
        set((state) => ({ users: [...state.users, newUser] }));
        return newUser;
      },

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        }));
      },

      toggleUserChat: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId
              ? { ...u, chatEnabled: u.chatEnabled === undefined ? true : !u.chatEnabled }
              : u
          ),
        }));
      },

      getUsersByAdmin: (adminId) => {
        return get().users.filter((u) => u.role === 'user' && u.adminId === adminId);
      },

      getAdmins: () => {
        return get().users.filter((u) => u.role === 'admin');
      },

      getUserById: (id) => get().users.find((u) => u.id === id),

      getMaskedPhone: (userId) => {
        const user = get().users.find((u) => u.id === userId);
        if (!user?.phone) return '';
        const phone = user.phone;
        if (phone.length <= 4) return '****';
        return phone.slice(0, -4) + '****';
      },

      updateAvatar: (userId, avatar) => {
        set((state) => ({
          users: state.users.map((u) => u.id === userId ? { ...u, avatar } : u),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, avatar } : state.currentUser,
        }));
      },

      updateUser: (userId, data) => {
        set((state) => ({
          users: state.users.map((u) => u.id === userId ? { ...u, ...data } : u),
          currentUser: state.currentUser?.id === userId ? { ...state.currentUser, ...data } : state.currentUser,
        }));
      },
    }),
    { name: 'broadcast-auth' }
  )
);
