"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useMessageStore } from '@/stores/messageStore';
import { useGroupStore } from '@/stores/groupStore';
import { usePaymentStore } from '@/stores/paymentStore';
import { format } from 'date-fns';
import {
  Radio, LogOut, Plus, Trash2, Users, MessageSquare, Shield, Phone, Search,
  Bell, BellOff, CheckCircle, XCircle, CreditCard, Check,
  AlertCircle, AlertTriangle, Clock, ChevronDown, ChevronUp, DollarSign,
  ToggleLeft, ToggleRight, MessageCircle, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const SuperAdminDashboard = () => {
  const router = useRouter();
  const { currentUser, logout, getAdmins, createUser, deleteUser, updateUser, getUsersByAdmin, users: allUsers } = useAuthStore();
  const { workspaces, createWorkspace, deleteWorkspace, toggleGlobalChat, toggleMessaging, getWorkspaceByAdmin } = useWorkspaceStore();
  const { messages } = useMessageStore();
  const { groupCreationRequests, approveGroupCreationRequest, rejectGroupCreationRequest, getPendingGroupCreationCount } = useGroupStore();
  const {
    notifications: payNotifications,
    notifications_unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    getAllSubscriptions,
    getSubscription,
    ensureSubscription,
    setMonthlyAmount,
    setBillingCycleDays,
    togglePaymentActive,
    recordPayment,
    getPaymentStatus,
    getDaysRemaining,
    getDaysOverdue,
    getBillingCycleDays,
  } = usePaymentStore();

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', displayName: '', phone: '', slug: '', workspaceName: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAdmin, setEditAdmin] = useState<{ id: string; displayName: string; phone: string; password: string } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'admins' | 'groups' | 'payments' | 'users'>('admins');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});
  const [cycleInputs, setCycleInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [recordingPayment, setRecordingPayment] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'superadmin') {
      router.replace('/');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'superadmin') {
    return null;
  }

  const admins = getAdmins();
  const allRegularUsers = allUsers.filter(u => u.role === 'user');
  const filteredUsers = userSearch.trim()
    ? allRegularUsers.filter(u =>
        u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phone && u.phone.includes(userSearch))
      )
    : allRegularUsers;

  const pendingGroupCount = getPendingGroupCreationCount();
  const pendingGroups = groupCreationRequests.filter((r) => r.status === 'pending');
  const unreadPaymentCount = notifications_unreadCount();

  const getAdminName = (adminId?: string) => {
    if (!adminId) return 'N/A';
    const admin = allUsers.find(u => u.id === adminId);
    return admin?.displayName || 'Unknown';
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newAdmin.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!slug) { toast.error('Invalid workspace slug'); return; }

    const existingWs = workspaces.find(w => w.slug === slug);
    if (existingWs) { toast.error('Workspace slug already taken'); return; }

    const admin = await createUser({
      username: newAdmin.username,
      password: newAdmin.password,
      displayName: newAdmin.displayName,
      phone: newAdmin.phone || undefined,
      role: 'admin',
      workspaceId: slug,
    });

    await createWorkspace({
      slug,
      name: newAdmin.workspaceName || newAdmin.displayName,
      adminId: admin.id,
    });

    setNewAdmin({ username: '', password: '', displayName: '', phone: '', slug: '', workspaceName: '' });
    setDialogOpen(false);
    toast.success('Admin created successfully');
  };

  const handleDeleteAdmin = (adminId: string) => {
    const ws = workspaces.find(w => w.adminId === adminId);
    if (ws) deleteWorkspace(ws.id);
    deleteUser(adminId);
    toast.success('Admin deleted');
  };

  const handleOpenEdit = (admin: { id: string; displayName: string; phone?: string }) => {
    setEditAdmin({ id: admin.id, displayName: admin.displayName, phone: admin.phone || '', password: '' });
    setEditDialogOpen(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdmin) return;
    const updates: Partial<{ displayName: string; phone: string; password: string }> = { displayName: editAdmin.displayName };
    if (editAdmin.phone.trim()) updates.phone = editAdmin.phone.trim();
    if (editAdmin.password.trim()) updates.password = editAdmin.password.trim();
    await updateUser(editAdmin.id, updates);
    setEditDialogOpen(false);
    setEditAdmin(null);
    toast.success('Admin updated');
  };

  const handleApproveGroup = async (requestId: string) => {
    const group = await approveGroupCreationRequest(requestId);
    if (group) toast.success(`Group "${group.name}" approved and created`);
  };

  const handleRejectGroup = (requestId: string) => {
    rejectGroupCreationRequest(requestId);
    toast.success('Group request rejected');
  };

  const tabs = [
    { key: 'admins' as const, label: 'Admins', count: 0 },
    { key: 'groups' as const, label: 'Group Requests', count: pendingGroupCount },
    { key: 'payments' as const, label: 'Payments', count: unreadPaymentCount },
    { key: 'users' as const, label: 'Users', count: 0 },
  ];

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
          <div className="flex items-center gap-2">
            {unreadPaymentCount > 0 && (
              <button
                onClick={() => { setActiveTab('payments'); markAllNotificationsRead(); }}
                className="relative p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <Bell className="w-5 h-5 text-primary" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadPaymentCount > 9 ? '9+' : unreadPaymentCount}
                </span>
              </button>
            )}
            <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => { logout(); router.push('/'); }}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Admins', value: admins.length, icon: Shield },
            { label: 'Users', value: allRegularUsers.length, icon: Users },
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

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'payments') markAllNotificationsRead();
              }}
              className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
                  {tab.count > 9 ? '9+' : tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab: Admins */}
        {activeTab === 'admins' && (
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
                      <Label>Phone Number</Label>
                      <Input value={newAdmin.phone} onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })} placeholder="e.g. +91 98765 43210" />
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

              {/* Edit Admin Dialog */}
              <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditAdmin(null); }}>
                <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
                  <DialogHeader><DialogTitle>Edit Admin</DialogTitle></DialogHeader>
                  {editAdmin && (
                    <form onSubmit={handleSaveAdmin} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={editAdmin.displayName}
                          onChange={(e) => setEditAdmin({ ...editAdmin, displayName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          value={editAdmin.phone}
                          onChange={(e) => setEditAdmin({ ...editAdmin, phone: e.target.value })}
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
                        <Input
                          type="password"
                          value={editAdmin.password}
                          onChange={(e) => setEditAdmin({ ...editAdmin, password: e.target.value })}
                          placeholder="New password"
                        />
                      </div>
                      <Button type="submit" className="w-full rounded-xl">Save Changes</Button>
                    </form>
                  )}
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
                  const chatOn = ws?.globalChatEnabled ?? false;
                  const msgOn = ws?.messagingEnabled !== false;
                  const sub = getSubscription(admin.id);
                  const payOn = sub?.paymentActive !== false;
                  return (
                    <div key={admin.id} className="p-3 sm:p-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0 text-sm">
                            {admin.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">{admin.displayName}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[10px] text-muted-foreground">/{admin.workspaceId} · {userCount} users</p>
                              {admin.phone && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Phone className="w-2.5 h-2.5" />{admin.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEdit(admin)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleDeleteAdmin(admin.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Control toggles */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* User Chat toggle */}
                        <button
                          onClick={() => {
                            if (ws) { toggleGlobalChat(ws.slug); toast.success(`User chat ${chatOn ? 'disabled' : 'enabled'} for ${admin.displayName}`); }
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${chatOn ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-secondary/60 border-border text-muted-foreground'}`}
                        >
                          {chatOn ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          <span>User Chat</span>
                        </button>
                        {/* Messaging toggle */}
                        <button
                          onClick={() => {
                            toggleMessaging(admin.id);
                            toast.success(`Admin messaging ${msgOn ? 'disabled' : 'enabled'} for ${admin.displayName}`);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${msgOn ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400' : 'bg-secondary/60 border-border text-muted-foreground'}`}
                        >
                          {msgOn ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          <span>Messaging</span>
                        </button>
                        {/* Payment toggle */}
                        <button
                          onClick={() => {
                            togglePaymentActive(admin.id, admin.displayName, admin.workspaceId!);
                            toast.success(`Payment ${payOn ? 'stopped' : 'started'} for ${admin.displayName}`);
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${payOn ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-secondary/60 border-border text-muted-foreground'}`}
                        >
                          {payOn ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          <span>Payment</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Group Creation Requests */}
        {activeTab === 'groups' && (
          <div className="bg-card rounded-xl sm:rounded-2xl border border-border">
            <div className="p-3 sm:p-5 border-b border-border">
              <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
                Group Creation Requests
                {pendingGroupCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{pendingGroupCount} pending</Badge>
                )}
              </h2>
            </div>

            {groupCreationRequests.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No group creation requests yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[...groupCreationRequests].sort((a, b) => b.createdAt - a.createdAt).map((req) => (
                  <div key={req.id} className="p-3 sm:p-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-foreground">{req.groupName}</p>
                          <Badge
                            variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'}
                            className="text-[10px] h-4 px-1.5"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Requested by <span className="font-medium text-foreground">{req.adminName}</span> · /{req.workspaceId}
                        </p>
                        {req.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{req.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(req.createdAt), 'MMM d, yyyy h:mm a')} · {req.memberIds.length} initial members
                        </p>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleApproveGroup(req.id)}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => handleRejectGroup(req.id)}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Per-admin subscription cards */}
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border">
              <div className="p-3 sm:p-5 border-b border-border">
                <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Subscription Management
                </h2>
              </div>

              {admins.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No admins yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {admins.map((admin) => {
                    const sub = getSubscription(admin.id);
                    const status = getPaymentStatus(admin.id);
                    const daysLeft = getDaysRemaining(admin.id);
                    const daysOverdue = getDaysOverdue(admin.id);
                    const isExpanded = expandedHistory === admin.id;

                    const statusConfig = {
                      active: {
                        icon: CheckCircle,
                        color: 'text-green-600',
                        bg: 'bg-green-50 dark:bg-green-900/20',
                        border: 'border-green-200 dark:border-green-800',
                        label: 'Active',
                        badgeCls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                      },
                      expiring_soon: {
                        icon: AlertTriangle,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50 dark:bg-amber-900/20',
                        border: 'border-amber-200 dark:border-amber-800',
                        label: 'Expiring Soon',
                        badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
                      },
                      overdue: {
                        icon: AlertCircle,
                        color: 'text-red-600',
                        bg: 'bg-red-50 dark:bg-red-900/20',
                        border: 'border-red-200 dark:border-red-800',
                        label: 'Overdue',
                        badgeCls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                      },
                      not_set: {
                        icon: CreditCard,
                        color: 'text-muted-foreground',
                        bg: '',
                        border: 'border-transparent',
                        label: 'Not Set',
                        badgeCls: 'bg-secondary text-muted-foreground',
                      },
                    }[status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div key={admin.id} className="p-3 sm:p-4">
                        {/* Admin info row */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                            {admin.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground">{admin.displayName}</p>
                            <p className="text-xs text-muted-foreground">/{admin.workspaceId}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig.badgeCls}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                            <button
                              onClick={() => {
                                togglePaymentActive(admin.id, admin.displayName, admin.workspaceId!);
                                toast.success(`Payment ${sub?.paymentActive !== false ? 'stopped' : 'started'} for ${admin.displayName}`);
                              }}
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${sub?.paymentActive !== false ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-secondary border-border text-muted-foreground'}`}
                            >
                              {sub?.paymentActive !== false ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                              {sub?.paymentActive !== false ? 'Active' : 'Stopped'}
                            </button>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div className="bg-secondary/60 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Fee</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                              {sub?.monthlyAmount ? `$${sub.monthlyAmount}` : '—'}
                            </p>
                          </div>
                          <div className="bg-secondary/60 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Cycle</p>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                              {getBillingCycleDays(admin.id)}d
                            </p>
                          </div>
                          <div className={`rounded-lg p-2 text-center ${status === 'overdue' ? 'bg-red-100 dark:bg-red-900/20' : status === 'expiring_soon' ? 'bg-amber-100 dark:bg-amber-900/20' : 'bg-secondary/60'}`}>
                            <p className="text-[10px] text-muted-foreground">
                              {status === 'overdue' ? 'Overdue' : 'Days Left'}
                            </p>
                            <p className={`text-sm font-bold mt-0.5 ${status === 'overdue' ? 'text-red-600' : status === 'expiring_soon' ? 'text-amber-600' : 'text-foreground'}`}>
                              {status === 'overdue'
                                ? daysOverdue ? `${daysOverdue}d` : '—'
                                : daysLeft !== null
                                  ? `${daysLeft}d`
                                  : '—'}
                            </p>
                          </div>
                          <div className="bg-secondary/60 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-muted-foreground">Last Paid</p>
                            <p className="text-[11px] font-medium text-foreground mt-0.5">
                              {sub?.lastPaidAt ? format(new Date(sub.lastPaidAt), 'MMM d') : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Next due */}
                        {sub?.nextDueAt && (
                          <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Next due: {format(new Date(sub.nextDueAt), 'MMM d, yyyy')}
                          </p>
                        )}

                        {/* Set amount + billing days */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative flex-1">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              placeholder="Fee amount"
                              value={amountInputs[admin.id] ?? (sub?.monthlyAmount ? String(sub.monthlyAmount) : '')}
                              onChange={(e) => setAmountInputs((prev) => ({ ...prev, [admin.id]: e.target.value }))}
                              className="h-8 text-xs pl-7"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs shrink-0"
                            onClick={() => {
                              const amt = parseFloat(amountInputs[admin.id] ?? '');
                              if (isNaN(amt) || amt < 0) return;
                              ensureSubscription(admin.id, admin.displayName, admin.workspaceId!);
                              setMonthlyAmount(admin.id, amt);
                              toast.success(`Fee set to $${amt} for ${admin.displayName}`);
                            }}
                          >
                            Set Fee
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="relative flex-1">
                            <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              placeholder="Billing cycle days (default 28)"
                              value={cycleInputs[admin.id] ?? String(getBillingCycleDays(admin.id))}
                              onChange={(e) => setCycleInputs((prev) => ({ ...prev, [admin.id]: e.target.value }))}
                              className="h-8 text-xs pl-7"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs shrink-0"
                            onClick={() => {
                              const days = parseInt(cycleInputs[admin.id] ?? '');
                              if (isNaN(days) || days < 1) return;
                              ensureSubscription(admin.id, admin.displayName, admin.workspaceId!);
                              setBillingCycleDays(admin.id, days);
                              toast.success(`Billing cycle set to ${days} days for ${admin.displayName}`);
                            }}
                          >
                            Set Days
                          </Button>
                        </div>

                        {/* Record payment on behalf of admin */}
                        <div className="flex items-center gap-2 pt-2 mt-1 border-t border-border/60">
                          <Input
                            placeholder="Note (e.g. Bank transfer, Cash)"
                            value={noteInputs[admin.id] ?? ''}
                            onChange={(e) => setNoteInputs(prev => ({ ...prev, [admin.id]: e.target.value }))}
                            className="h-8 text-xs"
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                          <Button
                            size="sm"
                            className="h-8 text-xs shrink-0 bg-green-600 hover:bg-green-700 text-white"
                            disabled={recordingPayment === admin.id}
                            onClick={async () => {
                              setRecordingPayment(admin.id);
                              try {
                                await ensureSubscription(admin.id, admin.displayName, admin.workspaceId!);
                                await recordPayment(
                                  admin.id,
                                  admin.displayName,
                                  admin.workspaceId!,
                                  noteInputs[admin.id]?.trim() || undefined,
                                );
                                setNoteInputs(prev => ({ ...prev, [admin.id]: '' }));
                                toast.success(`Payment recorded for ${admin.displayName}`);
                              } catch (err: unknown) {
                                toast.error((err as Error)?.message || 'Failed to record payment');
                              } finally {
                                setRecordingPayment(null);
                              }
                            }}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {recordingPayment === admin.id ? 'Saving…' : 'Record Payment'}
                          </Button>
                        </div>

                        {/* Payment history toggle */}
                        {sub && sub.history.length > 0 && (
                          <button
                            onClick={() => setExpandedHistory(isExpanded ? null : admin.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {sub.history.length} payment{sub.history.length !== 1 ? 's' : ''} — view history
                          </button>
                        )}

                        {/* History list */}
                        {isExpanded && sub && (
                          <div className="mt-2 space-y-1 border-l-2 border-border pl-3">
                            {sub.history.map((record) => (
                              <div key={record.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Check className="w-3 h-3 text-green-500" />
                                  {format(new Date(record.paidAt), 'MMM d, yyyy')}
                                  {record.note && <span className="italic">· {record.note}</span>}
                                </div>
                                <span className="font-medium text-foreground">
                                  {record.amount ? `$${record.amount}` : '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent payment notifications */}
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border">
              <div className="p-3 sm:p-5 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Recent Notifications
                </h2>
                {payNotifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7"
                    onClick={() => clearNotifications()}>
                    Clear All
                  </Button>
                )}
              </div>

              {payNotifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <BellOff className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {payNotifications.slice(0, 20).map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${!notif.read ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}
                      onClick={() => markNotificationRead(notif.id)}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? 'bg-primary/10' : 'bg-secondary'}`}>
                        <CreditCard className={`w-3.5 h-3.5 ${!notif.read ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs ${!notif.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(notif.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      {notif.read && <Check className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Users */}
        {activeTab === 'users' && (
          <div className="bg-card rounded-xl sm:rounded-2xl border border-border">
            <div className="p-3 sm:p-5 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  All Users ({allRegularUsers.length})
                </h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="pl-9"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{userSearch ? 'No users match your search' : 'No users yet'}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">User</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Phone</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Admin</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Workspace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-xs shrink-0">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{user.displayName}</p>
                              <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-primary" />
                              <span className="text-sm text-foreground">{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-foreground">{getAdminName(user.adminId)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground font-mono">/{user.workspaceId || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
