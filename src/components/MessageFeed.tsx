import { useRef, useEffect } from 'react';
import type { Message } from '@/types';
import MessageBubble from './MessageBubble';
import { Lock } from 'lucide-react';

interface MessageFeedProps {
  messages: Message[];
  currentUserId?: string;
  isAdmin?: boolean;
  isGroupChat?: boolean;
  getSenderName?: (senderId: string) => string;
  getSenderPhone?: (senderId: string) => string;
  getSenderAvatar?: (senderId: string) => string | undefined;
  getChannelLabel?: (message: Message) => string | undefined;
  showUserDetails?: boolean;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (message: Message, mode: 'for_me' | 'for_everyone') => void;
}

const MessageFeed = ({
  messages,
  currentUserId,
  isAdmin = false,
  isGroupChat = false,
  getSenderName,
  getSenderPhone,
  getSenderAvatar,
  getChannelLabel,
  showUserDetails = false,
  onReply,
  onForward,
  onDelete,
}: MessageFeedProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 wa-chat-bg">
        <div className="bg-card/80 backdrop-blur-sm rounded-lg px-4 py-3 shadow-sm text-center max-w-xs">
          <Lock className="w-4 h-4 mx-auto mb-1.5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">
            Messages are end-to-end encrypted. No one outside of this chat can read them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2 scrollbar-thin wa-chat-bg">
      {/* Encryption notice */}
      <div className="flex justify-center mb-3 mt-1">
        <div className="bg-card/70 backdrop-blur-sm rounded-md px-3 py-1.5 shadow-sm">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Messages are end-to-end encrypted
          </p>
        </div>
      </div>

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOutgoing={currentUserId ? msg.senderId === currentUserId : isAdmin}
          senderName={getSenderName ? getSenderName(msg.senderId) : undefined}
          senderPhone={getSenderPhone ? getSenderPhone(msg.senderId) : undefined}
          senderAvatar={getSenderAvatar ? getSenderAvatar(msg.senderId) : undefined}
          showUserDetails={showUserDetails}
          channelLabel={getChannelLabel ? getChannelLabel(msg) : undefined}
          currentUserId={currentUserId}
          onReply={onReply}
          onForward={onForward}
          onDelete={onDelete}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageFeed;
