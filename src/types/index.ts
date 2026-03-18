export type UserRole = 'superadmin' | 'admin' | 'user';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  avatar?: string;
  phone?: string;
  workspaceId?: string;
  adminId?: string;
  createdAt: number;
  chatEnabled?: boolean;
}

export interface Message {
  id: string;
  adminId: string;
  workspaceId: string;
  senderId: string;
  recipientId?: string; // undefined = broadcast, string = DM
  groupId?: string; // group message
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: number;
  status: MessageStatus;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  adminId: string;
  memberIds: string[];
  slug: string;
  createdAt: number;
}

export interface JoinRequest {
  id: string;
  groupId: string;
  name: string;
  phone?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  adminId: string;
  createdAt: number;
  globalChatEnabled?: boolean;
}

export type ChatView = 'broadcast' | { type: 'dm'; userId: string } | { type: 'group'; groupId: string };
