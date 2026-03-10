const TypingIndicator = ({ name = 'Admin' }: { name?: string }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="bg-chat-bubble-in rounded-2xl rounded-bl-md px-4 py-3 shadow-sm flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-[typing_1.4s_infinite_0ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-[typing_1.4s_infinite_200ms]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-[typing_1.4s_infinite_400ms]" />
        </div>
        <span className="text-xs text-muted-foreground ml-1">{name} is typing</span>
      </div>
    </div>
  );
};

export default TypingIndicator;
