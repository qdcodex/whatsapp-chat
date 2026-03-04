import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  createWorkspace: (data: Omit<Workspace, 'id' | 'createdAt'>) => Workspace;
  getWorkspaceBySlug: (slug: string) => Workspace | undefined;
  getWorkspaceByAdmin: (adminId: string) => Workspace | undefined;
  deleteWorkspace: (id: string) => void;
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
        };
        set((state) => ({ workspaces: [...state.workspaces, ws] }));
        return ws;
      },

      getWorkspaceBySlug: (slug) => {
        return get().workspaces.find((w) => w.slug === slug);
      },

      getWorkspaceByAdmin: (adminId) => {
        return get().workspaces.find((w) => w.adminId === adminId);
      },

      deleteWorkspace: (id) => {
        set((state) => ({
          workspaces: state.workspaces.filter((w) => w.id !== id),
        }));
      },
    }),
    { name: 'broadcast-workspaces' }
  )
);
