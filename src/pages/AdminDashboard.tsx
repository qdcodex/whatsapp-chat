import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useMessageStore } from '@/stores/messageStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { usePresenceStore } from '@/stores/presenceStore';
import MessageFeed from '@/components/MessageFeed';
import MessageComposer from '@/components/MessageComposer';
import OnlineStatus from '@/components/OnlineStatus';
import {
  Radio, LogOut, Users, MessageSquare, Plus, Trash2, UserPlus, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { currentUser, logout, getUsersByAdmin, createUser, deleteUser } = useAuthStore();
  const { sendMessage, getMessagesByWorkspace } = useMessageStore();
  const { getWorkspaceBySlug } = useWorkspaceStore();
  const { setOnline, isOnline: checkOnline, getLastSeen } = usePresenceStore();

  const [activeTab, setActiveTab] = useState<'messages' | 'users'>('messages');
  const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '' });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setOnline(currentUser.id);
    const interval = setInterval(() => setOnline(currentUser.id), 15000);
    return () => clearInterval(interval);
  }, [currentUser, setOnline]);

  if (!currentUser || currentUser.role !== 'admin' || currentUser.workspaceId !== workspaceId) {
    navigate('/');
    return null;
  }

  const workspace = getWorkspaceBySlug(workspaceId!);
  const messages = getMessagesByWorkspace(workspaceId!);
  const users = getUsersByAdmin(currentUser.id);

  const handleSend = (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => {
    sendMessage({
      adminId: currentUser.id,
      workspaceId: workspaceId!,
      text,
      imageUrl,
      audioUrl,
      audioDuration,
    });
    toast.success('Message broadcast sent!');
  };

  const handleTyping = () => {
    usePresenceStore.getState().setTyping(currentUser.id, workspaceId!);
    setTimeout(() => usePresenceStore.getState().clearTyping(currentUser.id, workspaceId!), 3000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUser({
      ...newUser,
      role: 'user',
      adminId: currentUser.id,
    });
    setNewUser({ username: '', password: '', displayName: '' });
    setDialogOpen(false);
    toast.success('User created');
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shrink-0">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-foreground truncate">{workspace?.name || workspaceId}</h1>
              <OnlineStatus isOnline={true} size="sm" />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant={activeTab === 'messages' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg h-8 px-2 sm:px-3 text-xs sm:text-sm"
              onClick={() => setActiveTab('messages')}
            >
              <MessageSquare className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Messages</span>
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-lg h-8 px-2 sm:px-3 text-xs sm:text-sm"
              onClick={() => setActiveTab('users')}
            >
              <Users className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Users</span>
              <span className="ml-1 text-xs">({users.length})</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {activeTab === 'messages' ? (
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full min-h-0">
          <MessageFeed messages={messages} isAdmin />
          <MessageComposer onSend={handleSend} onTyping={handleTyping} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full p-3 sm:p-4">
            <div className="bg-card rounded-2xl border border-border">
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground text-sm sm:text-base">Manage Users</h2>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-xl h-8 text-xs sm:text-sm">
                      <UserPlus className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Add User</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create User</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input value={newUser.displayName} onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })} required />
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
              </div>

              {users.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No users yet. Add users to broadcast messages.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {users.map((user) => (
                    <div key={user.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${checkOnline(user.id) ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{user.displayName}</p>
                          <OnlineStatus isOnline={checkOnline(user.id)} lastSeen={getLastSeen(user.id)} size="sm" />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8" onClick={() => { deleteUser(user.id); toast.success('User removed'); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
