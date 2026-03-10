import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, X, Camera, FileText, Image as ImageIcon, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface MessageComposerProps {
  onSend: (text?: string, imageUrl?: string) => void;
  onTyping?: () => void;
}

const MessageComposer = ({ onSend }: MessageComposerProps) => {
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

  // Close popups on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false);
      if (attachRef.current && !attachRef.current.contains(e.target as Node)) setShowAttach(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [text]);

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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      setRecordingTime(0);
      // In a real app, stop MediaRecorder and send the audio blob
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const hasContent = text.trim() || imagePreview;

  const attachmentOptions = [
    { icon: ImageIcon, label: 'Gallery', color: 'text-violet-500', onClick: () => fileRef.current?.click() },
    { icon: Camera, label: 'Camera', color: 'text-pink-500', onClick: () => cameraRef.current?.click() },
    { icon: FileText, label: 'Document', color: 'text-blue-500', onClick: () => docRef.current?.click() },
  ];

  return (
    <div className="border-t border-border bg-card px-2 py-2 relative">
      {/* Emoji Picker */}
      {showEmoji && (
        <div ref={emojiRef} className="absolute bottom-full left-2 mb-2 z-50 shadow-xl rounded-xl overflow-hidden">
          <Picker data={data} onEmojiSelect={onEmojiSelect} theme="light" previewPosition="none" skinTonePosition="none" maxFrequentRows={2} />
        </div>
      )}

      {/* Attachment Menu */}
      {showAttach && (
        <div ref={attachRef} className="absolute bottom-full left-12 mb-2 z-50">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-3 flex gap-4">
            {attachmentOptions.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.onClick}
                className="flex flex-col items-center gap-1.5 hover:scale-110 transition-transform"
              >
                <div className={`w-12 h-12 rounded-full bg-secondary flex items-center justify-center ${opt.color}`}>
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

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 mb-2 ml-1 text-destructive animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-sm font-medium">Recording {formatTime(recordingTime)}</span>
        </div>
      )}

      {/* Composer row */}
      <div className="flex items-end gap-1.5">
        {/* Emoji button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-primary h-10 w-10"
          onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
        >
          <Smile className="w-5 h-5" />
        </Button>

        {/* Attach button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-primary h-10 w-10"
          onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setShowEmoji(false); setShowAttach(false); }}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none bg-secondary rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground max-h-[120px] min-h-[40px]"
        />

        {/* Send or Mic button */}
        {hasContent ? (
          <Button
            size="icon"
            className="shrink-0 rounded-full h-10 w-10"
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant={isRecording ? 'destructive' : 'ghost'}
            size="icon"
            className={`shrink-0 rounded-full h-10 w-10 ${isRecording ? '' : 'text-muted-foreground hover:text-primary'}`}
            onClick={toggleRecording}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default MessageComposer;
