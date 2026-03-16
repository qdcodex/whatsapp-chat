import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  createWorkspace: (data: Omit<Workspace, 'id' | 'createdAt'>) => Workspace;
  getWorkspaceBySlug: (slug: string) => Workspace | undefined;
  getWorkspaceByAdmin: (adminId: string) => Workspace | undefined;
  deleteWorkspace: (id: string) => void;
  toggleGlobalChat: (workspaceId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],

      createWorkspace: (data) => {
        const ws: Workspace = {
          ...data,
          id: generateId(),
          createdAt: Date.now(),
          globalChatEnabled: false,
        };
        set((state) => ({ workspaces: [...state.workspaces, ws] }));
        return ws;
      },

      getWorkspaceBySlug: (slug) => get().workspaces.find((w) => w.slug === slug),
      getWorkspaceByAdmin: (adminId) => get().workspaces.find((w) => w.adminId === adminId),

      deleteWorkspace: (id) => {
        set((state) => ({ workspaces: state.workspaces.filter((w) => w.id !== id) }));
      },

      toggleGlobalChat: (slug) => {
        set((state) => ({
          workspaces: state.workspaces.map((w) =>
            w.slug === slug ? { ...w, globalChatEnabled: !w.globalChatEnabled } : w
          ),
        }));
      },
    }),
    { name: 'broadcast-workspaces' }
  )
);
