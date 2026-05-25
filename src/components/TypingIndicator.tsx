const TypingIndicator = ({ name = 'Someone' }: { name?: string }) => {
  return (
    <div className="flex items-end gap-1 px-3 py-1.5 wa-chat-bg animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="bg-chat-bubble-in rounded-2xl rounded-bl-none px-3 py-2 shadow-sm flex items-center gap-2 max-w-[160px]">
        {/* Animated dots */}
        <div className="flex items-center gap-[3px]">
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            style={{ animation: 'typing 1.2s ease-in-out infinite 0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            style={{ animation: 'typing 1.2s ease-in-out infinite 200ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            style={{ animation: 'typing 1.2s ease-in-out infinite 400ms' }}
          />
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground pb-1 truncate max-w-[120px]">
        {name} is typing
      </span>
    </div>
  );
};

export default TypingIndicator;
