import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import type { Message } from '@/types';
import AudioPlayer from './AudioPlayer';
import ReadReceipt from './ReadReceipt';
import { Reply, Forward, CornerUpRight, Trash2, Copy, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isOutgoing?: boolean;
  currentUserId?: string;
  senderName?: string;
  senderPhone?: string;
  senderAvatar?: string;
  showUserDetails?: boolean;
  channelLabel?: string;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onDelete?: (message: Message, mode: 'for_me' | 'for_everyone') => void;
}

const LONG_PRESS_MS = 450;

const MessageBubble = ({
  message,
  isOutgoing = false,
  currentUserId,
  senderName,
  senderPhone,
  senderAvatar,
  showUserDetails = false,
  channelLabel,
  onReply,
  onForward,
  onDelete,
}: MessageBubbleProps) => {
  const [deleteConfirm, setDeleteConfirm] = useState<'for_me' | 'for_everyone' | null>(null);
  const [showSheet, setShowSheet] = useState(false);   // mobile bottom-sheet
  const [pressing, setPressing] = useState(false);      // visual feedback on long press

  // Swipe-to-reply
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Long-press timer
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didSwipe = useRef(false);

  /* ── touch handlers ─────────────────────────── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    didSwipe.current = false;

    longPressTimer.current = setTimeout(() => {
      if (!didSwipe.current) {
        setPressing(true);
        // Small vibration feedback on supported devices
        if (navigator.vibrate) navigator.vibrate(30);
        setShowSheet(true);
      }
    }, LONG_PRESS_MS);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const dx = isOutgoing
      ? touchStartX.current - touchCurrentX.current
      : touchCurrentX.current - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);

    // Cancel long press if moved significantly
    if (dx > 8 || dy > 8) {
      didSwipe.current = true;
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }

    if (dx > 0 && dy < 30) {
      setSwipeOffset(Math.min(dx, 80));
    }
  }, [isOutgoing]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setPressing(false);

    if (swipeOffset > 50 && onReply) {
      onReply(message);
    }
    setSwipeOffset(0);
  }, [swipeOffset, onReply, message]);

  /* ── copy text helper ───────────────────────── */
  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text).then(() => toast.success('Copied'));
    }
    setShowSheet(false);
  };

  /* ── "deleted for everyone" placeholder ─────── */
  if (message.deletedForEveryone) {
    return (
      <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1 px-2`}>
        <div className={`max-w-[85%] sm:max-w-[65%] rounded-lg px-3 py-2 border border-dashed ${isOutgoing ? 'border-chat-bubble-out/60 bg-chat-bubble-out/30' : 'border-border bg-secondary/30'}`}>
          <p className="text-[13px] italic text-muted-foreground flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            {isOutgoing ? 'You deleted this message' : 'This message was deleted'}
          </p>
        </div>
      </div>
    );
  }

  const hasActions = onReply || onForward || onDelete;

  return (
    <>
      {/* ── main row ───────────────────────────── */}
      <div
        className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} items-end mb-1 group relative px-2 gap-1`}
      >
        {/* Avatar (incoming group) */}
        {!isOutgoing && showUserDetails && senderName && (
          <Avatar className="h-7 w-7 mb-1 shrink-0">
            <AvatarImage src={senderAvatar} alt={senderName} />
            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
              {senderName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Desktop hover actions — OUTGOING: appear LEFT of bubble */}
        {isOutgoing && hasActions && (
          <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
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
            {onDelete && (
              <button
                onClick={() => setDeleteConfirm(isOutgoing ? 'for_everyone' : 'for_me')}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10 transition-colors shadow-sm"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            )}
          </div>
        )}

        {/* Swipe-to-reply indicator */}
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

        {/* Bubble */}
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
            scale: pressing ? '0.96' : '1',
          }}
          className={`max-w-[85%] sm:max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-sm relative select-none
            ${isOutgoing
              ? 'bg-chat-bubble-out dark:bg-chat-bubble-out rounded-tr-none'
              : 'bg-chat-bubble-in dark:bg-chat-bubble-in rounded-tl-none'}
            ${pressing ? 'brightness-90' : ''}
          `}
        >
          {/* WhatsApp-style tail */}
          <div
            style={{
              width: 0, height: 0, borderStyle: 'solid', position: 'absolute', top: 0,
              ...(isOutgoing
                ? { borderWidth: '0 0 8px 8px', borderColor: 'transparent transparent transparent hsl(var(--chat-bubble-out))', right: -7 }
                : { borderWidth: '0 8px 8px 0', borderColor: 'transparent hsl(var(--chat-bubble-in)) transparent transparent', left: -7 }),
            }}
          />

          {/* Forwarded label */}
          {message.forwardedFrom && (
            <div className="flex items-center gap-1 mb-0.5">
              <CornerUpRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] italic text-muted-foreground">Forwarded</span>
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

          {/* Sender name (group) */}
          {senderName && !isOutgoing && (
            <div className="mb-0.5">
              <p className="text-[12.5px] font-semibold text-primary">
                {senderName}
                {showUserDetails && senderPhone && (
                  <span className="font-normal text-muted-foreground ml-1.5 text-[11px]">~{senderPhone}</span>
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

          {/* Media */}
          {message.imageUrl && (
            <img src={message.imageUrl} alt="Attachment" className="rounded-md mb-1 max-w-full max-h-60 object-cover" />
          )}
          {message.audioUrl && (
            <AudioPlayer audioUrl={message.audioUrl} duration={message.audioDuration} isOutgoing={isOutgoing} />
          )}
          {message.text && (
            <p className={`text-[14.2px] leading-[19px] whitespace-pre-wrap font-medium ${isOutgoing ? 'text-black dark:text-white' : 'text-foreground'}`}>
              {message.text}
            </p>
          )}

          {/* Timestamp + read receipt */}
          <p className={`text-[11px] mt-0.5 text-right flex items-center justify-end gap-0.5 -mb-0.5 ${isOutgoing ? 'text-gray-600 dark:text-gray-400' : 'text-muted-foreground'}`}>
            {format(new Date(message.timestamp), 'h:mm a')}
            {isOutgoing && <ReadReceipt status={message.status} />}
          </p>
        </div>

        {/* Desktop hover actions — INCOMING: appear RIGHT of bubble */}
        {!isOutgoing && hasActions && (
          <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0">
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
            {onDelete && (
              <button
                onClick={() => setDeleteConfirm('for_me')}
                className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10 transition-colors shadow-sm"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile bottom-sheet (long press) ──── */}
      {showSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setShowSheet(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card border-t border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-200 safe-area-bottom">
            {/* Message preview */}
            <div className="px-4 pt-4 pb-3 border-b border-border/50">
              <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide font-medium">Message</p>
              <p className="text-sm text-foreground line-clamp-2">
                {message.text || (message.audioUrl ? '🎤 Voice message' : message.imageUrl ? '📷 Photo' : 'Message')}
              </p>
            </div>

            {/* Actions list */}
            <div className="py-1">
              {onReply && (
                <button
                  onClick={() => { onReply(message); setShowSheet(false); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <Reply className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-[15px] font-medium text-foreground">Reply</span>
                </button>
              )}

              {message.text && (
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <Copy className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-[15px] font-medium text-foreground">Copy</span>
                </button>
              )}

              {onForward && (
                <button
                  onClick={() => { onForward(message); setShowSheet(false); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-secondary/60 active:bg-secondary transition-colors"
                >
                  <Forward className="w-5 h-5 text-muted-foreground shrink-0" />
                  <span className="text-[15px] font-medium text-foreground">Forward</span>
                </button>
              )}

              {onDelete && (
                <>
                  <div className="mx-4 border-t border-border/50 my-1" />

                  <button
                    onClick={() => { setDeleteConfirm('for_me'); setShowSheet(false); }}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-destructive shrink-0" />
                    <div className="text-left">
                      <span className="text-[15px] font-medium text-destructive block">Delete for me</span>
                      <span className="text-[12px] text-muted-foreground">Remove from your view only</span>
                    </div>
                  </button>

                  {isOutgoing && (
                    <button
                      onClick={() => { setDeleteConfirm('for_everyone'); setShowSheet(false); }}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                    >
                      <Trash2 className="w-5 h-5 text-destructive shrink-0" />
                      <div className="text-left">
                        <span className="text-[15px] font-medium text-destructive block">Delete for everyone</span>
                        <span className="text-[12px] text-muted-foreground">Remove for all participants</span>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Cancel */}
            <div className="px-4 pb-4 pt-1">
              <button
                onClick={() => setShowSheet(false)}
                className="w-full py-3 rounded-xl bg-secondary text-foreground font-medium text-[15px] hover:bg-secondary/80 active:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirm dialog ─────────────── */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm === 'for_everyone' ? 'Delete for Everyone?' : 'Delete Message?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm === 'for_me'
                ? 'This message will be removed from your view only. Others will still see it.'
                : 'This message will be permanently deleted for everyone in the chat. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm && onDelete) {
                  onDelete(message, deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfirm === 'for_everyone' ? 'Delete for Everyone' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageBubble;
