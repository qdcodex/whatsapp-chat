import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline: boolean;
  lastSeen?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const OnlineStatus = ({
  isOnline,
  lastSeen,
  showLabel = true,
  size = 'sm',
}: OnlineStatusProps) => {
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

  if (!showLabel) return null;

  return (
    <div className="flex items-center gap-1">
      {/* Online dot indicator */}
      <span
        className={cn(
          'inline-block rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          isOnline
            ? 'bg-green-400'
            : 'bg-muted-foreground/40'
        )}
      />
      <span
        className={cn(
          'text-white/80',
          size === 'sm' ? 'text-[11px]' : 'text-xs'
        )}
      >
        {getLabel()}
      </span>
    </div>
  );
};

export default OnlineStatus;
