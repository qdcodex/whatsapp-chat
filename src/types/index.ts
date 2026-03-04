export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  avatar?: string;
  workspaceId?: string; // admin's workspace slug
  adminId?: string; // for users: which admin they belong to
  createdAt: number;
}

export interface Message {
  id: string;
  adminId: string; // which admin sent it
  workspaceId: string;
  text?: string;
  imageUrl?: string; // base64 data URL
  timestamp: number;
}

export interface Workspace {
  id: string;
  slug: string; // URL slug like "companyA"
  name: string;
  adminId: string;
  createdAt: number;
}
