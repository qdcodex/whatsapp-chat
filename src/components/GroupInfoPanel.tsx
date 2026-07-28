import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { Users, Phone, Crown, Copy, Link2, MessageCircleOff, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import type { Group } from '@/types';

interface GroupInfoPanelProps {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GroupInfoPanel = ({ group, open, onOpenChange }: GroupInfoPanelProps) => {
  const { currentUser, getUserById, getMaskedPhone } = useAuthStore();
  const { toggleMemberMute, isMemberMuted } = useGroupStore();
  const { isOnline } = usePresenceStore();

  const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isGroupAdmin = currentUser?.id === group.adminId;

  const copyGroupLink = () => {
    const url = `${window.location.origin}/join/${group.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Group link copied!');
  };

  const allMemberIds = [group.adminId, ...group.memberIds.filter(id => id !== group.adminId)];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header with group icon */}
        <div className="bg-primary/5 px-6 pt-8 pb-6 text-center border-b border-border">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-xl">{group.name}</SheetTitle>
          </SheetHeader>
          {group.description && (
            <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Group · {allMemberIds.length} {allMemberIds.length === 1 ? 'member' : 'members'}
          </p>
        </div>

        {/* Invite link */}
        <div className="px-4 py-3 border-b border-border">
          <button
            onClick={copyGroupLink}
            className="flex items-center gap-3 w-full text-left hover:bg-secondary/50 rounded-lg p-2 -m-2 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Invite link</p>
              <p className="text-xs text-muted-foreground truncate">
                {window.location.origin}/join/{group.slug}
              </p>
            </div>
            <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {allMemberIds.length} {allMemberIds.length === 1 ? 'Member' : 'Members'}
            </p>
          </div>

          <div className="px-2">
            {allMemberIds.map((memberId) => {
              const member = getUserById(memberId);
              if (!member) return null;

              const isAdmin = memberId === group.adminId;
              const online = isOnline(memberId);
              const phone = member.phone;
              const displayPhone = isPrivileged || isAdmin ? phone : getMaskedPhone(memberId);
              const muted = isMemberMuted(group.id, memberId);

              return (
                <div
                  key={memberId}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        online ? 'bg-primary' : 'bg-muted-foreground/40'
                      }`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.displayName}
                      </p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <Crown className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                      {muted && !isAdmin && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                          <MessageCircleOff className="w-2.5 h-2.5" />
                          Muted
                        </span>
                      )}
                    </div>
                    {displayPhone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{displayPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Mute toggle for admin (not for admin themselves) */}
                  {isGroupAdmin && !isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        toggleMemberMute(group.id, memberId);
                        toast.success(muted ? `${member.displayName} can now chat` : `${member.displayName} muted in group`);
                      }}
                      title={muted ? 'Unmute user' : 'Mute user'}
                    >
                      {muted ? (
                        <MessageCircleOff className="w-4 h-4 text-destructive" />
                      ) : (
                        <MessageCircle className="w-4 h-4 text-primary" />
                      )}
                    </Button>
                  )}

                  {/* Online text */}
                  <span className={`text-[10px] shrink-0 ${online ? 'text-primary' : 'text-muted-foreground'}`}>
                    {online ? 'online' : 'offline'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground">
            Created {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GroupInfoPanel;
