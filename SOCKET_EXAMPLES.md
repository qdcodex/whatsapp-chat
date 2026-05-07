# Real-time Socket.io Examples

## Example 1: User Online Status Badge

```tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface UserBadgeProps {
  userId: string;
  currentUserId: string;
  workspaceId: string;
  userName: string;
}

export function UserBadge({
  userId,
  currentUserId,
  workspaceId,
  userName,
}: UserBadgeProps) {
  const { isUserOnline } = useOnlineStatus({
    userId: currentUserId,
    workspaceId,
  });

  const online = isUserOnline(userId);

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span>{userName}</span>
    </div>
  );
}
```

## Example 2: Message Input with Typing Indicator

```tsx
'use client';

import { useState } from 'react';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { socketClient } from '@/lib/socketClient';

interface MessageInputProps {
  userId: string;
  workspaceId: string;
  groupId: string;
  onSend: (content: string) => Promise<void>;
}

export function MessageInput({
  userId,
  workspaceId,
  groupId,
  onSend,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { handleInputChange, handleMessageSent } = useTypingIndicator({
    userId,
    workspaceId,
    groupId,
  });

  const { typingUsers } = useOnlineStatus({ userId, workspaceId });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    handleInputChange(); // Update typing state
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await onSend(content);
      setContent('');
      handleMessageSent(); // Stop typing indicator
    } finally {
      setIsLoading(false);
    }
  };

  // Get typing user names (you'd map IDs to names in real app)
  const typingUsersList = Array.from(typingUsers);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {/* Typing indicator */}
      {typingUsersList.length > 0 && (
        <div className="text-sm text-gray-500 px-4 py-1">
          {typingUsersList.join(', ')} {typingUsersList.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={content}
          onChange={handleChange}
          onBlur={handleInputChange}
          placeholder="Type your message..."
          rows={3}
          className="flex-1 p-2 border rounded"
        />
        <button
          type="submit"
          disabled={!content.trim() || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}
```

## Example 3: Full Chat Component

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { MessageInput } from './MessageInput';

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatProps {
  userId: string;
  workspaceId: string;
  groupId: string;
  userName: string;
  onLoadMessages: () => Promise<Message[]>;
}

export function Chat({
  userId,
  workspaceId,
  groupId,
  userName,
  onLoadMessages,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const { on, emit } = useSocket({ userId, workspaceId });
  const { onlineUsers, isUserOnline } = useOnlineStatus({
    userId,
    workspaceId,
  });

  // Load initial messages
  useEffect(() => {
    onLoadMessages().then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [onLoadMessages]);

  // Listen for new messages
  useEffect(() => {
    const unsubscribe = on('message:new', (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    return unsubscribe;
  }, [on]);

  // Listen for message status updates
  useEffect(() => {
    const unsubscribe = on('message:status-update', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, status: data.status } : msg
        )
      );
    });

    return unsubscribe;
  }, [on]);

  const handleSendMessage = async (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      userId,
      content,
      timestamp: Date.now(),
      status: 'sent',
    };

    // Add to local state immediately
    setMessages((prev) => [...prev, message]);

    // Send via socket and API
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          content,
          userId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send');

      // Broadcast to others in the group
      emit('message:send', {
        ...message,
        groupId,
      });

      // Update status to delivered
      emit('message:status-update', {
        messageId: message.id,
        status: 'delivered',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally remove the message or show error
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">{userName}</h2>
        <div
          className={`px-3 py-1 rounded text-sm ${
            isUserOnline(userId) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isUserOnline(userId) ? '🟢 Online' : '⚫ Offline'}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.userId === userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                msg.userId === userId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p>{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
                {msg.userId === userId && ` • ${msg.status}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <MessageInput
          userId={userId}
          workspaceId={workspaceId}
          groupId={groupId}
          onSend={handleSendMessage}
        />
      </div>
    </div>
  );
}
```

## Example 4: Online Users List

```tsx
'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface User {
  id: string;
  name: string;
}

interface OnlineUsersProps {
  userId: string;
  workspaceId: string;
  users: User[];
}

export function OnlineUsersList({ userId, workspaceId, users }: OnlineUsersProps) {
  const { onlineUsers } = useOnlineStatus({ userId, workspaceId });

  return (
    <div className="bg-gray-50 p-4 rounded">
      <h3 className="font-semibold mb-3">Online ({onlineUsers.size})</h3>
      <div className="space-y-2">
        {users.map((user) => {
          const isOnline = onlineUsers.has(user.id);
          return (
            <div key={user.id} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className={isOnline ? 'text-gray-900' : 'text-gray-500'}>
                {user.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## Setup Steps

1. **Start the server**
   ```bash
   bun run dev
   ```
   This runs the custom server with socket.io support.

2. **Verify connection** in browser console:
   ```javascript
   // Check if socket is connected
   localStorage.setItem('debug', 'socket.io-client:*');
   // Reload and check console logs
   ```

3. **Use in your pages**
   ```tsx
   import { Chat } from '@/components/Chat';

   export default function GroupPage() {
     return (
       <Chat
         userId="user-123"
         workspaceId="workspace-456"
         groupId="group-789"
         userName="Friends"
         onLoadMessages={async () => {
           const res = await fetch('/api/messages?groupId=group-789');
           return res.json();
         }}
       />
     );
   }
   ```

## Testing Real-time Features

Open the same group in 2 browser tabs/windows (same user or different users):

1. **Online Status** - Refresh one tab, see status change in the other
2. **Typing Indicator** - Start typing in one tab, see indicator in the other
3. **Messages** - Send a message from one tab, see it appear in the other
4. **Auto-stop** - Stop typing, indicator disappears after 3 seconds

## Troubleshooting

- **Events not firing**: Check browser console for socket.io errors
- **Connection refused**: Make sure `bun run dev` is running (not `next dev`)
- **Typing stuck**: Clear manually or wait 10 seconds for server auto-stop
- **Wrong scope**: Verify `groupId` or `targetId` matches between client and server
