import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useMessageStore } from '@/stores/messageStore';
import {
  Radio, LogOut, Plus, Trash2, Users, MessageSquare, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, logout, getAdmins, createUser, deleteUser, getUsersByAdmin } = useAuthStore();
  const { workspaces, createWorkspace, deleteWorkspace } = useWorkspaceStore();
  const { messages } = useMessageStore();

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', displayName: '', slug: '', workspaceName: '' });
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!currentUser || currentUser.role !== 'superadmin') {
    navigate('/');
    return null;
  }

  const admins = getAdmins();

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newAdmin.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) { toast.error('Invalid workspace slug'); return; }

    const existingWs = workspaces.find(w => w.slug === slug);
    if (existingWs) { toast.error('Workspace slug already taken'); return; }

    const admin = createUser({
      username: newAdmin.username,
      password: newAdmin.password,
      displayName: newAdmin.displayName,
      role: 'admin',
      workspaceId: slug,
    });

    createWorkspace({
      slug,
      name: newAdmin.workspaceName || newAdmin.displayName,
      adminId: admin.id,
    });

    setNewAdmin({ username: '', password: '', displayName: '', slug: '', workspaceName: '' });
    setDialogOpen(false);
    toast.success('Admin created successfully');
  };

  const handleDeleteAdmin = (adminId: string) => {
    const ws = workspaces.find(w => w.adminId === adminId);
    if (ws) deleteWorkspace(ws.id);
    deleteUser(adminId);
    toast.success('Admin deleted');
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base text-foreground">BroadcastHub</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Super Admin</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => { logout(); navigate('/'); }}>
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Admins', value: admins.length, icon: Shield },
            { label: 'Users', value: useAuthStore.getState().users.filter(u => u.role === 'user').length, icon: Users },
            { label: 'Messages', value: messages.length, icon: MessageSquare },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl sm:rounded-2xl border border-border p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] sm:text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Admin List */}
        <div className="bg-card rounded-xl sm:rounded-2xl border border-border">
          <div className="p-3 sm:p-5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm sm:text-lg font-semibold text-foreground">Admin Workspaces</h2>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl h-8 text-xs sm:text-sm">
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Add Admin</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input value={newAdmin.displayName} onChange={(e) => setNewAdmin({ ...newAdmin, displayName: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input value={newAdmin.username} onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Workspace Slug</Label>
                    <Input value={newAdmin.slug} onChange={(e) => setNewAdmin({ ...newAdmin, slug: e.target.value })} placeholder="e.g. companyA" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Workspace Name</Label>
                    <Input value={newAdmin.workspaceName} onChange={(e) => setNewAdmin({ ...newAdmin, workspaceName: e.target.value })} placeholder="e.g. Company A" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl">Create Admin</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {admins.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No admins yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {admins.map((admin) => {
                const ws = workspaces.find(w => w.adminId === admin.id);
                const userCount = getUsersByAdmin(admin.id).length;
                return (
                  <div key={admin.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                        {admin.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{admin.displayName}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          /{admin.workspaceId} · {userCount} users
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8" onClick={() => handleDeleteAdmin(admin.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
