import { useGroupStore } from '@/stores/groupStore';
import { useAuthStore } from '@/stores/authStore';
import { UserCheck, UserX, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface JoinRequestsListProps {
  workspaceId: string;
}

const JoinRequestsList = ({ workspaceId }: JoinRequestsListProps) => {
  const { getGroupsByWorkspace, getJoinRequests, approveJoinRequest, rejectJoinRequest, addMember } = useGroupStore();
  const { createUser } = useAuthStore();

  const groups = getGroupsByWorkspace(workspaceId);
  const allRequests = groups.flatMap((g) =>
    getJoinRequests(g.id).map((r) => ({ ...r, groupName: g.name, group: g }))
  );

  if (allRequests.length === 0) return null;

  const handleApprove = async (request: typeof allRequests[0]) => {
    // Create user account and add to group
    const newUser = await createUser({
      username: request.name.toLowerCase().replace(/\s+/g, '') + Math.random().toString(36).substring(2, 5),
      password: Math.random().toString(36).substring(2, 10),
      role: 'user',
      displayName: request.name,
      phone: request.phone,
      adminId: request.group.adminId,
      workspaceId: request.group.workspaceId,
    });
    addMember(request.groupId, newUser.id);
    approveJoinRequest(request.id);
    toast.success(`${request.name} approved and added to ${request.groupName}`);
  };

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-2 px-3 py-2">
        <Bell className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-medium text-primary uppercase tracking-wider">
          Join Requests ({allRequests.length})
        </p>
      </div>
      {allRequests.map((req) => (
        <div key={req.id} className="flex items-center gap-3 p-3 border-b border-border/50 bg-primary/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{req.name}</p>
            <p className="text-[10px] text-muted-foreground">
              → {req.groupName}
              {req.phone && ` • ${req.phone}`}
            </p>
            {req.message && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">&ldquo;{req.message}&rdquo;</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:bg-primary/10"
              onClick={() => handleApprove(req)}
            >
              <UserCheck className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => { rejectJoinRequest(req.id); toast.success('Request rejected'); }}
            >
              <UserX className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JoinRequestsList;
