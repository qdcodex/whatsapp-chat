import { useState } from 'react';
import { useGroupStore } from '@/stores/groupStore';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import {
  Users, Trash2, Copy, Link2, UserMinus, Plus, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import UnreadBadge from '@/components/UnreadBadge';
import ContactImporter, { type ContactEntry } from '@/components/ContactImporter';
import type { User, Group } from '@/types';

const GROUP_MEMBER_LIMIT = 1000;

interface GroupManagerProps {
  workspaceId: string;
  adminId: string;
  adminName: string;
  users: User[];
  onGroupSelect?: (groupId: string) => void;
  activeGroupId?: string;
}

const GroupManager = ({ workspaceId, adminId, adminName, users, onGroupSelect, activeGroupId }: GroupManagerProps) => {
  const { deleteGroup, getGroupsByWorkspace, removeMember, createGroup, addMember, requestGroupCreation, adminGroupCount, getAdminGroupCreationRequests } = useGroupStore();
  const { getUnreadGroupCount } = useMessageStore();
  const { currentUser, createUser } = useAuthStore();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteGroupName, setDeleteGroupName] = useState<string>('');
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [removeMemberName, setRemoveMemberName] = useState<string>('');
  const [removeGroupId, setRemoveGroupId] = useState<string | null>(null);

  const groups = getGroupsByWorkspace(workspaceId);
  const existingGroupCount = adminGroupCount(adminId);
  const pendingRequests = getAdminGroupCreationRequests(adminId).filter((r) => r.status === 'pending');
  const rejectedRequests = getAdminGroupCreationRequests(adminId).filter((r) => r.status === 'rejected');

  const handleCreate = () => {
    if (!groupName.trim()) { toast.error('Group name required'); return; }

    if (existingGroupCount >= 1) {
      // Need super admin approval for 2nd+ group
      requestGroupCreation({
        adminId,
        adminName,
        workspaceId,
        groupName: groupName.trim(),
        description: groupDesc.trim() || undefined,
        memberIds: selectedUsers,
      });
      setGroupName(''); setGroupDesc(''); setSelectedUsers([]); setCreateOpen(false);
      toast.success('Group creation request sent to super admin for approval');
    } else {
      createGroup({ name: groupName.trim(), description: groupDesc.trim() || undefined, workspaceId, adminId, memberIds: selectedUsers });
      setGroupName(''); setGroupDesc(''); setSelectedUsers([]); setCreateOpen(false);
      toast.success('Group created!');
    }
  };

  const copyGroupLink = (group: Group) => {
    const url = `${window.location.origin}/join/${group.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Group link copied!');
  };

  const handleAddMember = (groupId: string, userId: string) => {
    const result = addMember(groupId, userId);
    if (!result.success) toast.error(result.reason || 'Could not add member');
  };

  const handleInviteContacts = async (groupId: string, contacts: ContactEntry[]) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const remaining = GROUP_MEMBER_LIMIT - group.memberIds.length;
    if (remaining <= 0) { toast.error(`Group has reached the ${GROUP_MEMBER_LIMIT} member limit`); return; }

    let added = 0;
    for (const c of contacts.slice(0, remaining)) {
      const existing = users.find(u => u.phone === c.phone.trim());
      if (existing) {
        const result = addMember(groupId, existing.id);
        if (result.success) added++;
      } else {
        const newUser = await createUser({
          username: c.phone.trim(),
          password: Math.random().toString(36).slice(2, 10),
          role: 'user',
          displayName: c.name.trim(),
          phone: c.phone.trim(),
          workspaceId,
          adminId,
        });
        const result = addMember(groupId, newUser.id);
        if (result.success) added++;
      }
    }
    if (contacts.length > remaining) {
      toast.warning(`Added ${added} contacts. ${contacts.length - remaining} skipped (limit reached)`);
    }
  };

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Groups</p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-3.5 h-3.5" /></Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {existingGroupCount >= 1 ? 'Request Group Creation' : 'Create Group'}
              </DialogTitle>
            </DialogHeader>
            {existingGroupCount >= 1 && (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5">
                You already have a group. Creating another requires super admin approval.
              </p>
            )}
            <div className="space-y-3">
              <div><Label>Group Name *</Label><Input value={groupName} onChange={(e) => setGroupName(e.target.value)} /></div>
              <div><Label>Description</Label><Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} /></div>
              {users.length > 0 && (
                <div>
                  <Label>Members</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto mt-1">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer">
                        <Checkbox checked={selectedUsers.includes(u.id)} onCheckedChange={(c) => setSelectedUsers(c ? [...selectedUsers, u.id] : selectedUsers.filter((id) => id !== u.id))} />
                        <span className="text-sm">{u.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleCreate} className="w-full">
                {existingGroupCount >= 1 ? 'Send Request' : 'Create Group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending approval requests */}
      {pendingRequests.length > 0 && (
        <div className="mx-3 mb-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-2.5">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1">
            <Clock className="w-3 h-3" />
            {pendingRequests.length} group request{pendingRequests.length > 1 ? 's' : ''} pending approval
          </p>
          {pendingRequests.map((r) => (
            <p key={r.id} className="text-xs text-amber-600 dark:text-amber-500 truncate">• {r.groupName}</p>
          ))}
        </div>
      )}

      {/* Rejected requests */}
      {rejectedRequests.length > 0 && (
        <div className="mx-3 mb-2 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5">
          <p className="text-xs font-medium text-destructive flex items-center gap-1 mb-1">
            {rejectedRequests.length} request{rejectedRequests.length > 1 ? 's' : ''} rejected
          </p>
          {rejectedRequests.map((r) => (
            <p key={r.id} className="text-xs text-destructive/70 truncate">• {r.groupName}</p>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="px-3 pb-3 text-center">
          <p className="text-xs text-muted-foreground">No groups yet</p>
        </div>
      ) : (
        groups.map((group) => {
          const memberCount = group.memberIds.length;
          const atLimit = memberCount >= GROUP_MEMBER_LIMIT;
          return (
            <div key={group.id}>
              <button
                onClick={() => onGroupSelect ? onGroupSelect(group.id) : setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${activeGroupId === group.id ? 'bg-secondary' : ''}`}
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{group.name}</p>
                    <UnreadBadge count={currentUser ? getUnreadGroupCount(group.id, currentUser.id) : 0} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs ${atLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {memberCount}/{GROUP_MEMBER_LIMIT} members
                    </p>
                    {atLimit && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">Full</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <ContactImporter
                    triggerLabel="Invite"
                    onImport={(contacts) => handleInviteContacts(group.id, contacts)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setExpandedGroup(expandedGroup === group.id ? null : group.id); }}
                    title="Manage members"
                  >
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); copyGroupLink(group); }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteGroupId(group.id); setDeleteGroupName(group.name); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </button>
              {expandedGroup === group.id && (
                <div className="bg-secondary/30 px-4 py-2 space-y-1 border-b border-border/50">
                  {group.description && (
                    <p className="text-xs text-muted-foreground mb-2">{group.description}</p>
                  )}
                  <div className="flex items-center gap-1 mb-2">
                    <Link2 className="w-3 h-3 text-muted-foreground" />
                    <button
                      onClick={() => copyGroupLink(group)}
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {window.location.origin}/join/{group.slug}
                    </button>
                  </div>
                  {group.memberIds.map((memberId) => {
                    const member = users.find((u) => u.id === memberId);
                    if (!member) return null;
                    return (
                      <div key={memberId} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-[10px] font-semibold">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs">{member.displayName}</span>
                          {member.phone && (
                            <span className="text-[10px] text-muted-foreground">{member.phone}</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => { setRemoveMemberId(memberId); setRemoveMemberName(member.displayName); setRemoveGroupId(group.id); }}
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      <AlertDialog open={deleteGroupId !== null} onOpenChange={(open) => { if (!open) setDeleteGroupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteGroupName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteGroupId) {
                  deleteGroup(deleteGroupId);
                  toast.success('Group deleted');
                  setDeleteGroupId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeMemberId !== null} onOpenChange={(open) => { if (!open) setRemoveMemberId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{removeMemberName}&quot; from this group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeMemberId && removeGroupId) {
                  removeMember(removeGroupId, removeMemberId);
                  toast.success('Member removed');
                  setRemoveMemberId(null);
                  setRemoveGroupId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GroupManager;
