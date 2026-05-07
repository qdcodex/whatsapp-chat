# Socket.io Real-time Setup Guide

## Architecture Overview

This guide explains the WebSocket setup for real-time features: online status and typing indicators.

### Components

1. **Server** (`server.ts`)
   - Custom HTTP server that initializes Socket.io
   - Manages user connections and room management
   - Tracks online status and typing state

2. **Socket.io Server** (`src/lib/socketIO.ts`)
   - Handles connection/disconnection
   - Routes events to specific rooms
   - Tracks user online status
   - Auto-stops typing indicators after 10 seconds

3. **Socket Client** (`src/lib/socketClient.ts`)
   - Client-side wrapper around socket.io-client
   - Provides event emit/listen interface
   - Debounced typing indicators (3 second timeout)

4. **React Hooks**
   - `useSocket`: Basic socket connection and event handling
   - `useOnlineStatus`: Track which users are online and typing
   - `useTypingIndicator`: Helper for message input typing state

## Installation

1. Add `tsx` to dev dependencies:
```bash
bun add -D tsx
# or
npm install --save-dev tsx
```

2. Install dependencies (socket.io already included):
```bash
bun install
```

## Running

```bash
# Development
bun run dev

# Production
bun run build
bun start
```

## Event Reference

### Client → Server Events

**`user:typing-start`**
```typescript
{ targetId?: string, groupId?: string }
```
Emitted when user starts typing. Server will auto-stop after 10s of inactivity.

**`user:typing-stop`**
```typescript
{ targetId?: string, groupId?: string }
```
Explicitly stop typing indicator.

**`request:online-users`**
Request current list of online users.

**`message:send`**
```typescript
{ messageId: string, content: string, ... }
```

**`message:status-update`**
```typescript
{ messageId: string, status: 'sent' | 'delivered' | 'read' }
```

**`message:delete`**
```typescript
{ messageId: string }
```

### Server → Client Events

**`connected`**
```typescript
{ userId: string, workspaceId: string, socketId: string }
```
Sent when connection established.

**`user:online`**
```typescript
{ userId: string, timestamp: number, socketId?: string }
```
User came online in this workspace.

**`user:offline`**
```typescript
{ userId: string, timestamp: number }
```
User went offline (all connections closed).

**`user:typing-start`**
```typescript
{ userId: string, targetId?: string, groupId?: string, timestamp: number }
```

**`user:typing-stop`**
```typescript
{ userId: string, targetId?: string, groupId?: string, timestamp: number }
```

**`online-users`**
```typescript
{ onlineUsers: string[], timestamp: number }
```
Response to `request:online-users`.

**`message:new`**, **`message:status-update`**, **`message:deleted`**
Same format as client sent events.

## Usage Examples

### Basic Connection

```tsx
'use client';

import { useSocket } from '@/hooks/useSocket';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function ChatRoom({ userId, workspaceId }: Props) {
  const { on } = useSocket({ userId, workspaceId });
  const { onlineUsers, isUserOnline } = useOnlineStatus({ 
    userId, 
    workspaceId 
  });

  // Other users
  const otherUserId = 'user-123';
  const isOnline = isUserOnline(otherUserId);

  return (
    <div>
      <div className={isOnline ? 'text-green-500' : 'text-gray-500'}>
        {isOnline ? '🟢 Online' : '⚫ Offline'}
      </div>
    </div>
  );
}
```

### Typing Indicator in Message Input

```tsx
'use client';

import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function MessageInput({ userId, workspaceId, groupId }: Props) {
  const { handleInputChange, handleMessageSent } = useTypingIndicator({
    userId,
    workspaceId,
    groupId,
  });
  
  const { typingUsers } = useOnlineStatus({ userId, workspaceId });

  const handleSubmit = async (content: string) => {
    // Send message...
    handleMessageSent(); // Stop typing indicator
  };

  return (
    <div>
      {/* Show who's typing */}
      {typingUsers.size > 0 && (
        <div className="text-sm text-gray-500">
          {Array.from(typingUsers).join(', ')} typing...
        </div>
      )}

      <textarea
        onChange={(e) => {
          handleInputChange(); // Update typing state
        }}
        onBlur={handleInputChange}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

### Listen to Specific Events

```tsx
const { on, emit } = useSocket({ userId, workspaceId });

// Listen for new messages
on('message:new', (data) => {
  console.log('New message:', data);
});

// Send a message
emit('message:send', {
  messageId: '123',
  content: 'Hello',
  timestamp: Date.now(),
});
```

## Rooms & Scoping

- **`user:{userId}`** - Messages to specific user
- **`workspace:{workspaceId}`** - Messages to entire workspace
- **`group:{groupId}`** - Messages to specific group

When you connect with `userId` and `workspaceId`, you're automatically added to:
- `user:{userId}` room
- `workspace:{workspaceId}` room

You can also emit events targeting specific groups:
```typescript
emit('user:typing-start', { groupId: 'group-123' });
```

## Debugging

Enable socket.io debug logs:
```typescript
// In browser console
localStorage.setItem('debug', 'socket.io-client:*');
// Then reload page
```

Server logs will show connection info:
```
User user-123 connected to workspace workspace-456
User user-123 disconnected
```

## Common Issues

**"Socket.io not initialized"**
- Make sure you're running `bun run dev` (not `next dev`)
- The custom server (`server.ts`) must be running

**Events not received**
- Check that `userId` and `workspaceId` match between client and server
- Verify both are in the same room with `io.to('room-name').emit(...)`

**Typing indicator persists**
- Client has 3-second auto-stop, server has 10-second timeout
- Manually call `stopTyping()` to clear immediately

## Performance Tips

1. **Debounce typing**: Already implemented in hooks with 3-second client timeout
2. **Limit rooms**: Only join necessary rooms to reduce broadcast overhead
3. **Use targetId for 1:1**: Instead of broadcasting to whole workspace
4. **Monitor connections**: Check online users count with `emit('request:online-users')`
