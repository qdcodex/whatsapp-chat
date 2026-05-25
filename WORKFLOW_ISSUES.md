# Broadcast Hub - Workflow & Issues Checklist

## Startup Workflow

```
1. User runs: bun run dev
   ↓
2. tsx watch server.ts starts
   ↓
3. server.ts initializes Next.js app
   ↓
4. initializeSocketIO() attaches to HTTP server
   ↓
5. Server listens on port 3000
   ↓
6. Client connects via socket.io-client
   ↓
7. Real-time features: online status, typing indicators work
```

---

## 🔴 CRITICAL ISSUES

### 1. **tsx NOT in Dependencies** ⚠️
**Location:** `package.json`

**Problem:**
- Scripts require `tsx` but it's not in `devDependencies`
- `bun run dev` will FAIL with "command not found: tsx"
- **Impact:** Cannot start dev server

**Fix:**
```bash
bun add -D tsx
```

Then:
```json
"devDependencies": {
  "tsx": "^4.7.0",  // ADD THIS
  // ... other deps
}
```

**Status:** ❌ NOT FIXED

---

### 2. **Production Start Script Issue**
**Location:** `package.json` line 3

**Problem:**
```json
"start": "NODE_ENV=production tsx server.ts"
```
- `NODE_ENV=` syntax doesn't work on Windows with bun/npm
- Should use cross-platform solution

**Fix (Option A - Windows compatible):**
```json
"start": "cross-env NODE_ENV=production tsx server.ts"
```
Then add: `bun add -D cross-env`

**Fix (Option B - Simpler):**
```json
"start": "tsx server.ts"
```
Then in `server.ts` add: `process.env.NODE_ENV ||= 'production'`

**Status:** ⚠️ PARTIALLY BROKEN (only on Windows)

---

### 3. **Socket.io Client URL Not Explicit**
**Location:** `src/lib/socketClient.ts` line 15

**Problem:**
```typescript
this.socket = io({
  query: { userId, workspaceId },
  // ... no URL specified
});
```
- Uses auto-detection (works in dev but fragile for production)
- Might fail if CORS misconfigured on Fly.io

**Fix:**
```typescript
const socketUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:3000';

this.socket = io(socketUrl, {
  query: { userId, workspaceId },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
});
```

**Status:** ⚠️ FRAGILE (works locally, risky in production)

---

## 🟡 MAJOR ISSUES

### 4. **No Socket Connection Initialization**
**Location:** App doesn't initialize socket anywhere

**Problem:**
- `useSocket` hook exists but needs userId & workspaceId
- But where does the app get these? (From auth store?)
- No component calls `useSocket` yet
- Socket never connects unless explicitly called

**Fix:**
Create `src/components/SocketProvider.tsx`:
```typescript
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSocket } from '@/hooks/useSocket';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const userId = useAuthStore(s => s.user?.id);
  const workspaceId = useWorkspaceStore(s => s.currentWorkspace?.id);

  useSocket({
    userId: userId || '',
    workspaceId: workspaceId || '',
  });

  return <>{children}</>;
}
```

Add to `app/providers.tsx`:
```typescript
import { SocketProvider } from '@/components/SocketProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      {/* ... existing providers ... */}
    </SocketProvider>
  );
}
```

**Status:** ❌ NOT IMPLEMENTED

---

### 5. **Missing .env.example**
**Location:** Root directory

**Problem:**
- Only `.env.local` exists (local MongoDB)
- No `.env.example` for reference
- Developers don't know what env vars are needed
- Fly.io deployment will be missing variables

**Fix:**
Create `.env.example`:
```
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname

# Socket.io
SOCKET_IO_CORS_ORIGIN=http://localhost:3000

# Server
PORT=3000
NODE_ENV=development
```

**Status:** ❌ MISSING

---

### 6. **No Fly.io Configuration Files**
**Location:** Missing `fly.toml` and `Dockerfile`

**Problem:**
- No deployment configuration
- `fly.io launch` hasn't been run
- Cannot deploy to Fly.io

**Status:** ❌ MISSING (needed for Fly.io deployment)

---

## 🟠 MODERATE ISSUES

### 7. **Socket.io CORS Configuration Hard-coded**
**Location:** `src/lib/socketIO.ts` lines 15-23

**Problem:**
```typescript
cors: {
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => callback(null, true)  // ⚠️ INSECURE!
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
},
```
- Production allows ANY origin (security issue)
- Should read from env variable

**Fix:**
```typescript
cors: {
  origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || 
          (dev ? 'http://localhost:3000' : '*'),
  credentials: true,
},
```

**Status:** ⚠️ INSECURE FOR PRODUCTION

---

### 8. **API Socket Route Unused**
**Location:** `src/app/api/socket/route.ts`

**Problem:**
- This route exists but is never used
- The custom server handles everything
- Confusing code

**Fix:**
Delete `src/app/api/socket/route.ts` (it's redundant)

**Status:** ℹ️ CLEANUP NEEDED

---

### 9. **No Error Boundary for Socket Failures**
**Location:** hooks don't handle socket errors gracefully

**Problem:**
- If socket fails to connect, no fallback UI
- Typing indicators don't degrade gracefully
- No retry logic visible to user

**Fix:**
Add error state to `useSocket`:
```typescript
const [socketError, setSocketError] = useState<string | null>(null);

useEffect(() => {
  const unsubError = on('error', (error) => {
    setSocketError(error?.message || 'Connection failed');
    setTimeout(() => setSocketError(null), 5000);
  });
  return unsubError;
}, [on]);

return {
  isConnected: socketClient.isConnected(),
  socketError,
  // ...
};
```

**Status:** ⚠️ NOT IMPLEMENTED

---

## 🔵 MINOR ISSUES

### 10. **No TypeScript Types for Socket Events**
**Location:** Entire codebase

**Problem:**
- Events like 'user:typing-start' are string literals
- No type safety for event data
- Easy to make typos

**Fix:**
Create `src/types/socket.ts`:
```typescript
export interface SocketEvents {
  'user:typing-start': { userId: string; targetId?: string; groupId?: string };
  'user:typing-stop': { userId: string; targetId?: string; groupId?: string };
  'user:online': { userId: string; timestamp: number };
  'user:offline': { userId: string; timestamp: number };
  'message:new': { id: string; userId: string; content: string; timestamp: number };
  'message:status-update': { messageId: string; status: 'sent' | 'delivered' | 'read' };
  'message:deleted': { messageId: string };
}
```

Then use typed emit/on:
```typescript
on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void)
```

**Status:** ℹ️ OPTIONAL BUT RECOMMENDED

---

### 11. **No Socket.io Logging in Production**
**Location:** `src/lib/socketIO.ts`

**Problem:**
- `console.log` statements won't help in production
- No structured logging
- Hard to debug issues on Fly.io

**Fix:**
Add logging service (or simple logger):
```typescript
const log = (msg: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [socket] ${msg}`, data || '');
};
```

**Status:** ℹ️ NICE TO HAVE

---

### 12. **Typing Timeout Values Not Consistent**
**Location:** Multiple files

**Problem:**
- Client: 3 second timeout in `useTypingIndicator`
- Server: 10 second timeout in `socketIO.ts`
- No documentation of why different

**Fix:**
Document in `SOCKET_IO_SETUP.md`:
```
Typing Timeout Strategy:
- Client: 3s (fast UX feedback)
- Server: 10s (safeguard against stuck indicators)
- Both auto-stop to prevent stuck "X is typing..." forever
```

**Status:** ℹ️ DOCUMENT ONLY

---

## 📋 Pre-Deployment Checklist

- [ ] Run `bun add -D tsx` (CRITICAL)
- [ ] Run `bun install`
- [ ] Create `SocketProvider` component and add to app/providers.tsx
- [ ] Create `.env.example` file
- [ ] Delete `src/app/api/socket/route.ts` (redundant)
- [ ] Fix CORS configuration in socketIO.ts
- [ ] Test: `bun run dev` - verify socket connects
- [ ] Test: Open 2 tabs, check online status syncs
- [ ] Test: Type in one tab, see indicator in other tab
- [ ] Update start script for cross-platform support
- [ ] Create `Dockerfile` and `fly.toml` for Fly.io
- [ ] Set environment variables in Fly.io dashboard
- [ ] Deploy: `flyctl deploy`

---

## 🧪 Testing Workflow

### Local Testing
```bash
# Terminal 1
bun run dev

# Browser Tab 1: Open http://localhost:3000
# Browser Tab 2: Open http://localhost:3000

# Enable socket.io debug:
localStorage.setItem('debug', 'socket.io-client:*');
// Reload page

# Test features:
# 1. Refresh Tab 2 → see online status update in Tab 1
# 2. Type in message input in Tab 1 → see "X is typing..." in Tab 2
# 3. Stop typing → indicator disappears after 3 seconds
```

### Production Testing (Fly.io)
```bash
flyctl launch
flyctl deploy
# Visit your-app.fly.dev
# Test same as local
```

---

## Summary of Issues by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 2 | tsx missing, production script broken |
| 🟡 Major | 4 | Socket init, .env.example, Fly.io config, no socket provider |
| 🟠 Moderate | 3 | CORS insecure, unused route, no error boundary |
| 🔵 Minor | 3 | No types, no logging, timeout inconsistency |

**Total blocking issues before production: 2**
**Total recommended fixes: 12**

---

## Next Steps

1. **Immediately:** Add tsx to dependencies
2. **Before local testing:** Create SocketProvider
3. **Before deployment:** Create Fly.io config files
4. **Before production:** Fix CORS and environment variables
