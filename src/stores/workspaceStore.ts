import { create } from 'zustand';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  createWorkspace: (data: Omit<Workspace, 'id' | 'createdAt'>) => Promise<Workspace>;
  getWorkspaceBySlug: (slug: string) => Workspace | undefined;
  getWorkspaceByAdmin: (adminId: string) => Workspace | undefined;
  deleteWorkspace: (id: string) => Promise<void>;
  toggleGlobalChat: (slug: string) => Promise<void>;
  toggleMessaging: (adminId: string) => Promise<void>;
  toggleAutoDelete: (workspaceId: string) => Promise<void>;
  setAutoDeleteDays: (workspaceId: string, days: number) => Promise<void>;
  updateAd: (workspaceId: string, ad: Pick<Workspace, 'adEnabled' | 'adImageUrl' | 'adTitle' | 'adText' | 'adLinkUrl'>) => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  workspaces: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    const res = await fetch('/api/workspaces');
    if (!res.ok) return;
    const workspaces: Workspace[] = await res.json();
    set({ workspaces, isInitialized: true });
  },

  createWorkspace: async (data) => {
    const ws: Workspace = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
      globalChatEnabled: false,
      messagingEnabled: true,
      autoDeleteMessages: false,
      autoDeleteDays: 7,
    };
    set(s => ({ workspaces: [...s.workspaces, ws] }));
    await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ws),
    });
    return ws;
  },

  getWorkspaceBySlug: (slug) => get().workspaces.find(w => w.slug === slug),
  getWorkspaceByAdmin: (adminId) => get().workspaces.find(w => w.adminId === adminId),

  deleteWorkspace: async (id) => {
    set(s => ({ workspaces: s.workspaces.filter(w => w.id !== id) }));
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
  },

  toggleGlobalChat: async (slug) => {
    const ws = get().workspaces.find(w => w.slug === slug);
    if (!ws) return;
    const globalChatEnabled = !ws.globalChatEnabled;
    set(s => ({ workspaces: s.workspaces.map(w => w.slug === slug ? { ...w, globalChatEnabled } : w) }));
    await fetch(`/api/workspaces/${ws.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ globalChatEnabled }),
    });
  },

  toggleMessaging: async (adminId) => {
    const ws = get().workspaces.find(w => w.adminId === adminId);
    if (!ws) return;
    const messagingEnabled = ws.messagingEnabled === false ? true : false;
    set(s => ({ workspaces: s.workspaces.map(w => w.adminId === adminId ? { ...w, messagingEnabled } : w) }));
    await fetch(`/api/workspaces/${ws.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messagingEnabled }),
    });
  },

  toggleAutoDelete: async (workspaceId) => {
    const ws = get().workspaces.find(w => w.id === workspaceId);
    if (!ws) return;
    const autoDeleteMessages = !ws.autoDeleteMessages;
    set(s => ({ workspaces: s.workspaces.map(w => w.id === workspaceId ? { ...w, autoDeleteMessages } : w) }));
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoDeleteMessages }),
    });
  },

  setAutoDeleteDays: async (workspaceId, days) => {
    set(s => ({ workspaces: s.workspaces.map(w => w.id === workspaceId ? { ...w, autoDeleteDays: days } : w) }));
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoDeleteDays: days }),
    });
  },

  updateAd: async (workspaceId, ad) => {
    set(s => ({ workspaces: s.workspaces.map(w => w.id === workspaceId ? { ...w, ...ad } : w) }));
    await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ad),
    });
  },
}));
