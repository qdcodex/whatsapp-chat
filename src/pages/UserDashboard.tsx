import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { useGroupStore } from '@/stores/groupStore';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import TypingIndicator from '@/components/TypingIndicator';
import OnlineStatus from '@/components/OnlineStatus';
import { Radio, LogOut, Users, ArrowLeft, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GroupInfoPanel from '@/components/GroupInfoPanel';
import type { ChatView } from '@/types';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout, getUserById } = useAuthStore();
  const { getBroadcastMessages, getDMMessages, getGroupMessages, sendMessage, markAsRead } = useMessageStore();
  const { getWorkspaceByAdmin } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, isTyping: checkTyping, setTyping, clearTyping } = usePresenceStore();
  const { getUserGroups } = useGroupStore();
  const [chatView, setChatView] = useState<ChatView>('broadcast');
  const [showSidebar, setShowSidebar] = useState(true);
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

  if (!currentUser || currentUser.role !== 'user') return null;

  const workspace = getWorkspaceByAdmin(currentUser.adminId!);
  const slug = workspace?.slug || '';
  const groups = getUserGroups(currentUser.id);

  const getActiveMessages = () => {
    if (chatView === 'broadcast') {
      const broadcastMsgs = getBroadcastMessages(slug);
      const dmMsgs = getDMMessages(slug, currentUser.id, currentUser.adminId!);
      return [...broadcastMsgs, ...dmMsgs].sort((a, b) => a.timestamp - b.timestamp);
    }
    if (typeof chatView === 'object' && chatView.type === 'group') {
      return getGroupMessages(chatView.groupId);
    }
    return [];
  };

  const activeMessages = getActiveMessages();
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
    if (isGroupChat && activeGroup) {
      sendMessage({
        adminId: activeGroup.adminId,
        workspaceId: slug,
        senderId: currentUser.id,
        groupId: activeGroup.id,
        text,
        imageUrl,
        audioUrl,
        audioDuration,
      });
    } else {
      sendMessage({
        adminId: currentUser.adminId!,
        workspaceId: slug,
        senderId: currentUser.id,
        recipientId: currentUser.adminId!,
        text,
        imageUrl,
        audioUrl,
        audioDuration,
      });
    }
  };

  const handleTyping = () => {
    setTyping(currentUser.id, slug);
    setTimeout(() => clearTyping(currentUser.id, slug), 3000);
  };

  const hasGroups = groups.length > 0;

  // If user has no groups, show the simple single-view layout
  if (!hasGroups) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-10 shrink-0">
          <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm text-foreground truncate">{workspace?.name || 'Messages'}</h1>
                <OnlineStatus isOnline={adminOnline} size="sm" />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full min-h-0">
          <MessageFeed messages={activeMessages} currentUserId={currentUser.id} />
          {adminTyping && <TypingIndicator name="Admin" />}
          {isChatEnabled && <MessageComposer onSend={handleSend} onTyping={handleTyping} />}
        </div>
      </div>
    );
  }

  // User has groups - show sidebar layout like admin
  return (
    <div className="h-[100dvh] flex bg-background">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border bg-card shrink-0`}>
        <div className="h-14 px-3 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary" />
            </div>
            <h1 className="font-bold text-sm text-foreground truncate">{workspace?.name || 'Messages'}</h1>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => { logout(); navigate('/'); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Main channel (broadcast + DM) */}
          <button
            onClick={() => { setChatView('broadcast'); setShowSidebar(false); }}
            className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border ${chatView === 'broadcast' ? 'bg-secondary' : ''}`}
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-sm text-foreground">Main Channel</p>
              <p className="text-xs text-muted-foreground truncate">Broadcasts & direct messages</p>
            </div>
          </button>

          {/* Group list */}
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Groups</p>
          </div>
          {groups.map((group) => {
            const isActive = typeof chatView === 'object' && chatView.type === 'group' && chatView.groupId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => { setChatView({ type: 'group', groupId: group.id }); setShowSidebar(false); }}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${isActive ? 'bg-secondary' : ''}`}
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-sm text-foreground truncate">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{group.memberIds.length} members</p>
                </div>
              </button>
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
            {chatView === 'broadcast' ? (
              <>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">Main Channel</p>
                  <OnlineStatus isOnline={adminOnline} size="sm" />
                </div>
              </>
            ) : activeGroup ? (
              <>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{activeGroup.name}</p>
                  <p className="text-[11px] text-muted-foreground">{activeGroup.memberIds.length} members</p>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <MessageFeed
          messages={activeMessages}
          currentUserId={currentUser.id}
          isGroupChat={isGroupChat}
          getSenderName={(senderId) => {
            const u = getUserById(senderId);
            return u?.displayName || 'Unknown';
          }}
        />
        {chatView === 'broadcast' && adminTyping && <TypingIndicator name="Admin" />}
        {(chatView === 'broadcast' ? isChatEnabled : true) && (
          <MessageComposer onSend={handleSend} onTyping={handleTyping} />
        )}
      </div>
    </div>
  );
};

export default UserDashboard;