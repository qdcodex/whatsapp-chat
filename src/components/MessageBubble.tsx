import { useState, useRef } from 'react';
import { format } from 'date-fns';
import type { Message } from '@/types';
import AudioPlayer from './AudioPlayer';
import ReadReceipt from './ReadReceipt';
import { Reply, Forward, CornerUpRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageBubbleProps {
  message: Message;
  isOutgoing?: boolean;
  senderName?: string;
  senderPhone?: string;
  senderAvatar?: string;
  showUserDetails?: boolean;
  channelLabel?: string;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
}

const MessageBubble = ({
  message,
  isOutgoing = false,
  senderName,
  senderPhone,
  senderAvatar,
  showUserDetails = false,
  channelLabel,
  onReply,
  onForward,
}: MessageBubbleProps) => {
  const [showActions, setShowActions] = useState(false);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = isOutgoing
      ? touchStartX.current - touchCurrentX.current // swipe left for outgoing
      : touchCurrentX.current - touchStartX.current; // swipe right for incoming
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 50 && onReply) {
      onReply(message);
    }
    setSwipeOffset(0);
  };

  return (
    <div
      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-3 group relative`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Sender avatar for incoming messages */}
      {!isOutgoing && senderName && (
        <Avatar className="h-7 w-7 mr-1.5 mt-1 shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-semibold">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      {/* Swipe reply indicator */}
      {!isOutgoing && swipeOffset > 20 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Reply className="w-4 h-4 text-primary" />
        </div>
      )}
      {isOutgoing && swipeOffset > 20 && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Reply className="w-4 h-4 text-primary" />
        </div>
      )}

      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: swipeOffset > 0
            ? `translateX(${isOutgoing ? -swipeOffset : swipeOffset}px)`
            : undefined,
          transition: swipeOffset === 0 ? 'transform 0.2s ease' : undefined,
        }}
        className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm relative ${
          isOutgoing
            ? 'bg-chat-bubble-out rounded-br-md'
            : 'bg-chat-bubble-in rounded-bl-md'
        }`}
      >
        {/* Forwarded label */}
        {message.forwardedFrom && (
          <div className="flex items-center gap-1 mb-1">
            <CornerUpRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] italic text-muted-foreground">
              Forwarded from {message.forwardedFrom.senderName}
            </span>
          </div>
        )}

        {/* Channel label (broadcast/group origin) */}
        {channelLabel && !isOutgoing && (
          <div className="mb-1">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {channelLabel}
            </span>
          </div>
        )}

        {/* Sender name + phone for admin/superadmin */}
        {senderName && !isOutgoing && (
          <div className="mb-1">
            <p className="text-xs font-semibold text-primary">
              {senderName}
              {showUserDetails && senderPhone && (
                <span className="font-normal text-muted-foreground ml-1.5">
                  {senderPhone}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Reply quote */}
        {message.replyTo && (
          <div className="bg-primary/5 border-l-2 border-primary rounded px-2 py-1.5 mb-2">
            <p className="text-[10px] font-semibold text-primary">{message.replyTo.senderName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {message.replyTo.text || '📎 Attachment'}
            </p>
          </div>
        )}

        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Attachment"
            className="rounded-lg mb-2 max-w-full max-h-64 object-cover"
          />
        )}
        {message.audioUrl && (
          <AudioPlayer
            audioUrl={message.audioUrl}
            duration={message.audioDuration}
            isOutgoing={isOutgoing}
          />
        )}
        {message.text && (
          <p className="text-sm leading-relaxed text-foreground">{message.text}</p>
        )}
        <p className="text-[10px] mt-1 text-chat-timestamp text-right flex items-center justify-end gap-0.5">
          {format(new Date(message.timestamp), 'hh:mm a')}
          {isOutgoing && <ReadReceipt status={message.status} />}
        </p>

        {/* Hover action buttons (desktop) */}
        {showActions && (onReply || onForward) && (
          <div className={`absolute top-1 ${isOutgoing ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} flex items-center gap-0.5`}>
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                title="Forward"
              >
                <Forward className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
