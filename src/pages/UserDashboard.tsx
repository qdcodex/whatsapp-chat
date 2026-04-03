import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { format } from 'date-fns';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGroupStore } from '@/stores/groupStore';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import TypingIndicator from '@/components/TypingIndicator';
import OnlineStatus from '@/components/OnlineStatus';
import { LogOut, Users, ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileAvatar from '@/components/ProfileAvatar';
import GroupInfoPanel from '@/components/GroupInfoPanel';
import UnreadBadge from '@/components/UnreadBadge';
import ContactImporter, { type ContactEntry } from '@/components/ContactImporter';
import type { ChatView } from '@/types';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout, getUserById, getMaskedPhone, createUser } = useAuthStore();
  const { getDMMessages, getGroupMessages, sendMessage, markAsRead, getUnreadDMCount, getUnreadGroupCount } = useMessageStore();
  const { getWorkspaceByAdmin } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, isTyping: checkTyping, setTyping, clearTyping } = usePresenceStore();
  const { getUserGroups, isMemberMuted, addMember } = useGroupStore();
  const [chatView, setChatView] = useState<ChatView>({ type: 'dm', userId: '' });
  const [showSidebar, setShowSidebar] = useState(true);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ message: import('@/types').Message; senderName: string } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setOnline(currentUser.id);
    const heartbeat = setInterval(() => setOnline(currentUser.id), 15000);
    const ticker = setInterval(() => setTick((t) => t + 1), 2000);
    return () => { clearInterval(heartbeat); clearInterval(ticker); };
  }, [currentUser, setOnline]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'user') {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  // Initialize chatView with admin DM once we know adminId
  useEffect(() => {
    if (currentUser?.adminId) {
      setChatView((prev) => {
        if (typeof prev === 'object' && prev.type === 'dm' && prev.userId === '') {
          return { type: 'dm', userId: currentUser.adminId! };
        }
        return prev;
      });
    }
  }, [currentUser?.adminId]);

  if (!currentUser || currentUser.role !== 'user') return null;

  const workspace = getWorkspaceByAdmin(currentUser.adminId!);
  const slug = workspace?.slug || '';
  const groups = getUserGroups(currentUser.id);
  const admin = getUserById(currentUser.adminId!);

  const getActiveMessages = () => {
    if (typeof chatView === 'object' && chatView.type === 'dm') {
      return getDMMessages(slug, currentUser.id, currentUser.adminId!);
    }
    if (typeof chatView === 'object' && chatView.type === 'group') {
      return getGroupMessages(chatView.groupId);
    }
    return [];
  };

  const activeMessages = getActiveMessages();
  const isDMChat = typeof chatView === 'object' && chatView.type === 'dm';
  const isGroupChat = typeof chatView === 'object' && chatView.type === 'group';
  const activeGroup = isGroupChat ? groups.find(g => g.id === (chatView as { type: 'group'; groupId: string }).groupId) : null;

  // Mark incoming messages as read
  const unread = activeMessages.filter((m) => m.senderId !== currentUser.id && m.status !== 'read');
  if (unread.length > 0) markAsRead(unread.map((m) => m.id));

  const adminOnline = checkOnline(currentUser.adminId!);
  const adminTyping = checkTyping(currentUser.adminId!, slug);

  const isChatEnabled = (() => {
    if (currentUser.chatEnabled !== undefined) return currentUser.chatEnabled;
    return workspace?.globalChatEnabled ?? false;
  })();

  const handleSend = (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
    const replyData = replyingTo ? {
      replyTo: {
        messageId: replyingTo.message.id,
        text: replyingTo.message.text,
        senderName: replyingTo.senderName,
      },
    } : {};

    if (isGroupChat && activeGroup) {
      sendMessage({
        adminId: activeGroup.adminId,
        workspaceId: slug,
        senderId: currentUser.id,
        groupId: activeGroup.id,
        text, imageUrl, audioUrl, audioDuration,
        ...replyData,
      });
    } else {
      sendMessage({
        adminId: currentUser.adminId!,
        workspaceId: slug,
        senderId: currentUser.id,
        recipientId: currentUser.adminId!,
        text, imageUrl, audioUrl, audioDuration,
        ...replyData,
      });
    }
    setReplyingTo(null);
  };

  const handleTyping = () => {
    setTyping(currentUser.id, slug);
    setTimeout(() => clearTyping(currentUser.id, slug), 3000);
  };

  const handleInviteContacts = (groupId: string, contacts: ContactEntry[]) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    contacts.forEach((c) => {
      const existing = getUserById(c.phone.trim());
      if (existing) {
        addMember(groupId, existing.id);
      } else {
        const newUser = createUser({
          username: c.phone.trim(),
          password: Math.random().toString(36).slice(2, 10),
          role: 'user',
          displayName: c.name.trim(),
          phone: c.phone.trim(),
          workspaceId: slug,
          adminId: currentUser.adminId!,
        });
        addMember(groupId, newUser.id);
      }
    });
  };

  return (
    <div className="h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card shrink-0`}>
        <div className="h-14 px-3 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ProfileAvatar
              userId={currentUser.id}
              displayName={currentUser.displayName}
              avatar={currentUser.avatar}
              size="sm"
              editable
            />
            <h1 className="font-bold text-sm text-foreground truncate">{workspace?.name || 'Messages'}</h1>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { logout(); navigate('/'); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Admin DM */}
          {(() => {
            const dmMsgs = getDMMessages(slug, currentUser.id, currentUser.adminId!);
            const lastMsg = dmMsgs[dmMsgs.length - 1];
            const dmUnread = getUnreadDMCount(slug, currentUser.id, currentUser.adminId!);
            return (
              <button
                onClick={() => { setChatView({ type: 'dm', userId: currentUser.adminId! }); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border ${isDMChat ? 'bg-secondary' : ''}`}
              >
                <ProfileAvatar
                  userId={currentUser.adminId!}
                  displayName={admin?.displayName || 'Admin'}
                  avatar={admin?.avatar}
                  size="md"
                  showOnlineStatus
                  isOnline={adminOnline}
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground truncate">{admin?.displayName || 'Admin'}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <UnreadBadge count={dmUnread} />
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(lastMsg.timestamp), 'hh:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastMsg
                      ? lastMsg.audioUrl ? '🎤 Voice message'
                        : lastMsg.imageUrl ? '📷 Photo'
                        : lastMsg.text || 'Tap to chat'
                      : 'Tap to chat'}
                  </p>
                </div>
              </button>
            );
          })()}

          {/* Group list */}
          {groups.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Groups</p>
            </div>
          )}
          {groups.map((group) => {
            const isActive = typeof chatView === 'object' && chatView.type === 'group' && chatView.groupId === group.id;
            const groupMsgs = getGroupMessages(group.id);
            const lastMsg = groupMsgs[groupMsgs.length - 1];
            const lastSender = lastMsg ? getUserById(lastMsg.senderId) : null;
            return (
              <div
                key={group.id}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 cursor-pointer ${isActive ? 'bg-secondary' : ''}`}
                onClick={() => { setChatView({ type: 'group', groupId: group.id }); setShowSidebar(false); }}
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{group.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <UnreadBadge count={getUnreadGroupCount(group.id, currentUser.id)} />
                      {lastMsg && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(lastMsg.timestamp), 'hh:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastMsg
                      ? `${lastMsg.senderId === currentUser.id ? 'You' : (lastSender?.displayName || 'Unknown')}: ${
                          lastMsg.audioUrl ? '🎤 Voice message'
                            : lastMsg.imageUrl ? '📷 Photo'
                            : lastMsg.text || ''
                        }`
                      : `${group.memberIds.length} members`}
                  </p>
                </div>
                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                  <ContactImporter
                    triggerLabel="Invite"
                    onImport={(contacts) => handleInviteContacts(group.id, contacts)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
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
            {isDMChat ? (
              <>
                <ProfileAvatar
                  userId={currentUser.adminId!}
                  displayName={admin?.displayName || 'Admin'}
                  avatar={admin?.avatar}
                  size="sm"
                  showOnlineStatus
                  isOnline={adminOnline}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{admin?.displayName || 'Admin'}</p>
                  <OnlineStatus isOnline={adminOnline} size="sm" />
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
        </div>

        <MessageFeed
          messages={activeMessages}
          currentUserId={currentUser.id}
          isGroupChat={isGroupChat}
          showUserDetails={isGroupChat}
          getSenderName={(senderId) => {
            const u = getUserById(senderId);
            return u?.displayName || 'Unknown';
          }}
          getSenderPhone={(senderId) => getMaskedPhone(senderId)}
          getSenderAvatar={(senderId) => {
            const u = getUserById(senderId);
            return u?.avatar;
          }}
          onReply={(msg) => {
            const u = getUserById(msg.senderId);
            setReplyingTo({ message: msg, senderName: u?.displayName || 'Unknown' });
          }}
        />
        {isDMChat && adminTyping && <TypingIndicator name={admin?.displayName || 'Admin'} />}
        {(() => {
          if (isDMChat) return isChatEnabled;
          if (isGroupChat && activeGroup) return !isMemberMuted(activeGroup.id, currentUser.id);
          return true;
        })() ? (
          <MessageComposer
            onSend={handleSend}
            onTyping={handleTyping}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        ) : (
          <div className="px-4 py-3 text-center border-t border-border bg-card">
            <p className="text-sm text-muted-foreground">
              {isGroupChat ? '🔇 You are muted in this group' : '💬 Chat is disabled'}
            </p>
          </div>
        )}

        {activeGroup && (
          <GroupInfoPanel group={activeGroup} open={groupInfoOpen} onOpenChange={setGroupInfoOpen} />
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
