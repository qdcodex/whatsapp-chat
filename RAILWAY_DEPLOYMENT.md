# Railway Deployment Guide for Broadcast Hub

## Railway vs Fly.io Differences

| Feature | Railway | Fly.io |
|---------|---------|--------|
| Complexity | ✅ Simpler | More manual |
| WebSocket Support | ✅ Native | Native |
| Environment Setup | ✅ Web UI | CLI |
| GitHub Integration | ✅ Native | Manual |
| Pricing | Pay-as-you-go ($5 min) | Better scaling |
| Learning Curve | ✅ Easiest | Steeper |

**Railway is better for your use case because:**
- Automatic GitHub deployments
- Simple environment variable management
- No Dockerfile required (auto-detected)
- Built-in MongoDB integration (optional)

---

## Pre-Deployment Checklist

### ✅ Critical Fixes Needed (BLOCKING)

- [ ] **Add tsx to devDependencies** (MUST HAVE)
  ```bash
  bun add -D tsx
  ```

- [ ] **Create SocketProvider component** (socket won't connect otherwise)
  ```typescript
  // src/components/SocketProvider.tsx
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

- [ ] **Add to app/providers.tsx**
  ```typescript
  import { SocketProvider } from '@/components/SocketProvider';
  
  export function Providers({ children }: { children: React.ReactNode }) {
    return (
      <SocketProvider>
        <QueryClientProvider client={queryClient}>
          {/* ... rest of providers ... */}
        </QueryClientProvider>
      </SocketProvider>
    );
  }
  ```

- [ ] **Fix package.json scripts**
  ```json
  {
    "scripts": {
      "dev": "tsx watch server.ts",
      "build": "next build",
      "start": "tsx server.ts",
      "lint": "next lint",
      "test": "vitest run",
      "test:watch": "vitest"
    }
  }
  ```
  Remove `NODE_ENV=production` from start script (Railway sets it automatically)

### ⚠️ Important Fixes (Before Deploy)

- [ ] **Create .env.example**
  ```
  MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
  SOCKET_IO_CORS_ORIGIN=https://your-app.up.railway.app
  PORT=3000
  NODE_ENV=production
  ```

- [ ] **Fix CORS in src/lib/socketIO.ts**
  ```typescript
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN?.split(',') || 
            ['http://localhost:3000'],
    credentials: true,
  },
  ```

- [ ] **Update socketClient explicit URL**
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

- [ ] **Delete unused socket API route**
  ```bash
  rm src/app/api/socket/route.ts
  ```

### ℹ️ Optional (Recommended)

- [ ] Create railway.toml for configuration
- [ ] Add .env.example to .gitignore (but commit .env.example)
- [ ] Add healthcheck endpoint
- [ ] Configure logging service

---

## Railway Deployment Steps

### Step 1: Prepare Repository

```bash
# Make sure all changes are committed
git add .
git commit -m "fix: prepare for railway deployment"
git push origin main
```

### Step 2: Create Railway Account & Project

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended)
3. Create new project

### Step 3: Connect GitHub

1. Click "Deploy from GitHub"
2. Authorize Railway to access your GitHub
3. Select your `broadcast-hub` repository
4. Select branch: `main`
5. Railway auto-detects Next.js with Node.js

### Step 4: Configure Environment Variables

In Railway Dashboard:

1. Click "Variables" tab
2. Add variables:

```
MONGODB_URI = mongodb+srv://[user]:[password]@[cluster].mongodb.net/whatsapp

SOCKET_IO_CORS_ORIGIN = https://[your-app-name].up.railway.app

NODE_ENV = production

PORT = 3000
```

**Where to get MongoDB URI:**
- Go to MongoDB Atlas
- Click "Connect" button
- Select "Connect your application"
- Copy connection string
- Replace `[password]` with your actual password

### Step 5: Deploy

1. Click "Deploy" button
2. Railway builds and deploys (2-3 minutes)
3. Get your public URL: `https://[random-name].up.railway.app`

### Step 6: Verify Deployment

```bash
# Test the app is running
curl https://[your-app-name].up.railway.app

# Check socket.io is working (view source or browser dev tools)
# Should see socket connected message in console
```

---

## Post-Deployment Verification

### ✅ Checklist

- [ ] App loads without errors
- [ ] Can log in
- [ ] Socket.io connects (check browser console for `Socket connected` message)
- [ ] Online status shows correctly
- [ ] Typing indicator works (open in 2 tabs, type in one)
- [ ] Messages send and receive
- [ ] No CORS errors in browser console
- [ ] No socket connection errors

### 🔍 Debugging on Railway

**View logs:**
```
Railway Dashboard → Your Project → Deployments → View Logs
```

**Common errors:**

**"Cannot GET /"**
- Next.js build failed
- Check Railway build logs

**"Socket.io not initialized"**
- custom server didn't start
- Check that `tsx` is in devDependencies
- Check server.ts is in root

**"CORS error"**
- SOCKET_IO_CORS_ORIGIN not set correctly
- Must match your Railway app URL exactly
- Check for typos (https:// not http://)

**"Connection refused"**
- Socket server not listening
- Check PORT environment variable
- Check logs for errors during initialization

**"ECONNREFUSED to MongoDB"**
- MONGODB_URI is invalid
- Check MongoDB Atlas IP whitelist allows Railway servers
- Test connection string locally first

---

## Railway Configuration (Optional)

Create `railway.toml` in root:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "bun run start"
healthcheckPath = "/"
healthcheckTimeout = 5

[env]
NODE_ENV = "production"
```

Or if you want to use Docker:

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN npm install -g bun && bun install

# Copy source
COPY . .

# Build
RUN bun run build

# Start
EXPOSE 3000
CMD ["bun", "run", "start"]
```

---

## MongoDB Atlas Setup (First Time)

### If you don't have MongoDB Atlas yet:

1. Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
2. Sign up (free tier)
3. Create a cluster (M0 free tier)
4. Wait 3-5 minutes for cluster to deploy
5. Click "Connect"
6. Select "Connect your application"
7. Choose Node.js driver
8. Copy connection string
9. Replace `<password>` with your password (NOT the account password, the database user password)
10. Use this as `MONGODB_URI`

### IP Whitelist for Railway

In MongoDB Atlas:
1. Go to Network Access
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (for development)
   - OR add Railway's IP range (harder to get)
4. Confirm

---

## Troubleshooting

### App builds but crashes immediately

**Check:**
1. Ensure `tsx` is in devDependencies
2. Ensure `server.ts` exists in root
3. Ensure `MONGODB_URI` is set and valid
4. Check Railway logs for specific error

**Test locally first:**
```bash
bun install
bun run dev
# Then bun run build && bun start
```

### Socket.io connects but events don't work

**Check:**
1. Both client and server see same `userId` and `workspaceId`
2. Browser console shows no CORS errors
3. Events match exactly (typo in event names?)
4. Check Railway logs for socket events being received

**Debug in browser:**
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
// Reload page
// Check console for detailed socket.io logs
```

### MongoDB connection fails

**Check:**
1. Connection string format is correct
2. Password is URL-encoded if it has special characters
3. IP whitelist includes Railway servers
4. Database user exists in MongoDB Atlas
5. Database name is correct

**Test connection:**
```bash
# Locally, before deploying
MONGODB_URI="your-connection-string" bun run dev
# Should not error on startup
```

### Typing indicator stuck or not working

**Check:**
1. Both tabs/devices connected to same workspace
2. Browser console shows no socket errors
3. Wait 10 seconds (server auto-stop)
4. Manually call `stopTyping()` in console:
   ```javascript
   // In browser console
   window.socketClient?.emit('user:typing-stop', { groupId: 'your-group-id' })
   ```

---

## Performance Tips for Railway

1. **Use MongoDB Atlas free tier** ($0 for up to 512MB)
2. **Enable caching** in Next.js
3. **Set min instances to 1** (scales up automatically)
4. **Monitor memory usage** in Railway dashboard
5. **Enable Railway's healthcheck** (auto-restarts dead instances)

---

## Monitoring & Logs

**Railway Dashboard Tabs:**

- **Logs**: Real-time server logs
- **Metrics**: CPU, memory, bandwidth usage
- **Variables**: Environment variables
- **Deployments**: History of all deployments
- **Settings**: Domain, restart, delete project

**Key Metrics to Watch:**

- Memory: Should stay <100MB
- CPU: Should stay <5% idle
- Bandwidth: Monitor for unusual spikes

---

## Next Steps After Deploy

1. **Custom domain** (optional)
   - Railway Dashboard → Settings → Custom Domain
   - Points to `https://[your-app-name].up.railway.app`
   - Add to SOCKET_IO_CORS_ORIGIN if different

2. **Enable Postgres** (optional, not needed for this app)
   - Already have MongoDB

3. **Set up alerts** (optional)
   - Railway → Settings → Alert Webhooks
   - Get notified on deployment failures

4. **Configure CI/CD** (optional)
   - Automatic deploys on git push
   - Railway does this by default!

---

## Rollback If Something Goes Wrong

**Revert to previous deployment:**

1. Railway Dashboard → Deployments
2. Click on previous successful deployment
3. Click "Redeploy"

**Or revert code:**
```bash
git revert [commit-hash]
git push origin main
# Railway auto-deploys
```

---

## Costs

Railway pricing (as of 2026):
- **Compute**: $0.00072/hour = ~$5-10/month for small app
- **MongoDB Atlas**: $0 (free tier up to 512MB)
- **Total monthly cost**: $5-15 (very cheap!)

---

## Final Verification

Before considering deployment complete:

✅ App loads at https://your-app.up.railway.app
✅ Socket.io connects (browser console shows no errors)
✅ Online status updates across tabs
✅ Typing indicator works
✅ Messages send/receive in real-time
✅ MongoDB connection works
✅ No 500 errors in Railway logs
✅ Environmental variables correctly set

If all ✅, deployment is successful!
