import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Smile, Paperclip, Mic, X, Camera, FileText, Image as ImageIcon, Reply } from 'lucide-react';
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
  onSendComplete?: () => void;
}

const MessageComposer = ({ onSend, onTyping, replyingTo, onCancelReply, onSendComplete }: MessageComposerProps) => {
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

  // Prevent body scroll when emoji picker is open
  useEffect(() => {
    if (showEmoji) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEmoji]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

  useEffect(() => {
    if (replyingTo) textareaRef.current?.focus();
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
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '36px';
      textareaRef.current.focus(); // Auto-focus for next message
    }
    // Trigger callback to clear typing indicator
    if (onSendComplete) {
      setTimeout(() => onSendComplete?.(), 100);
    }
  };


  const onEmojiSelect = (emoji: { native: string }) => {
    setText((prev) => prev + emoji.native);
    textareaRef.current?.focus();
    setShowEmoji(false); // Close emoji picker after selection
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
    { icon: ImageIcon, label: 'Gallery', bg: 'bg-violet-500', onClick: () => fileRef.current?.click() },
    { icon: Camera, label: 'Camera', bg: 'bg-pink-500', onClick: () => cameraRef.current?.click() },
    { icon: FileText, label: 'Document', bg: 'bg-blue-500', onClick: () => docRef.current?.click() },
  ];

  return (
    <div className="bg-wa-sidebar-header px-2 py-1.5 relative safe-area-bottom">
      {/* Emoji Picker - Full Width Modal */}
      {showEmoji && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setShowEmoji(false)}
          />
          {/* Emoji Picker Modal */}
          <div ref={emojiRef} className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl rounded-t-3xl overflow-hidden bg-white dark:bg-slate-950 max-h-[70vh] border-t border-border">
            <div className="flex flex-col h-full">
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </div>
              {/* Emoji Picker */}
              <div className="flex-1 overflow-y-auto px-2">
                <Picker
                  data={data}
                  onEmojiSelect={onEmojiSelect}
                  theme="light"
                  previewPosition="none"
                  skinTonePosition="none"
                  maxFrequentRows={2}
                  perLine={8}
                  width="100%"
                  height="100%"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Attachment Menu */}
      {showAttach && (
        <div ref={attachRef} className="absolute bottom-full left-2 sm:left-12 mb-2 z-50">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-4 grid grid-cols-3 gap-4">
            {attachmentOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="flex flex-col items-center gap-1.5 hover:scale-110 active:scale-95 transition-transform"
              >
                <div className={`w-12 h-12 rounded-full ${opt.bg} flex items-center justify-center text-primary-foreground`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">{opt.label}</span>
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
        <div className="flex items-center gap-2 mb-1.5 mx-1 bg-card rounded-lg px-3 py-2 border-l-[3px] border-primary">
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
        <div className="relative inline-block mb-1.5 ml-1">
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
        <div className="flex items-center gap-2 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground h-10 w-10"
            onClick={cancelRecording}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-2 bg-card rounded-full px-4 py-2">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">{formatTime(recordingTime)}</span>
            <div className="flex-1 h-1 rounded-full bg-destructive/20 overflow-hidden">
              <div className="h-full bg-destructive rounded-full animate-pulse" style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }} />
            </div>
          </div>
          <Button
            size="icon"
            className="shrink-0 rounded-full h-11 w-11 bg-primary hover:bg-primary/90"
            onClick={stopRecording}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      ) : (
        /* Normal composer */
        <div className="flex items-end gap-1">
          <div className="flex-1 flex items-end bg-card rounded-full px-1 border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-primary h-9 w-9 rounded-full"
              onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
            >
              <Smile className="w-5 h-5" />
            </Button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onTyping?.();
              }}
              onKeyDown={(e) => {
                // Ctrl/Cmd + Enter to send, Enter for new line
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={() => {
                setShowEmoji(false);
                setShowAttach(false);
              }}
              onPaste={(e) => {
                // Handle image paste
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    const reader = new FileReader();
                    reader.onloadend = () => setImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none bg-transparent py-2.5 px-0.5 text-sm outline-none placeholder:text-muted-foreground max-h-[120px] min-h-[36px] scrollbar-hide"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-primary h-9 w-9 rounded-full"
              onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </div>

          {hasContent ? (
            <Button
              size="icon"
              className="shrink-0 rounded-full h-11 w-11 bg-primary hover:bg-primary/90"
              onClick={handleSend}
            >
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="shrink-0 rounded-full h-11 w-11 bg-primary hover:bg-primary/90 text-primary-foreground"
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
