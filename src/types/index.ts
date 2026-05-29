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
  replyTo?: {
    messageId: string;
    text?: string;
    senderName: string;
  };
  forwardedFrom?: {
    senderName: string;
    originalTimestamp: number;
  };
  deletedFor?: string[];       // user IDs who deleted this for themselves
  deletedForEveryone?: boolean; // deleted for all participants
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  adminId: string;
  memberIds: string[];
  mutedMemberIds?: string[];
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

export interface GroupCreationRequest {
  id: string;
  adminId: string;
  adminName: string;
  workspaceId: string;
  groupName: string;
  description?: string;
  memberIds: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  adminId: string;
  createdAt: number;
  globalChatEnabled?: boolean;  // users can reply to admin
  messagingEnabled?: boolean;    // admin can send messages (super admin toggle)
  autoDeleteMessages?: boolean;
  autoDeleteDays?: number; // default 7
  adEnabled?: boolean;
  adImageUrl?: string;
  adTitle?: string;
  adText?: string;
  adLinkUrl?: string;
}

export interface PaymentNotification {
  id: string;
  adminId: string;
  adminName: string;
  workspaceId: string;
  message: string;
  amount?: number;
  read: boolean;
  createdAt: number;
}

export interface PaymentRecord {
  id: string;
  paidAt: number;
  amount: number;
  note?: string;
}

export interface AdminSubscription {
  adminId: string;
  adminName: string;
  workspaceId: string;
  monthlyAmount: number;    // amount in currency units, set by super admin
  billingCycleDays?: number; // default 28, editable by super admin per admin
  lastPaidAt?: number;      // timestamp of last payment
  nextDueAt?: number;       // lastPaidAt + billingCycleDays (ms)
  history: PaymentRecord[];
  paymentActive?: boolean;  // super admin can start/stop payment requirement
}

export type ChatView = 'broadcast' | { type: 'dm'; userId: string } | { type: 'group'; groupId: string };
