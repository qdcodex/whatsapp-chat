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
      ? touchStartX.current - touchCurrentX.current
      : touchCurrentX.current - touchStartX.current;
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
      className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1 group relative px-2`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Sender avatar for incoming group messages */}
      {!isOutgoing && showUserDetails && senderName && (
        <Avatar className="h-7 w-7 mr-1 mt-auto mb-1 shrink-0">
          <AvatarImage src={senderAvatar} alt={senderName} />
          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
            {senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Swipe reply indicators */}
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
        className={`max-w-[85%] sm:max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-sm relative ${
          isOutgoing
            ? 'bg-chat-bubble-out rounded-tr-none'
            : 'bg-chat-bubble-in rounded-tl-none'
        }`}
      >
        {/* WhatsApp-style tail */}
        <div
          className={`absolute top-0 w-3 h-3 ${
            isOutgoing
              ? '-right-1.5 border-t-[6px] border-l-[6px] border-t-chat-bubble-out border-l-transparent'
              : '-left-1.5 border-t-[6px] border-r-[6px] border-t-chat-bubble-in border-r-transparent'
          }`}
          style={{
            width: 0,
            height: 0,
            borderStyle: 'solid',
            ...(isOutgoing
              ? { borderWidth: '0 0 8px 8px', borderColor: 'transparent transparent transparent hsl(var(--chat-bubble-out))' }
              : { borderWidth: '0 8px 8px 0', borderColor: 'transparent hsl(var(--chat-bubble-in)) transparent transparent' }),
            position: 'absolute',
            top: 0,
            ...(isOutgoing ? { right: -7 } : { left: -7 }),
          }}
        />

        {/* Forwarded label */}
        {message.forwardedFrom && (
          <div className="flex items-center gap-1 mb-0.5">
            <CornerUpRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-[11px] italic text-muted-foreground">
              Forwarded
            </span>
          </div>
        )}

        {/* Channel label */}
        {channelLabel && !isOutgoing && (
          <div className="mb-0.5">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {channelLabel}
            </span>
          </div>
        )}

        {/* Sender name for group */}
        {senderName && !isOutgoing && (
          <div className="mb-0.5">
            <p className="text-[12.5px] font-semibold text-primary">
              {senderName}
              {showUserDetails && senderPhone && (
                <span className="font-normal text-muted-foreground ml-1.5 text-[11px]">
                  ~{senderPhone}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Reply quote */}
        {message.replyTo && (
          <div className={`border-l-[3px] border-primary rounded-r px-2 py-1 mb-1 ${isOutgoing ? 'bg-[hsl(var(--wa-bubble-out-deeper))]' : 'bg-secondary/60'}`}>
            <p className="text-[11px] font-semibold text-primary">{message.replyTo.senderName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {message.replyTo.text || '📎 Attachment'}
            </p>
          </div>
        )}

        {message.imageUrl && (
          <img
            src={message.imageUrl}
            alt="Attachment"
            className="rounded-md mb-1 max-w-full max-h-60 object-cover"
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
          <p className="text-[14.2px] leading-[19px] text-foreground whitespace-pre-wrap">{message.text}</p>
        )}
        <p className="text-[11px] mt-0.5 text-chat-timestamp text-right flex items-center justify-end gap-0.5 -mb-0.5">
          {format(new Date(message.timestamp), 'h:mm a')}
          {isOutgoing && <ReadReceipt status={message.status} />}
        </p>

        {/* Hover actions (desktop) */}
        {showActions && (onReply || onForward) && (
          <div className={`absolute top-1 ${isOutgoing ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} flex items-center gap-0.5`}>
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-sm"
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-sm"
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
