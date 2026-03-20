import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Smile, Paperclip, Mic, X, Camera, FileText, Image as ImageIcon, Square, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { toast } from 'sonner';
import type { Message } from '@/types';

interface MessageComposerProps {
  onSend: (text?: string, imageUrl?: string, audioUrl?: string, audioDuration?: number) => void;
  onTyping?: () => void;
  replyingTo?: { message: Message; senderName: string } | null;
  onCancelReply?: () => void;
}

const MessageComposer = ({ onSend, onTyping, replyingTo, onCancelReply }: MessageComposerProps) => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setShowAttach(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  // Focus textarea when replying
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus();
    }
  }, [replyingTo]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    setShowAttach(false);
  };

  const handleSend = () => {
    if (!text.trim() && !imagePreview) return;
    onSend(text.trim() || undefined, imagePreview || undefined);
    setText('');
    setImagePreview(null);
    setShowEmoji(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onEmojiSelect = (emoji: { native: string }) => {
    setText((prev) => prev + emoji.native);
    textareaRef.current?.focus();
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const duration = recordingTime;
          onSend(undefined, undefined, base64, duration);
          toast.success('Voice message sent!');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error('Microphone access denied');
    }
  }, [onSend, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    toast('Recording cancelled');
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const hasContent = text.trim() || imagePreview;

  const attachmentOptions = [
    { icon: ImageIcon, label: 'Gallery', color: 'text-violet-500', onClick: () => fileRef.current?.click() },
    { icon: Camera, label: 'Camera', color: 'text-pink-500', onClick: () => cameraRef.current?.click() },
    { icon: FileText, label: 'Document', color: 'text-blue-500', onClick: () => docRef.current?.click() },
  ];

  return (
    <div className="border-t border-border bg-card px-2 py-2 relative safe-area-bottom">
      {/* Emoji Picker */}
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-full left-0 sm:left-2 mb-2 z-50 shadow-xl rounded-xl overflow-hidden max-w-[calc(100vw-16px)]">
          <Picker data={data} onEmojiSelect={onEmojiSelect} theme="light" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} perLine={7} />
        </div>
      )}

      {/* Attachment Menu */}
      {showAttach && (
        <div ref={attachRef} className="absolute bottom-full left-2 sm:left-12 mb-2 z-50">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-3 flex gap-4">
            {attachmentOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="flex flex-col items-center gap-1.5 hover:scale-110 active:scale-95 transition-transform"
              >
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center ${opt.color}`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input type="file" ref={cameraRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
      <input type="file" ref={docRef} accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleImageSelect} />

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 mx-1 bg-secondary/50 rounded-xl px-3 py-2 border-l-2 border-primary">
          <Reply className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">{replyingTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.message.text || (replyingTo.message.audioUrl ? '🎤 Voice message' : '📷 Photo')}
            </p>
          </div>
          <button onClick={onCancelReply} className="shrink-0">
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative inline-block mb-2 ml-1">
          <img src={imagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
          <button
            onClick={() => setImagePreview(null)}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Recording state */}
      {isRecording ? (
        <div className="flex items-center gap-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground h-10 w-10"
            onClick={cancelRecording}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</span>
            <div className="flex-1 h-1 rounded-full bg-destructive/20 overflow-hidden">
              <div className="h-full bg-destructive rounded-full animate-pulse" style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }} />
            </div>
          </div>
          <Button
            size="icon"
            className="shrink-0 rounded-full h-10 w-10"
            onClick={stopRecording}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        /* Normal composer row */
        <div className="flex items-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
          >
            <Smile className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-primary h-9 w-9 sm:h-10 sm:w-10"
            onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); onTyping?.(); }}
            onKeyDown={handleKeyDown}
            onFocus={() => { setShowEmoji(false); setShowAttach(false); }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-secondary rounded-2xl px-3 sm:px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground max-h-[120px] min-h-[40px]"
          />

          {hasContent ? (
            <Button
              size="icon"
              className="shrink-0 rounded-full h-9 w-9 sm:h-10 sm:w-10"
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full h-9 w-9 sm:h-10 sm:w-10 text-muted-foreground hover:text-primary"
              onClick={startRecording}
            >
              <Mic className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageComposer;
