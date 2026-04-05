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
import ForwardDialog from '@/components/ForwardDialog';
import {
  LogOut, Users, Trash2, ArrowLeft,
  Settings, MessageCircle, ToggleLeft, ToggleRight,
  Search,
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
import type { ChatView, User } from '@/types';

const AdminDashboard = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { currentUser, logout, getUsersByAdmin, deleteUser, toggleUserChat, getMaskedPhone, getUserById } = useAuthStore();
  const { sendMessage, getDMMessages, getGroupMessages, getConversationPreview, markAsRead, getUnreadDMCount, getUnreadGroupCount } = useMessageStore();
  const { getWorkspaceBySlug, toggleGlobalChat } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, getLastSeen, setTyping, clearTyping, isTyping: checkTyping } = usePresenceStore();
  const { getGroupsByWorkspace, getGroupById } = useGroupStore();

  const [chatView, setChatView] = useState<ChatView>({ type: 'dm', userId: '' });
  const [showSidebar, setShowSidebar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ message: import('@/types').Message; senderName: string } | null>(null);
  const [forwardMsg, setForwardMsg] = useState<import('@/types').Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (!currentUser) return;
    if (typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId) {
      const msgs = getDMMessages(workspaceId!, currentUser.id, chatView.userId);
      const unread = msgs.filter((m) => m.senderId !== currentUser.id && m.status !== 'read');
      if (unread.length > 0) markAsRead(unread.map((m) => m.id));
    }
  }, [chatView, currentUser, workspaceId]);

  if (!currentUser || currentUser.role !== 'admin' || currentUser.workspaceId !== workspaceId) return null;

  const workspace = getWorkspaceBySlug(workspaceId!);
  const users = getUsersByAdmin(currentUser.id);
  const groups = getGroupsByWorkspace(workspaceId!);

  const filteredUsers = searchQuery
    ? users.filter(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || u.phone?.includes(searchQuery))
    : users;

  const getActiveMessages = () => {
    if (typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId) return getDMMessages(workspaceId!, currentUser.id, chatView.userId);
    if (typeof chatView === 'object' && chatView.type === 'group') return getGroupMessages(chatView.groupId);
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

  const handleTyping = () => {
    setTyping(currentUser.id, workspaceId!);
    setTimeout(() => clearTyping(currentUser.id, workspaceId!), 3000);
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
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg">
                  <Settings className="w-5 h-5" />
                </Button>
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
            <Button variant="ghost" size="icon" className="h-9 w-9 text-wa-header-fg/80 hover:bg-wa-teal-dark hover:text-wa-header-fg" onClick={() => { logout(); navigate('/'); }}>
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
                  <p className="text-[12px] text-wa-header-fg/60">{activeGroup.memberIds.length} members</p>
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
        />

        {typeof chatView === 'object' && chatView.type === 'dm' && checkTyping(chatView.userId, workspaceId!) && (
          <TypingIndicator name={activeDMUser?.displayName || 'User'} />
        )}

        <MessageComposer
          onSend={handleSend}
          onTyping={handleTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />

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
