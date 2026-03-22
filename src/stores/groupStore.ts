import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Group, JoinRequest } from '@/types';

interface GroupState {
  groups: Group[];
  joinRequests: JoinRequest[];
  createGroup: (data: Omit<Group, 'id' | 'createdAt' | 'slug'>) => Group;
  deleteGroup: (id: string) => void;
  addMember: (groupId: string, userId: string) => void;
  removeMember: (groupId: string, userId: string) => void;
  toggleMemberMute: (groupId: string, userId: string) => void;
  isMemberMuted: (groupId: string, userId: string) => boolean;
  getGroupsByWorkspace: (workspaceId: string) => Group[];
  getGroupBySlug: (slug: string) => Group | undefined;
  getGroupById: (id: string) => Group | undefined;
  getUserGroups: (userId: string) => Group[];
  submitJoinRequest: (req: Omit<JoinRequest, 'id' | 'createdAt' | 'status'>) => void;
  getJoinRequests: (groupId: string) => JoinRequest[];
  approveJoinRequest: (requestId: string) => void;
  rejectJoinRequest: (requestId: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);
const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + generateId().substring(0, 5);

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      joinRequests: [],

      createGroup: (data) => {
        const group: Group = {
          ...data,
          id: generateId(),
          slug: generateSlug(data.name),
          createdAt: Date.now(),
        };
        set((s) => ({ groups: [...s.groups, group] }));
        return group;
      },

      deleteGroup: (id) => set((s) => ({
        groups: s.groups.filter((g) => g.id !== id),
        joinRequests: s.joinRequests.filter((r) => r.groupId !== id),
      })),

      addMember: (groupId, userId) => set((s) => ({
        groups: s.groups.map((g) =>
          g.id === groupId && !g.memberIds.includes(userId)
            ? { ...g, memberIds: [...g.memberIds, userId] }
            : g
        ),
      })),

      removeMember: (groupId, userId) => set((s) => ({
        groups: s.groups.map((g) =>
          g.id === groupId ? { ...g, memberIds: g.memberIds.filter((id) => id !== userId) } : g
        ),
      })),

      toggleMemberMute: (groupId, userId) => set((s) => ({
        groups: s.groups.map((g) => {
          if (g.id !== groupId) return g;
          const muted = g.mutedMemberIds || [];
          const isMuted = muted.includes(userId);
          return { ...g, mutedMemberIds: isMuted ? muted.filter((id) => id !== userId) : [...muted, userId] };
        }),
      })),

      isMemberMuted: (groupId, userId) => {
        const group = get().groups.find((g) => g.id === groupId);
        return group?.mutedMemberIds?.includes(userId) ?? false;
      },

      getGroupsByWorkspace: (workspaceId) => get().groups.filter((g) => g.workspaceId === workspaceId),
      getGroupBySlug: (slug) => get().groups.find((g) => g.slug === slug),
      getGroupById: (id) => get().groups.find((g) => g.id === id),
      getUserGroups: (userId) => get().groups.filter((g) => g.memberIds.includes(userId)),

      submitJoinRequest: (req) => set((s) => ({
        joinRequests: [...s.joinRequests, { ...req, id: generateId(), status: 'pending', createdAt: Date.now() }],
      })),

      getJoinRequests: (groupId) => get().joinRequests.filter((r) => r.groupId === groupId && r.status === 'pending'),

      approveJoinRequest: (requestId) => set((s) => ({
        joinRequests: s.joinRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'approved' } : r
        ),
      })),

      rejectJoinRequest: (requestId) => set((s) => ({
        joinRequests: s.joinRequests.map((r) =>
          r.id === requestId ? { ...r, status: 'rejected' } : r
        ),
      })),
    }),
    { name: 'broadcast-groups' }
  )
);
