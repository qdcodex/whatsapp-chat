export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  avatar?: string;
  workspaceId?: string;
  adminId?: string;
  createdAt: number;
  chatEnabled?: boolean; // per-user chat override (undefined = use global)
}

export interface Message {
  id: string;
  adminId: string;
  workspaceId: string;
  senderId: string; // who actually sent it
  recipientId?: string; // undefined = broadcast, string = DM
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: number;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  adminId: string;
  createdAt: number;
  globalChatEnabled?: boolean; // global toggle for user replies
}

export type ChatView = 'broadcast' | { type: 'dm'; userId: string };
