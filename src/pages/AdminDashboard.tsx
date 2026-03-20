import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGroupStore } from '@/stores/groupStore';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import OnlineStatus from '@/components/OnlineStatus';
import TypingIndicator from '@/components/TypingIndicator';
import GroupManager from '@/components/GroupManager';
import JoinRequestsList from '@/components/JoinRequestsList';
import GroupInfoPanel from '@/components/GroupInfoPanel';
import UnreadBadge from '@/components/UnreadBadge';
import {
  Radio, LogOut, Users, Plus, Trash2, UserPlus, ArrowLeft,
  Settings, MessageCircle, Megaphone, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { ChatView, User } from '@/types';

const AdminDashboard = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { currentUser, logout, getUsersByAdmin, createUser, deleteUser, toggleUserChat, getMaskedPhone, getUserById } = useAuthStore();
  const { sendMessage, getBroadcastMessages, getDMMessages, getGroupMessages, getConversationPreview, markAsRead, getUnreadDMCount, getUnreadGroupCount, getUnreadBroadcastCount } = useMessageStore();
  const { getWorkspaceBySlug, toggleGlobalChat } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, getLastSeen, setTyping, clearTyping, isTyping: checkTyping } = usePresenceStore();
  const { getGroupsByWorkspace, getGroupById } = useGroupStore();

  const [chatView, setChatView] = useState<ChatView>('broadcast');
  const [showSidebar, setShowSidebar] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '', phone: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);

  // Request notification permission
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
      navigate('/', { replace: true });
    }
  }, [currentUser, workspaceId, navigate]);

  // Mark messages as read when viewing a DM
  useEffect(() => {
    if (!currentUser || chatView === 'broadcast') return;
    if (typeof chatView === 'object' && chatView.type === 'dm') {
      const msgs = getDMMessages(workspaceId!, currentUser.id, chatView.userId);
      const unread = msgs.filter((m) => m.senderId !== currentUser.id && m.status !== 'read');
      if (unread.length > 0) markAsRead(unread.map((m) => m.id));
    }
  }, [chatView, currentUser, workspaceId]);

  if (!currentUser || currentUser.role !== 'admin' || currentUser.workspaceId !== workspaceId) {
    return null;
  }

  const workspace = getWorkspaceBySlug(workspaceId!);
  const users = getUsersByAdmin(currentUser.id);
  const groups = getGroupsByWorkspace(workspaceId!);

  // Determine active messages based on chat view
  const getActiveMessages = () => {
    if (chatView === 'broadcast') return getBroadcastMessages(workspaceId!);
    if (chatView.type === 'dm') return getDMMessages(workspaceId!, currentUser.id, chatView.userId);
    if (chatView.type === 'group') return getGroupMessages(chatView.groupId);
    return [];
  };
  const activeMessages = getActiveMessages();

  const activeDMUser = (typeof chatView === 'object' && chatView.type === 'dm')
    ? users.find((u) => u.id === chatView.userId)
    : null;

  const activeGroup = (typeof chatView === 'object' && chatView.type === 'group')
    ? getGroupById(chatView.groupId)
    : null;

  const handleSend = (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
    const msgBase = {
      adminId: currentUser.id,
      workspaceId: workspaceId!,
      senderId: currentUser.id,
    };

    if (chatView === 'broadcast') {
      sendMessage({ ...msgBase, text, imageUrl, audioUrl, audioDuration });
    } else if (chatView.type === 'dm') {
      sendMessage({ ...msgBase, recipientId: chatView.userId, text, imageUrl, audioUrl, audioDuration });
    } else if (chatView.type === 'group') {
      sendMessage({ ...msgBase, groupId: chatView.groupId, text, imageUrl, audioUrl, audioDuration });
    }

    toast.success(chatView === 'broadcast' ? 'Broadcast sent!' : 'Message sent!');
  };

  const handleTyping = () => {
    setTyping(currentUser.id, workspaceId!);
    setTimeout(() => clearTyping(currentUser.id, workspaceId!), 3000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUser({ ...newUser, role: 'user', adminId: currentUser.id, workspaceId: workspaceId });
    setNewUser({ username: '', password: '', displayName: '', phone: '' });
    setDialogOpen(false);
    toast.success('User created');
  };

  const isUserChatEnabled = (user: User) => {
    if (user.chatEnabled !== undefined) return user.chatEnabled;
    return workspace?.globalChatEnabled ?? false;
  };

  const openDM = (userId: string) => {
    setChatView({ type: 'dm', userId });
    setShowSidebar(false);
  };

  const openGroup = (groupId: string) => {
    setChatView({ type: 'group', groupId });
    setShowSidebar(false);
  };

  return (
    <div className="h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card shrink-0`}>
        {/* Sidebar Header */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-bold text-sm text-foreground truncate">{workspace?.name || workspaceId}</h1>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                <DialogHeader><DialogTitle>Chat Settings</DialogTitle></DialogHeader>
                <div className="space-y-4">
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><UserPlus className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+1 234 567 8900" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
                  </div>
                  <Button type="submit" className="w-full rounded-xl">Create User</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {/* Join Requests */}
          <JoinRequestsList workspaceId={workspaceId!} />

          {/* Broadcast channel */}
          <button
            onClick={() => { setChatView('broadcast'); setShowSidebar(false); }}
            className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border ${chatView === 'broadcast' ? 'bg-secondary' : ''}`}
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground">Broadcast</p>
                <span className="text-[10px] text-muted-foreground">{users.length} users</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">Tap to send to all users</p>
            </div>
          </button>

          {/* User DM list */}
          {users.map((user) => {
            const preview = getConversationPreview(workspaceId!, currentUser.id, user.id);
            const isActive = typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId === user.id;
            return (
              <button
                key={user.id}
                onClick={() => openDM(user.id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${isActive ? 'bg-secondary' : ''}`}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${checkOnline(user.id) ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{user.displayName}</p>
                    {preview && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                        {format(new Date(preview.timestamp), 'hh:mm a')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {isUserChatEnabled(user) && (
                      <MessageCircle className="w-3 h-3 text-primary shrink-0" />
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {preview
                        ? preview.audioUrl ? '🎤 Voice message'
                          : preview.imageUrl ? '📷 Photo'
                          : preview.text || ''
                        : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {users.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No users yet</p>
              <p className="text-xs mt-1">Add users to start chatting</p>
            </div>
          )}

          {/* Groups */}
          <GroupManager
            workspaceId={workspaceId!}
            adminId={currentUser.id}
            users={users}
            onGroupSelect={openGroup}
            activeGroupId={typeof chatView === 'object' && chatView.type === 'group' ? chatView.groupId : undefined}
          />
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        {/* Chat Header */}
        <div className="h-14 px-3 flex items-center justify-between border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden shrink-0"
              onClick={() => setShowSidebar(true)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {chatView === 'broadcast' ? (
              <>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">Broadcast</p>
                  <p className="text-[11px] text-muted-foreground">{users.length} recipients</p>
                </div>
              </>
            ) : activeDMUser ? (
              <>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm">
                    {activeDMUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${checkOnline(activeDMUser.id) ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{activeDMUser.displayName}</p>
                  <OnlineStatus isOnline={checkOnline(activeDMUser.id)} lastSeen={getLastSeen(activeDMUser.id)} size="sm" />
                </div>
              </>
            ) : activeGroup ? (
              <button
                onClick={() => setGroupInfoOpen(true)}
                className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-semibold text-sm text-foreground truncate">{activeGroup.name}</p>
                  <p className="text-[11px] text-muted-foreground">{activeGroup.memberIds.length} members · tap for info</p>
                </div>
              </button>
            ) : null}
          </div>
          {activeDMUser && (
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 h-8"
                onClick={() => { toggleUserChat(activeDMUser.id); toast.success('Chat permission updated'); }}
              >
                {isUserChatEnabled(activeDMUser) ? (
                  <><ToggleRight className="w-4 h-4 text-primary" /><span className="hidden sm:inline">Chat On</span></>
                ) : (
                  <><ToggleLeft className="w-4 h-4 text-muted-foreground" /><span className="hidden sm:inline">Chat Off</span></>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                onClick={() => { deleteUser(activeDMUser.id); setChatView('broadcast'); toast.success('User removed'); }}
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
          getSenderName={(senderId) => {
            const u = getUserById(senderId);
            return u?.displayName || 'Unknown';
          }}
        />

        {/* Typing indicator */}
        {typeof chatView === 'object' && chatView.type === 'dm' && checkTyping(chatView.userId, workspaceId!) && (
          <TypingIndicator name={activeDMUser?.displayName || 'User'} />
        )}

        {/* Composer */}
        <MessageComposer onSend={handleSend} onTyping={handleTyping} />

        {activeGroup && (
          <GroupInfoPanel group={activeGroup} open={groupInfoOpen} onOpenChange={setGroupInfoOpen} />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
