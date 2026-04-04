const TypingIndicator = ({ name = 'Admin' }: { name?: string }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 wa-chat-bg">
      <div className="bg-chat-bubble-in rounded-lg rounded-tl-none px-3 py-2 shadow-sm flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[typing_1.4s_infinite_0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[typing_1.4s_infinite_200ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[typing_1.4s_infinite_400ms]" />
        </div>
        <span className="text-xs text-muted-foreground">{name} is typing</span>
      </div>
    </div>
  );
};

export default TypingIndicator;
