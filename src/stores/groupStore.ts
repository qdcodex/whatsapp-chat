import { create } from 'zustand';
import type { Group, JoinRequest, GroupCreationRequest } from '@/types';

const GROUP_MEMBER_LIMIT = 1000;
const generateId = () => Math.random().toString(36).substring(2, 15);
const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + generateId().substring(0, 5);

interface GroupState {
  groups: Group[];
  joinRequests: JoinRequest[];
  groupCreationRequests: GroupCreationRequest[];
  isInitialized: boolean;

  initialize: () => Promise<void>;
  createGroup: (data: Omit<Group, 'id' | 'createdAt' | 'slug'>) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, userId: string) => { success: boolean; reason?: string };
  removeMember: (groupId: string, userId: string) => void;
  toggleMemberMute: (groupId: string, userId: string) => void;
  isMemberMuted: (groupId: string, userId: string) => boolean;
  getGroupsByWorkspace: (workspaceId: string) => Group[];
  getGroupBySlug: (slug: string) => Group | undefined;
  getGroupById: (id: string) => Group | undefined;
  getUserGroups: (userId: string) => Group[];

  requestGroupCreation: (data: Omit<GroupCreationRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  approveGroupCreationRequest: (requestId: string) => Promise<Group | null>;
  rejectGroupCreationRequest: (requestId: string) => Promise<void>;
  getGroupCreationRequests: (status?: GroupCreationRequest['status']) => GroupCreationRequest[];
  getPendingGroupCreationCount: () => number;
  getAdminGroupCreationRequests: (adminId: string) => GroupCreationRequest[];
  adminGroupCount: (adminId: string) => number;

  submitJoinRequest: (req: Omit<JoinRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  getJoinRequests: (groupId: string) => JoinRequest[];
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>()((set, get) => ({
  groups: [],
  joinRequests: [],
  groupCreationRequests: [],
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    const [gRes, jRes, gcrRes] = await Promise.all([
      fetch('/api/groups'),
      fetch('/api/join-requests'),
      fetch('/api/group-creation-requests'),
    ]);
    if (!gRes.ok || !jRes.ok || !gcrRes.ok) return;
    const [groups, joinRequests, groupCreationRequests] = await Promise.all([
      gRes.json(), jRes.json(), gcrRes.json(),
    ]);
    set({ groups, joinRequests, groupCreationRequests, isInitialized: true });
  },

  createGroup: async (data) => {
    const group: Group = { ...data, id: generateId(), slug: generateSlug(data.name), createdAt: Date.now() };
    set(s => ({ groups: [...s.groups, group] }));
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    return group;
  },

  deleteGroup: async (id) => {
    set(s => ({
      groups: s.groups.filter(g => g.id !== id),
      joinRequests: s.joinRequests.filter(r => r.groupId !== id),
    }));
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
  },

  addMember: (groupId, userId) => {
    const group = get().groups.find(g => g.id === groupId);
    if (!group) return { success: false, reason: 'Group not found' };
    if (group.memberIds.length >= GROUP_MEMBER_LIMIT)
      return { success: false, reason: `Group has reached the ${GROUP_MEMBER_LIMIT} member limit` };
    if (group.memberIds.includes(userId)) return { success: true };
    set(s => ({ groups: s.groups.map(g => g.id === groupId ? { ...g, memberIds: [...g.memberIds, userId] } : g) }));
    fetch(`/api/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    return { success: true };
  },

  removeMember: (groupId, userId) => {
    set(s => ({ groups: s.groups.map(g => g.id === groupId ? { ...g, memberIds: g.memberIds.filter(id => id !== userId) } : g) }));
    fetch(`/api/groups/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  },

  toggleMemberMute: (groupId, userId) => {
    const group = get().groups.find(g => g.id === groupId);
    if (!group) return;
    const muted = group.mutedMemberIds || [];
    const isMuted = muted.includes(userId);
    const mutedMemberIds = isMuted ? muted.filter(id => id !== userId) : [...muted, userId];
    set(s => ({
      groups: s.groups.map(g => g.id === groupId ? { ...g, mutedMemberIds } : g),
    }));
    fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutedMemberIds }),
    });
  },

  isMemberMuted: (groupId, userId) => get().groups.find(g => g.id === groupId)?.mutedMemberIds?.includes(userId) ?? false,
  getGroupsByWorkspace: (workspaceId) => get().groups.filter(g => g.workspaceId === workspaceId),
  getGroupBySlug: (slug) => get().groups.find(g => g.slug === slug),
  getGroupById: (id) => get().groups.find(g => g.id === id),
  getUserGroups: (userId) => get().groups.filter(g => g.memberIds.includes(userId)),
  adminGroupCount: (adminId) => get().groups.filter(g => g.adminId === adminId).length,

  requestGroupCreation: async (data) => {
    const req: GroupCreationRequest = { ...data, id: generateId(), status: 'pending', createdAt: Date.now() };
    set(s => ({ groupCreationRequests: [...s.groupCreationRequests, req] }));
    await fetch('/api/group-creation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  },

  approveGroupCreationRequest: async (requestId) => {
    const res = await fetch(`/api/group-creation-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
    if (!res.ok) return null;
    const { request, group } = await res.json();
    set(s => ({
      groups: [...s.groups, group],
      groupCreationRequests: s.groupCreationRequests.map(r => r.id === requestId ? request : r),
    }));
    return group;
  },

  rejectGroupCreationRequest: async (requestId) => {
    set(s => ({ groupCreationRequests: s.groupCreationRequests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r) }));
    await fetch(`/api/group-creation-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
  },

  getGroupCreationRequests: (status) => {
    const reqs = get().groupCreationRequests;
    return status ? reqs.filter(r => r.status === status) : reqs;
  },
  getPendingGroupCreationCount: () => get().groupCreationRequests.filter(r => r.status === 'pending').length,
  getAdminGroupCreationRequests: (adminId) => get().groupCreationRequests.filter(r => r.adminId === adminId),

  submitJoinRequest: async (req) => {
    const newReq: JoinRequest = { ...req, id: generateId(), status: 'pending', createdAt: Date.now() };
    set(s => ({ joinRequests: [...s.joinRequests, newReq] }));
    await fetch('/api/join-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq),
    });
  },

  getJoinRequests: (groupId) => get().joinRequests.filter(r => r.groupId === groupId && r.status === 'pending'),

  approveJoinRequest: async (requestId) => {
    set(s => ({ joinRequests: s.joinRequests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r) }));
    await fetch(`/api/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });
  },

  rejectJoinRequest: async (requestId) => {
    set(s => ({ joinRequests: s.joinRequests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r) }));
    await fetch(`/api/join-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
  },
}));
