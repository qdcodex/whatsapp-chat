import { useState } from 'react';
import { useGroupStore } from '@/stores/groupStore';
import { useMessageStore } from '@/stores/messageStore';
import { useAuthStore } from '@/stores/authStore';
import {
  Users, Plus, Trash2, Copy, Link2, UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { User, Group } from '@/types';

interface GroupManagerProps {
  workspaceId: string;
  adminId: string;
  users: User[];
  onGroupSelect?: (groupId: string) => void;
  activeGroupId?: string;
}

const GroupManager = ({ workspaceId, adminId, users, onGroupSelect, activeGroupId }: GroupManagerProps) => {
  const { createGroup, deleteGroup, getGroupsByWorkspace, removeMember } = useGroupStore();
  const { getUnreadGroupCount } = useMessageStore();
  const { currentUser } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const groups = getGroupsByWorkspace(workspaceId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    createGroup({
      name: groupName,
      description: groupDesc,
      workspaceId,
      adminId,
      memberIds: selectedUsers,
    });
    setGroupName('');
    setGroupDesc('');
    setSelectedUsers([]);
    setDialogOpen(false);
    toast.success('Group created');
  };

  const copyGroupLink = (group: Group) => {
    const url = `${window.location.origin}/join/${group.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Group link copied!');
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="border-t border-border">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Groups</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-md">
            <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Group Name</Label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Marketing Team" required />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="What's this group about?" />
              </div>
              <div className="space-y-2">
                <Label>Add Members</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                  {users.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No users available</p>
                  ) : (
                    users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer">
                        <Checkbox
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <span className="text-sm">{user.displayName}</span>
                        {user.phone && (
                          <span className="text-xs text-muted-foreground ml-auto">{user.phone}</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-xl">Create Group</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <div className="px-3 pb-3 text-center">
          <p className="text-xs text-muted-foreground">No groups yet</p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.id}>
            <button
              onClick={() => onGroupSelect ? onGroupSelect(group.id) : setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors border-b border-border/50 ${activeGroupId === group.id ? 'bg-secondary' : ''}`}
            >
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium text-sm text-foreground truncate">{group.name}</p>
                <p className="text-xs text-muted-foreground">{group.memberIds.length} members</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
                  onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); toast.success('Group deleted'); }}
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
                        onClick={() => { removeMember(group.id, memberId); toast.success('Member removed'); }}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default GroupManager;
