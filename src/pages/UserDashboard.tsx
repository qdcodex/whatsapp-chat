import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import TypingIndicator from '@/components/TypingIndicator';
import OnlineStatus from '@/components/OnlineStatus';
import { Radio, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { getBroadcastMessages, getDMMessages, sendMessage } = useMessageStore();
  const { getWorkspaceByAdmin } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, isTyping: checkTyping, setTyping, clearTyping } = usePresenceStore();
  const [, setTick] = useState(0);

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

  if (!currentUser || currentUser.role !== 'user') {
    return null;
  }

  const workspace = getWorkspaceByAdmin(currentUser.adminId!);
  const slug = workspace?.slug || '';

  // Users see broadcast messages + their DM conversation with admin
  const broadcastMsgs = getBroadcastMessages(slug);
  const dmMsgs = getDMMessages(slug, currentUser.id, currentUser.adminId!);
  const allMessages = [...broadcastMsgs, ...dmMsgs].sort((a, b) => a.timestamp - b.timestamp);

  const adminOnline = checkOnline(currentUser.adminId!);
  const adminTyping = checkTyping(currentUser.adminId!, slug);

  // Check if chat is enabled for this user
  const isChatEnabled = (() => {
    if (currentUser.chatEnabled !== undefined) return currentUser.chatEnabled;
    return workspace?.globalChatEnabled ?? false;
  })();

  const handleSend = (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
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
  };

  const handleTyping = () => {
    setTyping(currentUser.id, slug);
    setTimeout(() => clearTyping(currentUser.id, slug), 3000);
  };

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
        <MessageFeed messages={allMessages} currentUserId={currentUser.id} />
        {adminTyping && <TypingIndicator name="Admin" />}
        {isChatEnabled && (
          <MessageComposer onSend={handleSend} onTyping={handleTyping} />
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
