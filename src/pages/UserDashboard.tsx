import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import MessageFeed from '@/components/MessageFeed';
import TypingIndicator from '@/components/TypingIndicator';
import OnlineStatus from '@/components/OnlineStatus';
import { Radio, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { getMessagesByWorkspace } = useMessageStore();
  const { getWorkspaceByAdmin } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, isTyping: checkTyping } = usePresenceStore();
  const [, setTick] = useState(0);

  // Heartbeat & refresh ticker - must be before any early return
  useEffect(() => {
    if (!currentUser) return;
    setOnline(currentUser.id);
    const heartbeat = setInterval(() => setOnline(currentUser.id), 15000);
    const ticker = setInterval(() => setTick((t) => t + 1), 2000);
    return () => { clearInterval(heartbeat); clearInterval(ticker); };
  }, [currentUser, setOnline]);

  if (!currentUser || currentUser.role !== 'user') {
    navigate('/');
    return null;
  }

  const workspace = getWorkspaceByAdmin(currentUser.adminId!);
  const messages = getMessagesByWorkspace(workspace?.slug || '');
  const adminOnline = checkOnline(currentUser.adminId!);
  const adminTyping = checkTyping(currentUser.adminId!, workspace?.slug || '');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-foreground">{workspace?.name || 'Messages'}</h1>
              <OnlineStatus isOnline={adminOnline} />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <MessageFeed messages={messages} />
        {adminTyping && <TypingIndicator name="Admin" />}
      </div>
    </div>
  );
};

export default UserDashboard;
