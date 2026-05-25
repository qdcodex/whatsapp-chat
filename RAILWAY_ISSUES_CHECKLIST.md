# Railway Deployment - Issues & Fixes Checklist

## Issues Status for Railway

### 🔴 CRITICAL - MUST FIX BEFORE DEPLOYING

#### Issue #1: `tsx` NOT in devDependencies
**Severity:** BLOCKING
**Status:** ❌ NOT FIXED

Railway will fail during build if tsx is not in dependencies.

```bash
bun add -D tsx
```

**Verification:**
```bash
# Before commit
cat package.json | grep '"tsx"'
# Should output: "tsx": "^4.7.0"
```

---

#### Issue #2: SocketProvider NOT Created
**Severity:** BLOCKING (Socket won't work)
**Status:** ❌ NOT IMPLEMENTED

Socket initialization requires a provider component.

**Create file:** `src/components/SocketProvider.tsx`
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

**Update file:** `src/app/providers.tsx`
```typescript
'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { StoreInitializer } from "@/components/StoreInitializer";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SocketProvider } from "@/components/SocketProvider";  // ADD THIS

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <StoreInitializer />
          <InstallPrompt />
          <Toaster />
          <Sonner />
          {children}
        </TooltipProvider>
      </QueryClientProvider>
    </SocketProvider>
  );
}
```

---

#### Issue #3: package.json Scripts Need Update
**Severity:** BLOCKING (start won't work)
**Status:** ⚠️ PARTIALLY FIXED (dev script ok, start script has NODE_ENV)

Railway doesn't like `NODE_ENV=` syntax. Must remove it.

**Current (WRONG):**
```json
"start": "NODE_ENV=production tsx server.ts"
```

**Fix:**
```json
"start": "tsx server.ts"
```

Railway automatically sets `NODE_ENV=production` via environment variables.

---

#### Issue #4: SOCKET_IO_CORS_ORIGIN Not Set
**Severity:** BLOCKING (CORS errors in production)
**Status:** ❌ NOT CONFIGURED

Socket.io will reject connections from different origin if CORS not configured.

**Update file:** `src/lib/socketIO.ts` lines 15-22

**Current (INSECURE):**
```typescript
cors: {
  origin: process.env.NODE_ENV === 'production'
    ? (origin, callback) => callback(null, true)  // ❌ ALLOWS ANY ORIGIN
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
},
```

**Fix:**
```typescript
cors: {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.SOCKET_IO_CORS_ORIGIN,
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
},
```

**In Railway Dashboard, set:**
```
SOCKET_IO_CORS_ORIGIN = https://[your-app-name].up.railway.app
```

---

#### Issue #5: socketClient URL Not Explicit
**Severity:** HIGH (Fragile in production)
**Status:** ⚠️ FRAGILE (uses auto-detection)

Socket client doesn't explicitly specify URL. Works in dev by accident.

**Update file:** `src/lib/socketClient.ts` lines 15-22

**Current (AUTO-DETECT):**
```typescript
this.socket = io({
  query: { userId, workspaceId },
  // ... no URL
});
```

**Fix:**
```typescript
const socketUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000');

this.socket = io(socketUrl, {
  query: { userId, workspaceId },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
});
```

---

#### Issue #6: Missing .env.example
**Severity:** MEDIUM (Deployment will fail without env vars)
**Status:** ❌ MISSING

**Create file:** `.env.example`
```
# Database - Required
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname

# Socket.io - Required for production
SOCKET_IO_CORS_ORIGIN=https://your-app.up.railway.app

# Server - Optional (Railway sets defaults)
PORT=3000
NODE_ENV=production
```

**Add to .gitignore:**
```
.env.local
.env.*.local
```

**.env.example should be committed** (so others know what env vars are needed)

---

### 🟡 MAJOR - SHOULD FIX BEFORE DEPLOYING

#### Issue #7: Unused Socket API Route
**Severity:** MINOR (cleanup)
**Status:** ❌ NEEDS DELETION

The route at `src/app/api/socket/route.ts` is never used. Custom server handles everything.

**Delete:**
```bash
rm src/app/api/socket/route.ts
```

**Why:** Removes confusion and unnecessary code.

---

#### Issue #8: No Error Handling for Socket Failures
**Severity:** MEDIUM (UX issue)
**Status:** ❌ NOT IMPLEMENTED

If socket fails to connect, user gets no feedback.

**Fix:** Update `src/hooks/useSocket.ts`

```typescript
import { useEffect, useCallback, useRef, useState } from 'react';
import { socketClient } from '@/lib/socketClient';

interface UseSocketOptions {
  userId: string;
  workspaceId: string;
}

export function useSocket({ userId, workspaceId }: UseSocketOptions) {
  const isConnectingRef = useRef(false);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    socketClient.connect(userId, workspaceId);

    return () => {
      // Don't disconnect on unmount
    };
  }, [userId, workspaceId]);

  const on = useCallback((event: string, callback: Function) => {
    socketClient.on(event, callback);
    return () => socketClient.off(event, callback);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketClient.emit(event, data);
  }, []);

  const startTyping = useCallback((targetId?: string, groupId?: string) => {
    socketClient.startTyping(targetId, groupId);
  }, []);

  const stopTyping = useCallback((targetId?: string, groupId?: string) => {
    socketClient.stopTyping(targetId, groupId);
  }, []);

  const setTypingWithDebounce = useCallback(
    (targetId?: string, groupId?: string) => {
      socketClient.setTypingWithDebounce(targetId, groupId);
    },
    []
  );

  // Listen for errors
  useEffect(() => {
    const unsubscribe = on('error', (error: any) => {
      const message = error?.message || 'Socket connection error';
      setSocketError(message);
      console.error('Socket error:', message);
      // Auto-clear error after 5 seconds
      setTimeout(() => setSocketError(null), 5000);
    });
    return unsubscribe;
  }, [on]);

  return {
    isConnected: socketClient.isConnected(),
    socketError,
    on,
    emit,
    startTyping,
    stopTyping,
    setTypingWithDebounce,
    socketClient,
  };
}
```

---

### 🟠 MODERATE - NICE TO HAVE

#### Issue #9: No TypeScript Types for Events
**Severity:** OPTIONAL
**Status:** ℹ️ NICE TO HAVE

Improves type safety but not required for deployment.

**Create file:** `src/types/socket.ts` (optional)
```typescript
export interface SocketEventMap {
  'user:typing-start': { userId: string; targetId?: string; groupId?: string; timestamp: number };
  'user:typing-stop': { userId: string; targetId?: string; groupId?: string; timestamp: number };
  'user:online': { userId: string; timestamp: number; socketId?: string };
  'user:offline': { userId: string; timestamp: number };
  'online-users': { onlineUsers: string[]; timestamp: number };
  'message:new': { id: string; userId: string; content: string; timestamp: number };
  'message:status-update': { messageId: string; status: 'sent' | 'delivered' | 'read' };
  'message:deleted': { messageId: string };
  'connected': { userId: string; workspaceId: string; socketId: string };
}
```

---

#### Issue #10: No Structured Logging
**Severity:** OPTIONAL
**Status:** ℹ️ NICE TO HAVE

Current code uses `console.log` which is fine for small apps.

---

## Railway-Specific Workflow

### Step 1: Fix Code Locally (10 minutes)

```bash
# Terminal
cd /path/to/broadcast-hub

# Fix #1: Add tsx
bun add -D tsx

# Fix #3: Update scripts in package.json
# (edit: remove NODE_ENV= from start script)

# Fix #4: Update socketIO.ts CORS

# Fix #5: Update socketClient.ts with explicit URL

# Fix #6: Create .env.example

# Fix #7: Delete unused socket route
rm src/app/api/socket/route.ts

# Fix #2: Create SocketProvider
# Create the file and update providers.tsx

# Verify everything
bun install
bun run dev
```

**Test locally:**
- Open http://localhost:3000
- Open DevTools Console
- Should see socket connection success
- Open in 2 tabs
- Type in one, see "X is typing..." in other
- Refresh one tab, see online status update

### Step 2: Commit Changes

```bash
git add .
git commit -m "fix: prepare for railway deployment

- Add tsx to devDependencies
- Create SocketProvider component
- Fix socket.io CORS configuration
- Make socketClient URL explicit
- Add .env.example
- Remove unused socket API route
"
git push origin main
```

### Step 3: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Connect GitHub repository
4. Select `main` branch
5. Railway auto-detects Next.js + Node.js
6. Add environment variables:
   ```
   MONGODB_URI=mongodb+srv://[user]:[pass]@cluster.mongodb.net/whatsapp
   SOCKET_IO_CORS_ORIGIN=https://[your-app].up.railway.app
   NODE_ENV=production
   ```
7. Click Deploy
8. Wait 2-3 minutes
9. Get your URL from Railway dashboard

### Step 4: Verify Deployment

- Load https://[your-app].up.railway.app
- Check browser console for socket connection
- Test online status in 2 windows
- Test typing indicator
- Check Railway logs for errors

---

## Issue Summary for Railway

| # | Issue | Severity | Fix? | Notes |
|---|-------|----------|------|-------|
| 1 | tsx missing | 🔴 CRITICAL | ❌ | `bun add -D tsx` |
| 2 | No SocketProvider | 🔴 CRITICAL | ❌ | Create component |
| 3 | Bad start script | 🔴 CRITICAL | ⚠️ | Remove NODE_ENV= |
| 4 | CORS not set | 🔴 CRITICAL | ❌ | Add env var check |
| 5 | Socket URL implicit | 🟡 HIGH | ❌ | Make explicit |
| 6 | .env.example missing | 🟡 HIGH | ❌ | Create file |
| 7 | Unused socket route | 🟠 MINOR | ❌ | Delete file |
| 8 | No error handling | 🟠 MODERATE | ⚠️ | Nice to have |
| 9 | No event types | 🔵 OPTIONAL | ⚠️ | Not needed |
| 10 | No logging service | 🔵 OPTIONAL | ⚠️ | Not needed |

**Total blocking issues:** 5
**Total recommended fixes:** 3

---

## Quick Fix Checklist (Copy & Paste Order)

```bash
# 1. Add tsx
bun add -D tsx

# 2. Create SocketProvider
# Manually create src/components/SocketProvider.tsx (see above)

# 3. Update providers.tsx
# Manually add SocketProvider import and wrap children

# 4. Update package.json start script
# Remove NODE_ENV=production

# 5. Update socketIO.ts CORS
# Replace cors configuration (see above)

# 6. Update socketClient.ts URL
# Add explicit URL logic (see above)

# 7. Create .env.example
# Create file with content above

# 8. Delete unused route
rm src/app/api/socket/route.ts

# 9. Test locally
bun install
bun run dev

# 10. Commit
git add .
git commit -m "fix: prepare for railway deployment"
git push origin main
```

---

## Expected After Railway Deploy

✅ App loads at https://[app].up.railway.app
✅ Socket.io connects immediately
✅ Online status syncs across browser tabs
✅ Typing indicator works
✅ Messages send/receive in real-time
✅ No errors in Railway logs
✅ No CORS errors in browser console
✅ Cost ~$5-10/month

If all green, deployment is complete! 🎉
