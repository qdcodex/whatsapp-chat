import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { useMessageStore } from '@/stores/messageStore';
import { Forward, Users, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Message, ChatView } from '@/types';

interface ForwardDialogProps {
  message: Message | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  currentUserId: string;
  adminId: string;
}

const ForwardDialog = ({ message, open, onOpenChange, workspaceId, currentUserId, adminId }: ForwardDialogProps) => {
  const { getUsersByAdmin, getUserById } = useAuthStore();
  const { getGroupsByWorkspace } = useGroupStore();
  const { sendMessage } = useMessageStore();

  if (!message) return null;

  const users = getUsersByAdmin(adminId);
  const groups = getGroupsByWorkspace(workspaceId);
  const sender = getUserById(message.senderId);
  const senderName = sender?.displayName || 'Unknown';

  const forwardTo = (target: 'broadcast' | { type: 'dm'; userId: string } | { type: 'group'; groupId: string }) => {
    const forwardedFrom = {
      senderName,
      originalTimestamp: message.timestamp,
    };

    const base = {
      adminId,
      workspaceId,
      senderId: currentUserId,
      text: message.text,
      imageUrl: message.imageUrl,
      audioUrl: message.audioUrl,
      audioDuration: message.audioDuration,
      forwardedFrom,
    };

    if (target === 'broadcast') {
      sendMessage(base);
    } else if (target.type === 'dm') {
      sendMessage({ ...base, recipientId: target.userId });
    } else if (target.type === 'group') {
      sendMessage({ ...base, groupId: target.groupId });
    }

    onOpenChange(false);
    toast.success('Message forwarded');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-primary" />
            Forward message
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 max-h-80 overflow-y-auto">
          {/* Broadcast */}
          <button
            onClick={() => forwardTo('broadcast')}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Broadcast</p>
          </button>

          {/* Users */}
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => forwardTo({ type: 'dm', userId: user.id })}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-sm shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <p className="text-sm font-medium text-foreground">{user.displayName}</p>
            </button>
          ))}

          {/* Groups */}
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => forwardTo({ type: 'group', groupId: group.id })}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{group.name}</p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardDialog;
