interface UnreadBadgeProps {
  count: number;
}

const UnreadBadge = ({ count }: UnreadBadgeProps) => {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-primary-foreground bg-primary rounded-full shrink-0">
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default UnreadBadge;
