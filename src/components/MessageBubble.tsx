import { format } from 'date-fns';
import type { Message } from '@/types';
import AudioPlayer from './AudioPlayer';
import ReadReceipt from './ReadReceipt';

interface MessageBubbleProps {
  message: Message;
  isOutgoing?: boolean;
  senderName?: string;
}

const MessageBubble = ({ message, isOutgoing = false, senderName }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm ${
          isOutgoing
            ? 'bg-chat-bubble-out rounded-br-md'
            : 'bg-chat-bubble-in rounded-bl-md'
        }`}
      >
        {senderName && !isOutgoing && (
          <p className="text-xs font-semibold text-primary mb-1">{senderName}</p>
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
      </div>
    </div>
  );
};

export default MessageBubble;
