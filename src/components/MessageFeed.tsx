import { useRef, useEffect, useState } from 'react';
import type { Message } from '@/types';
import MessageBubble from './MessageBubble';
import { MessageSquare } from 'lucide-react';

interface MessageFeedProps {
  messages: Message[];
  currentUserId?: string;
  isAdmin?: boolean;
  isGroupChat?: boolean;
  getSenderName?: (senderId: string) => string;
  getSenderPhone?: (senderId: string) => string;
  getChannelLabel?: (message: Message) => string | undefined;
  showUserDetails?: boolean;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
}

const MessageFeed = ({
  messages,
  currentUserId,
  isAdmin = false,
  isGroupChat = false,
  getSenderName,
  getSenderPhone,
  getChannelLabel,
  showUserDetails = false,
  onReply,
  onForward,
}: MessageFeedProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">No messages yet</p>
        <p className="text-sm mt-1">
          {isAdmin ? 'Send your first message' : 'Messages will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin bg-chat-bg">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOutgoing={currentUserId ? msg.senderId === currentUserId : isAdmin}
          senderName={isGroupChat && getSenderName ? getSenderName(msg.senderId) : undefined}
          senderPhone={isGroupChat && getSenderPhone ? getSenderPhone(msg.senderId) : undefined}
          showUserDetails={showUserDetails}
          onReply={onReply}
          onForward={onForward}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageFeed;
