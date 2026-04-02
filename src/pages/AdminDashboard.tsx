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
  Radio, LogOut, Users, Trash2, ArrowLeft,
  Settings, MessageCircle, Megaphone, ToggleLeft, ToggleRight,
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
  const { sendMessage, getBroadcastMessages, getDMMessages, getGroupMessages, getConversationPreview, markAsRead, getUnreadDMCount, getUnreadGroupCount, getUnreadBroadcastCount } = useMessageStore();
  const { getWorkspaceBySlug, toggleGlobalChat } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, getLastSeen, setTyping, clearTyping, isTyping: checkTyping } = usePresenceStore();
  const { getGroupsByWorkspace, getGroupById } = useGroupStore();

  const [chatView, setChatView] = useState<ChatView>('broadcast');
  const [showSidebar, setShowSidebar] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ message: import('@/types').Message; senderName: string } | null>(null);
  const [forwardMsg, setForwardMsg] = useState<import('@/types').Message | null>(null);
  

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

    if (chatView === 'broadcast') {
      sendMessage({ ...msgBase, text, imageUrl, audioUrl, audioDuration });
    } else if (chatView.type === 'dm') {
      sendMessage({ ...msgBase, recipientId: chatView.userId, text, imageUrl, audioUrl, audioDuration });
    } else if (chatView.type === 'group') {
      sendMessage({ ...msgBase, groupId: chatView.groupId, text, imageUrl, audioUrl, audioDuration });
    }

    setReplyingTo(null);
    toast.success(chatView === 'broadcast' ? 'Broadcast sent!' : 'Message sent!');
  };

  const handleTyping = () => {
    setTyping(currentUser.id, workspaceId!);
    setTimeout(() => clearTyping(currentUser.id, workspaceId!), 3000);
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
            <ProfileAvatar
              userId={currentUser.id}
              displayName={currentUser.displayName}
              avatar={currentUser.avatar}
              size="sm"
              editable
            />
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
                <div className="flex items-center gap-1.5">
                  <UnreadBadge count={getUnreadBroadcastCount(workspaceId!, currentUser.id)} />
                  <span className="text-[10px] text-muted-foreground">{users.length} users</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground truncate">Tap to send to all users</p>
            </div>
          </button>

          {/* User DM list */}
          {users.map((user) => {
            const preview = getConversationPreview(workspaceId!, currentUser.id, user.id);
            const dmUnread = getUnreadDMCount(workspaceId!, currentUser.id, user.id);
            const isActive = typeof chatView === 'object' && chatView.type === 'dm' && chatView.userId === user.id;
            return (
              <button
                key={user.id}
                onClick={() => openDM(user.id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${isActive ? 'bg-secondary' : ''}`}
              >
                <div className="relative shrink-0">
                  <ProfileAvatar
                    userId={user.id}
                    displayName={user.displayName}
                    avatar={user.avatar}
                    size="md"
                    showOnlineStatus
                    isOnline={checkOnline(user.id)}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{user.displayName}</p>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <UnreadBadge count={dmUnread} />
                      {preview && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(preview.timestamp), 'hh:mm a')}
                        </span>
                      )}
                    </div>
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
                <ProfileAvatar
                  userId={activeDMUser.id}
                  displayName={activeDMUser.displayName}
                  avatar={activeDMUser.avatar}
                  size="sm"
                  showOnlineStatus
                  isOnline={checkOnline(activeDMUser.id)}
                />
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

        {/* Typing indicator */}
        {typeof chatView === 'object' && chatView.type === 'dm' && checkTyping(chatView.userId, workspaceId!) && (
          <TypingIndicator name={activeDMUser?.displayName || 'User'} />
        )}

        {/* Composer */}
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
