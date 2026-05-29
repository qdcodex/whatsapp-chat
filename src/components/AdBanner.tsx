'use client';

import { ExternalLink } from 'lucide-react';

interface AdBannerProps {
  title?: string;
  text?: string;
  imageUrl?: string;
  linkUrl?: string;
  /** compact = sidebar strip; full = centered empty-panel card */
  variant?: 'compact' | 'full';
}

export default function AdBanner({
  title,
  text,
  imageUrl,
  linkUrl,
  variant = 'compact',
}: AdBannerProps) {
  const hasContent = title || text || imageUrl;
  if (!hasContent) return null;

  const inner = (
    <div
      className={
        variant === 'full'
          ? 'flex flex-col items-center gap-3 text-center'
          : 'flex items-center gap-2.5'
      }
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title || 'Ad'}
          className={
            variant === 'full'
              ? 'w-full max-w-xs rounded-xl object-cover'
              : 'w-10 h-10 rounded-lg object-cover shrink-0'
          }
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className={variant === 'full' ? 'space-y-1' : 'min-w-0 flex-1'}>
        {title && (
          <p className={`font-semibold leading-tight ${variant === 'full' ? 'text-sm' : 'text-[12px] truncate'}`}>
            {title}
          </p>
        )}
        {text && (
          <p className={`text-muted-foreground ${variant === 'full' ? 'text-xs' : 'text-[11px] truncate'}`}>
            {text}
          </p>
        )}
      </div>
      {linkUrl && variant === 'full' && (
        <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
          Learn more <ExternalLink className="w-3 h-3" />
        </span>
      )}
    </div>
  );

  const wrapper =
    variant === 'full'
      ? 'flex flex-col items-center justify-center flex-1 px-6 py-8'
      : 'px-3 py-2.5 border-t border-border/50 bg-secondary/40';

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${wrapper} hover:bg-secondary/70 transition-colors cursor-pointer block`}
      >
        {inner}
        {variant === 'compact' && (
          <span className="text-[10px] text-muted-foreground/60 mt-0.5 text-right block">Sponsored</span>
        )}
      </a>
    );
  }

  return (
    <div className={wrapper}>
      {inner}
      {variant === 'compact' && (
        <span className="text-[10px] text-muted-foreground/60 mt-0.5 text-right block">Sponsored</span>
      )}
    </div>
  );
}
