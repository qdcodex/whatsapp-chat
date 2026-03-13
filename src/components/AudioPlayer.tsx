import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  isOutgoing?: boolean;
}

const AudioPlayer = ({ audioUrl, duration = 0, isOutgoing }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animRef = useRef<number>();

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`;

  const updateProgress = () => {
    if (audioRef.current) {
      const { currentTime: ct, duration: d } = audioRef.current;
      if (d && isFinite(d)) {
        setProgress((ct / d) * 100);
        setCurrentTime(ct);
      }
    }
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
  };

  const displayTime = isPlaying || currentTime > 0 ? currentTime : duration;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <audio ref={audioRef} src={audioUrl} onEnded={handleEnded} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isOutgoing
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-1.5 rounded-full bg-muted-foreground/20 cursor-pointer relative overflow-hidden"
          onClick={handleBarClick}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isOutgoing ? 'bg-primary' : 'bg-accent-foreground'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">{formatTime(displayTime)}</span>
      </div>
    </div>
  );
};

export default AudioPlayer;
