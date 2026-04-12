"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGroupStore } from '@/stores/groupStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { usePaymentStore } from '@/stores/paymentStore';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import OnlineStatus from '@/components/OnlineStatus';
import TypingIndicator from '@/components/TypingIndicator';
import GroupManager from '@/components/GroupManager';
import JoinRequestsList from '@/components/JoinRequestsList';
import GroupInfoPanel from '@/components/GroupInfoPanel';
import UnreadBadge from '@/components/UnreadBadge';
import ForwardDialog from '@/components/ForwardDialog';
import {
  LogOut, Users, Trash2, ArrowLeft,
  Settings, MessageCircle, ToggleLeft, ToggleRight,
  Search, UserPlus, Clock, CreditCard, CheckCircle, AlertCircle, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/ProfileAvatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ChatView, User, Message } from '@/types';

const AdminDashboard = () => {
  const { workspaceId } = useParams() as { workspaceId: string };
  const router = useRouter();
  const { currentUser, logout, getUsersByAdmin, deleteUser, toggleUserChat, getMaskedPhone, getUserById, createUser } = useAuthStore();
  const { sendMessage, deleteMessage, getDMMessages, getGroupMessages, getConversationPreview, markAsRead, getUnreadDMCount, getUnreadGroupCount, refreshMessages } = useMessageStore();
  const { getWorkspaceBySlug, toggleGlobalChat, toggleAutoDelete, setAutoDeleteDays } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, getLastSeen, setTyping, clearTyping, isTyping: checkTyping, setTypingDM, clearTypingDM, isTypingDM: checkTypingDM } = usePresenceStore();
  const { getGroupsByWorkspace, getGroupById } = useGroupStore();
  const { addPaymentNotification } = useNotificationStore();
  const { recordPayment, getPaymentStatus, getDaysRemaining, getSubscription, ensureSubscription, getBillingCycleDays } = usePaymentStore();

  const [chatView, setChatView] = useState<ChatView>({ type: 'dm', userId: '' });
  const [showSidebar, setShowSidebar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ message: Message; senderName: string } | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [autoDeleteDaysInput, setAutoDeleteDaysInput] = useState('7');

  const handleCreateUser = async () => {
    if (!newUserName.trim()) { toast.error('Name is required'); return; }
    if (!newUserPhone.trim()) { toast.error('Phone number is required'); return; }
    const existing = users.find(u => u.phone === newUserPhone.trim());
    if (existing) { toast.error('A user with this phone already exists'); return; }
    const user = await createUser({
      username: newUserPhone.trim(),
      password: Math.random().toString(36).slice(2, 10),
      role: 'user',
      displayName: newUserName.trim(),
      phone: newUserPhone.trim(),
      workspaceId: workspaceId!,
      adminId: currentUser!.id,
    });
    setNewUserName('');
    setNewUserPhone('');
    setCreateUserOpen(false);
    toast.success(`${user.displayName} added`);
    openDM(user.id);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setOnline(currentUser.id);
    const interval = setInterval(() => setOnline(currentUser.id), 15000);
    return () => clearInterval(interval);
  }, [currentUser, setOnline]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin' || currentUser.workspaceId !== workspaceId) {
      router.replace('/');
    }
  }, [currentUser, workspaceId, router]);

  useEffect(() => {
    if (!currentUser) return;
    if (typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId) {
      const msgs = getDMMessages(workspaceId!, currentUser.id, chatView.userId);
      const unread = msgs.filter((m) => m.senderId !== currentUser.id && m.status !== 'read');
      if (unread.length > 0) markAsRead(unread.map((m) => m.id));
    }
  }, [chatView, currentUser, workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const interval = setInterval(() => {
      refreshMessages(workspaceId);
    }, 3000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  if (!currentUser || currentUser.role !== 'admin' || currentUser.workspaceId !== workspaceId) return null;

  const workspace = getWorkspaceBySlug(workspaceId!);
  const autoDeleteEnabled = workspace?.autoDeleteMessages ?? false;
  const autoDeleteDays = workspace?.autoDeleteDays ?? 7;
  const messagingEnabled = workspace?.messagingEnabled !== false;
  const users = getUsersByAdmin(currentUser.id);
  const groups = getGroupsByWorkspace(workspaceId!);

  const filteredUsers = searchQuery
    ? users.filter(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone?.includes(searchQuery))
    : users;

  const getActiveMessages = () => {
    const autoDeleteParam = autoDeleteEnabled ? autoDeleteDays : undefined;
    if (typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId)
      return getDMMessages(workspaceId!, currentUser.id, chatView.userId, currentUser.id, autoDeleteParam);
    if (typeof chatView === 'object' && chatView.type === 'group')
      return getGroupMessages(chatView.groupId, currentUser.id, autoDeleteParam);
    return [];
  };
  const activeMessages = getActiveMessages();

  const activeDMUser = (typeof chatView === 'object' && chatView.type === 'dm')
    ? users.find((u) => u.id === chatView.userId) : null;
  const activeGroup = (typeof chatView === 'object' && chatView.type === 'group')
    ? getGroupById(chatView.groupId) : null;

  const handleSend = (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
    const msgBase: any = {
      adminId: currentUser.id,
      workspaceId: workspaceId!,
      senderId: currentUser.id,
    };
    if (replyingTo) {
      msgBase.replyTo = {
        messageId: replyingTo.message.id,
        text: replyingTo.message.text,
        senderName: replyingTo.senderName,
      };
    }
    if (typeof chatView === 'object' && chatView.type === 'dm') {
      sendMessage({ ...msgBase, recipientId: chatView.userId, text, imageUrl, audioUrl, audioDuration });
    } else if (typeof chatView === 'object' && chatView.type === 'group') {
      sendMessage({ ...msgBase, groupId: chatView.groupId, text, imageUrl, audioUrl, audioDuration });
    }
    setReplyingTo(null);
  };

  const handleDelete = (msg: Message, mode: 'for_me' | 'for_everyone') => {
    deleteMessage(msg.id, currentUser.id, mode);
    toast.success(mode === 'for_everyone' ? 'Message deleted for everyone' : 'Message deleted for you');
  };

  const handleTyping = () => {
    const isDM = typeof chatView === 'object' && chatView.type === 'dm';
    if (isDM) {
      const targetId = (chatView as { type: 'dm'; userId: string }).userId;
      setTypingDM(currentUser.id, targetId);
      setTimeout(() => clearTypingDM(currentUser.id, targetId), 3000);
    } else {
      setTyping(currentUser.id, workspaceId!);
      setTimeout(() => clearTyping(currentUser.id, workspaceId!), 3000);
    }
  };

  const handleSaveAutoDeleteDays = () => {
    const days = parseInt(autoDeleteDaysInput);
    if (isNaN(days) || days < 1) { toast.error('Enter a valid number of days'); return; }
    setAutoDeleteDays(workspace!.id, days);
    toast.success(`Auto-delete set to ${days} days`);
  };

  const handlePayNow = () => {
    ensureSubscription(currentUser.id, currentUser.displayName, workspaceId!);
    recordPayment(currentUser.id, currentUser.displayName, workspaceId!);
    toast.success('Payment recorded and super admin notified');
  };

  const isUserChatEnabled = (user: User) => {
    if (user.chatEnabled !== undefined) return user.chatEnabled;
    return workspace?.globalChatEnabled ?? false;
  };

  const openDM = (userId: string) => { setChatView({ type: 'dm', userId }); setShowSidebar(false); };
  const openGroup = (groupId: string) => { setChatView({ type: 'group', groupId }); setShowSidebar(false); };

  return (
    <div className="h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[340px] lg:w-[400px] border-r border-border bg-card shrink-0`}>
        {/* WhatsApp-style header */}
        <div className="h-14 px-4 flex items-center justify-between bg-wa-header shrink-0">
          <div className="flex items-center gap-3">
            <ProfileAvatar
              userId={currentUser.id}
              displayName={currentUser.displayName}
              avatar={currentUser.avatar}
              size="sm"
              editable
            />
            <h1 className="font-semibold text-[15px] text-wa-header-fg truncate">{workspace?.name || workspaceId}</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg">
                  <UserPlus className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserName">Display Name</Label>
                    <Input id="newUserName" placeholder="e.g. John Doe" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newUserPhone">Phone Number</Label>
                    <Input id="newUserPhone" placeholder="e.g. +91 98765 43210" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleCreateUser}>Add User</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg">
                  <Settings className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md max-h-[85dvh] overflow-y-auto">
                <DialogHeader><DialogTitle>Chat Settings</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {/* Allow replies */}
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                    <div>
                      <p className="font-medium text-sm">Allow User Replies</p>
                      <p className="text-xs text-muted-foreground">Global default for all users</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toggleGlobalChat(workspaceId!)} className="gap-1.5">
                      {workspace?.globalChatEnabled ? (
                        <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-primary text-xs">On</span></>
                      ) : (
                        <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground text-xs">Off</span></>
                      )}
                    </Button>
                  </div>

                  {/* Auto-delete messages */}
                  <div className="p-3 bg-secondary rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-primary" />
                          Auto-Delete Messages
                        </p>
                        <p className="text-xs text-muted-foreground">Automatically hide old messages</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => workspace && toggleAutoDelete(workspace.id)}
                        className="gap-1.5"
                      >
                        {autoDeleteEnabled ? (
                          <><ToggleRight className="w-5 h-5 text-primary" /><span className="text-primary text-xs">On</span></>
                        ) : (
                          <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground text-xs">Off</span></>
                        )}
                      </Button>
                    </div>
                    {autoDeleteEnabled && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={autoDeleteDaysInput}
                          onChange={(e) => setAutoDeleteDaysInput(e.target.value)}
                          className="h-8 w-20 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">days</span>
                        <Button size="sm" className="h-8 text-xs" onClick={handleSaveAutoDeleteDays}>Save</Button>
                        <span className="text-xs text-muted-foreground">(currently {autoDeleteDays}d)</span>
                      </div>
                    )}
                  </div>

                  {/* Subscription / Payment */}
                  {(() => {
                    const sub = getSubscription(currentUser.id);
                    const status = getPaymentStatus(currentUser.id);
                    const daysLeft = getDaysRemaining(currentUser.id);
                    const statusConfig = {
                      active: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Active' },
                      expiring_soon: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Expiring Soon' },
                      overdue: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Overdue' },
                      not_set: { icon: CreditCard, color: 'text-muted-foreground', bg: 'bg-secondary', label: 'Not Set' },
                    }[status];
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`p-3 rounded-xl space-y-3 ${statusConfig.bg} border ${status === 'overdue' ? 'border-destructive/30' : status === 'expiring_soon' ? 'border-amber-500/30' : 'border-border'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-primary" />
                            <p className="font-medium text-sm">Monthly Subscription</p>
                          </div>
                          <div className={`flex items-center gap-1 text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-background/60 rounded-lg p-2">
                            <p className="text-muted-foreground">Monthly Fee</p>
                            <p className="font-semibold text-foreground mt-0.5">
                              {sub?.monthlyAmount ? `$${sub.monthlyAmount}` : 'Not set'}
                            </p>
                          </div>
                          <div className="bg-background/60 rounded-lg p-2">
                            <p className="text-muted-foreground">
                              {status === 'overdue' ? 'Days Overdue' : 'Days Remaining'}
                            </p>
                            <p className={`font-semibold mt-0.5 ${status === 'overdue' ? 'text-destructive' : status === 'expiring_soon' ? 'text-amber-500' : 'text-foreground'}`}>
                              {daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d` : `${daysLeft}d`) : '—'}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Billing cycle: {getBillingCycleDays(currentUser.id)} days
                          </p>
                        {sub?.lastPaidAt && (
                          <p className="text-[10px] text-muted-foreground">
                            Last paid: {format(new Date(sub.lastPaidAt), 'MMM d, yyyy')}
                            {sub.nextDueAt && ` · Next due: ${format(new Date(sub.nextDueAt), 'MMM d, yyyy')}`}
                          </p>
                        )}
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={handlePayNow}
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          Pay Now
                        </Button>
                      </div>
                    );
                  })()}

                  {/* Per-user overrides */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Per-User Override</p>
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No users yet</p>
                    ) : (
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {users.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-xs shrink-0">
                                {user.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm truncate block">{user.displayName}</span>
                                {user.phone && <span className="text-[10px] text-muted-foreground">{getMaskedPhone(user.id)}</span>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => toggleUserChat(user.id)} className="gap-1 shrink-0">
                              {isUserChatEnabled(user) ? (
                                <><ToggleRight className="w-4 h-4 text-primary" /><span className="text-primary text-[10px]">On</span></>
                              ) : (
                                <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground text-[10px]">Off</span></>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg" onClick={() => { logout(); router.push('/'); }}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-2.5 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-2 bg-wa-sidebar-header rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <JoinRequestsList workspaceId={workspaceId!} />

          {/* User DMs */}
          {filteredUsers.map((user) => {
            const preview = getConversationPreview(workspaceId!, currentUser.id, user.id);
            const dmUnread = getUnreadDMCount(workspaceId!, currentUser.id, user.id);
            const isActive = typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId === user.id;
            return (
              <button
                key={user.id}
                onClick={() => openDM(user.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-secondary/60 transition-colors border-b border-border/30 ${isActive ? 'bg-secondary' : ''}`}
              >
                <ProfileAvatar
                  userId={user.id}
                  displayName={user.displayName}
                  avatar={user.avatar}
                  size="md"
                  showOnlineStatus
                  isOnline={checkOnline(user.id)}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[15px] text-foreground truncate">{user.displayName}</p>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {preview && (
                        <span className={`text-[11px] ${dmUnread > 0 ? 'text-wa-unread font-medium' : 'text-muted-foreground'}`}>
                          {format(new Date(preview.timestamp), 'h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                      {isUserChatEnabled(user) && (
                        <MessageCircle className="w-3 h-3 text-primary shrink-0" />
                      )}
                      <p className="text-[13px] text-muted-foreground truncate">
                        {preview
                          ? preview.audioUrl ? '🎤 Voice message'
                            : preview.imageUrl ? '📷 Photo'
                            : preview.text || ''
                          : 'No messages yet'}
                      </p>
                    </div>
                    <UnreadBadge count={dmUnread} />
                  </div>
                </div>
              </button>
            );
          })}

          {filteredUsers.length === 0 && !searchQuery && (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No users yet</p>
              <p className="text-xs mt-1">Users will appear when they join</p>
            </div>
          )}

          {/* Groups */}
          <GroupManager
            workspaceId={workspaceId!}
            adminId={currentUser.id}
            adminName={currentUser.displayName}
            users={users}
            onGroupSelect={openGroup}
            activeGroupId={typeof chatView === 'object' && chatView.type === 'group' ? chatView.groupId : undefined}
          />
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {/* WhatsApp-style chat header */}
        <div className="h-14 px-3 flex items-center justify-between bg-wa-header shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden shrink-0 text-wa-header-fg/80 hover:bg-wa-teal-dark"
              onClick={() => setShowSidebar(true)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {activeDMUser ? (
              <>
                <ProfileAvatar
                  userId={activeDMUser.id}
                  displayName={activeDMUser.displayName}
                  avatar={activeDMUser.avatar}
                  size="sm"
                  showOnlineStatus
                  isOnline={checkOnline(activeDMUser.id)}
                />
                <div className="min-w-0">
                  <p className="font-medium text-[15px] text-wa-header-fg truncate">{activeDMUser.displayName}</p>
                  <OnlineStatus isOnline={checkOnline(activeDMUser.id)} lastSeen={getLastSeen(activeDMUser.id)} size="sm" />
                </div>
              </>
            ) : activeGroup ? (
              <button
                onClick={() => setGroupInfoOpen(true)}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-wa-header-fg" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-medium text-[15px] text-wa-header-fg truncate">{activeGroup.name}</p>
                  <p className="text-[12px] text-wa-header-fg/60">{activeGroup.memberIds.length}/1000 members</p>
                </div>
              </button>
            ) : null}
          </div>
          {activeDMUser && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 h-8 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg"
                onClick={() => { toggleUserChat(activeDMUser.id); toast.success('Chat permission updated'); }}
              >
                {isUserChatEnabled(activeDMUser) ? (
                  <><ToggleRight className="w-4 h-4" /><span className="hidden sm:inline">Chat On</span></>
                ) : (
                  <><ToggleLeft className="w-4 h-4" /><span className="hidden sm:inline">Chat Off</span></>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-wa-header-fg/60 hover:bg-wa-teal-dark hover:text-destructive h-8 w-8"
                onClick={() => { deleteUser(activeDMUser.id); setChatView({ type: 'dm', userId: '' }); toast.success('User removed'); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Messages */}
        <MessageFeed
          messages={activeMessages}
          currentUserId={currentUser.id}
          isAdmin
          isGroupChat={typeof chatView === 'object' && chatView.type === 'group'}
          showUserDetails
          getSenderName={(senderId) => {
            const u = getUserById(senderId);
            return u?.displayName || 'Unknown';
          }}
          getSenderPhone={(senderId) => {
            const u = getUserById(senderId);
            return u?.phone || '';
          }}
          getSenderAvatar={(senderId) => {
            const u = getUserById(senderId);
            return u?.avatar;
          }}
          onReply={(msg) => {
            const u = getUserById(msg.senderId);
            setReplyingTo({ message: msg, senderName: u?.displayName || 'Unknown' });
          }}
          onForward={(msg) => setForwardMsg(msg)}
          onDelete={handleDelete}
        />

        {typeof chatView === 'object' && chatView.type === 'dm' && checkTypingDM(chatView.userId, currentUser.id) && (
          <TypingIndicator name={activeDMUser?.displayName || 'User'} />
        )}

        {messagingEnabled ? (
          <MessageComposer
            onSend={handleSend}
            onTyping={handleTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        ) : (
          <div className="px-4 py-3 bg-destructive/10 border-t border-destructive/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">Messaging has been disabled by super admin.</p>
          </div>
        )}

        {activeGroup && (
          <GroupInfoPanel group={activeGroup} open={groupInfoOpen} onOpenChange={setGroupInfoOpen} />
        )}

        <ForwardDialog
          message={forwardMsg}
          open={!!forwardMsg}
          onOpenChange={(open) => !open && setForwardMsg(null)}
          workspaceId={workspaceId!}
          currentUserId={currentUser.id}
          adminId={currentUser.id}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
