import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const OnlineStatus = ({ isOnline, lastSeen, showLabel = true, size = 'sm' }: OnlineStatusProps) => {
  const dotSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  const getLabel = () => {
    if (isOnline) return 'online';
    if (!lastSeen) return 'offline';
    const diff = Date.now() - lastSeen;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'last seen just now';
    if (mins < 60) return `last seen ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `last seen ${hours}h ago`;
    return `last seen ${Math.floor(hours / 24)}d ago`;
  };

  return (
    <span className="flex items-center gap-1.5">
      <span
        className={cn(
          dotSize,
          'rounded-full shrink-0',
          isOnline
            ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
            : 'bg-muted-foreground/40'
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{getLabel()}</span>
      )}
    </span>
  );
};

export default OnlineStatus;
