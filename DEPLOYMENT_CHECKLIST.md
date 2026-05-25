# 🎯 Railway Deployment Checklist

Use this checklist to track your progress through deployment. Check off items as you complete them.

---

## 📝 Pre-Deployment (5 minutes)

- [ ] Read `QUICK_START_RAILWAY.md` (important!)
- [ ] All code fixes have been applied (see `DEPLOYMENT_SUMMARY.md`)
- [ ] Have MongoDB Atlas account ready (or create one)
- [ ] Have Railway account ready (or create one with GitHub)

---

## 💻 Local Setup (5 minutes)

### Install & Test
- [ ] Run `bun install` in project root
- [ ] Run `bun run dev`
- [ ] Open `http://localhost:3000` in browser
- [ ] Open DevTools (F12) → Console tab
- [ ] See "Socket connected" message (not red error)
- [ ] No red error messages in console
- [ ] App loads without 500 errors

### Test Socket Features
- [ ] Open `http://localhost:3000` in **Tab 1**
- [ ] Open `http://localhost:3000` in **Tab 2** (same or different user if logged in)
- [ ] Type message in **Tab 1** input field
- [ ] See "X is typing..." in **Tab 2** console or UI
- [ ] Stop typing in **Tab 1**
- [ ] Typing indicator disappears in **Tab 2** (within 3 seconds)
- [ ] Send message from **Tab 1**
- [ ] Message appears in **Tab 2**

If any ❌, check:
- [ ] Browser console for specific error message
- [ ] That `userId` and `workspaceId` are available (may not be if not logged in)
- [ ] That server.ts is running (look for "Ready on http://localhost:3000")

---

## 📤 Git & GitHub (3 minutes)

- [ ] All changes are staged: `git status` shows nothing
- [ ] Commit message is clear: `git log --oneline -1`
- [ ] Changes pushed to GitHub: `git push origin main` succeeded
- [ ] GitHub shows latest commit

**Commands:**
```bash
git add .
git commit -m "fix: prepare for railway deployment"
git push origin main
```

---

## 🌐 MongoDB Atlas Setup (5 minutes)

**If you already have MongoDB Atlas:**
- [ ] Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
- [ ] Select your cluster
- [ ] Click "Connect"
- [ ] Click "Drivers"
- [ ] Copy connection string
- [ ] Replace `<password>` with actual database user password
- [ ] Note the connection string (you'll need it for Railway)
- [ ] Go to "Network Access" tab
- [ ] Click "Add IP Address"
- [ ] Select "Allow access from anywhere" ✅
- [ ] Click "Confirm"

**If you DON'T have MongoDB Atlas:**
- [ ] Go to [mongodb.com/cloud](https://www.mongodb.com/cloud)
- [ ] Click "Create Free Account"
- [ ] Complete signup
- [ ] Create new cluster (M0 free tier)
- [ ] Wait for cluster to deploy (3-5 minutes)
- [ ] Complete the "Network Access" steps above
- [ ] Get connection string

**After setup:**
- [ ] Have your MongoDB connection string ready (save it somewhere safe)
- [ ] Replace `<password>` in the connection string with actual password
- [ ] Test locally: Set `MONGODB_URI` in `.env.local` and run `bun run dev`
- [ ] Check server startup: should say "Connected to MongoDB" (or similar, no error)

---

## 🚀 Railway Setup (5 minutes)

### Create Railway Account
- [ ] Go to [railway.app](https://railway.app)
- [ ] Click "Login" or "Sign Up"
- [ ] Choose "GitHub" (easiest)
- [ ] Authorize Railway to access your GitHub
- [ ] Confirm email if needed

### Create Project
- [ ] In Railway Dashboard, click "New Project"
- [ ] Click "Deploy from GitHub"
- [ ] Authorize Railway if prompted
- [ ] Search for "broadcast-hub"
- [ ] Select your `broadcast-hub` repository
- [ ] Click "Deploy"
- [ ] Wait for Railway to detect it's a Next.js project
- [ ] Wait for build to start (2-3 minutes)

### Add Environment Variables
After project is created and showing in dashboard:

- [ ] Click on your project/deployment
- [ ] Go to "Variables" tab
- [ ] Click "New Variable"
- [ ] Add `MONGODB_URI`
  - [ ] Paste your MongoDB connection string
  - [ ] Make sure `<password>` is replaced with actual password
- [ ] Click "New Variable"
- [ ] Add `SOCKET_IO_CORS_ORIGIN`
  - [ ] Leave empty for now (will get URL after first deploy)
  - [ ] Or set to: `https://[your-railway-app-name].up.railway.app`
  - [ ] (Railway will give you the app name after deploy)
- [ ] Click "New Variable"
- [ ] Add `NODE_ENV` = `production`
- [ ] Click "New Variable"
- [ ] Add `PORT` = `3000`

**Result:**
```
MONGODB_URI = mongodb+srv://user:password@cluster.mongodb.net/whatsapp
SOCKET_IO_CORS_ORIGIN = (leave empty for now)
NODE_ENV = production
PORT = 3000
```

---

## 🔨 Deployment (5 minutes)

### Start Deploy
- [ ] In Railway dashboard, look for "Deployments" tab
- [ ] If auto-deploy already happened, skip to verification
- [ ] If not, click "Deploy" or "Redeploy" button
- [ ] Watch build progress in logs
- [ ] Wait for "✅ Successfully deployed" message
- [ ] Get your public URL (e.g., `https://broadcast-hub-prod-abc123.up.railway.app`)

### Update SOCKET_IO_CORS_ORIGIN
Now that you have your Railway app URL:

- [ ] Go back to "Variables" tab
- [ ] Edit `SOCKET_IO_CORS_ORIGIN`
- [ ] Set value to your Railway URL: `https://[your-app-name].up.railway.app`
- [ ] Save
- [ ] **Redeploy** (Railway auto-deploys when vars change, but manually redeploy to be sure)
- [ ] Wait for "✅ Successfully deployed" again

---

## ✅ Production Verification (5 minutes)

### Test in Browser
- [ ] Get your Railway app URL from dashboard (e.g., `https://broadcast-hub-prod-xxx.up.railway.app`)
- [ ] Open that URL in browser
- [ ] App loads without 500 error ✅
- [ ] Open DevTools → Console
- [ ] See "Socket connected: {socketId}" ✅ (not red error)
- [ ] Open same URL in another tab
- [ ] Type in message input (Tab 1)
- [ ] See typing indicator (Tab 2) ✅
- [ ] Send message (Tab 1)
- [ ] Message appears (Tab 2) ✅
- [ ] No CORS errors in console ✅

### Check Railway Logs
- [ ] Railway Dashboard → Deployments → Latest
- [ ] Click "Logs" tab
- [ ] See "Ready on http://localhost:3000" ✅
- [ ] See "User [userId] connected to workspace [workspaceId]" ✅
- [ ] No red error messages ✅

### Test Features
- [ ] Refresh page → still connected to socket
- [ ] Log out → socket disconnects
- [ ] Log in → socket reconnects
- [ ] Messages persist (refresh page, messages still there)
- [ ] Online status shows correctly

---

## 🎉 Post-Deployment (5 minutes)

### Document
- [ ] Save your Railway app URL
- [ ] Save MongoDB connection string (already saved, don't lose it!)
- [ ] Add URL to `.env.example` in comments (optional)

### Cleanup
- [ ] Delete any local test files
- [ ] Review git log to ensure all commits are there

### Optional Setup
- [ ] Add custom domain (Railway → Settings → Custom Domain)
- [ ] Update SOCKET_IO_CORS_ORIGIN if using custom domain
- [ ] Set up alerts (Railway → Settings → Alert Webhooks)
- [ ] Configure auto-deploy (should be automatic)

---

## ❌ Troubleshooting Checklist

If something went wrong, check these:

### Local Testing Failed
- [ ] Does `bun install` complete without errors?
- [ ] Does `bun run dev` show "Ready on http://localhost:3000"?
- [ ] Is `tsx` in `package.json` devDependencies?
- [ ] Is `SocketProvider` in `src/app/providers.tsx`?
- [ ] Is socket URL explicit in `src/lib/socketClient.ts`?
- [ ] Are you logged in (so userId is available)?
- [ ] Is workspaceId set in your auth/workspace store?

**Fix:** Re-read `DEPLOYMENT_SUMMARY.md` section on what each fix does

### Railway Build Failed
- [ ] Check Railway Logs for specific error
- [ ] Is `tsx` in package.json? (Should be added automatically)
- [ ] Is `server.ts` in project root?
- [ ] Did you run `git push` after fixes?
- [ ] Is your git branch set to `main`?

**Fix:** Read "Railway Build Failed" section in `QUICK_START_RAILWAY.md`

### Can't Connect to MongoDB
- [ ] Is `MONGODB_URI` set in Railway Variables?
- [ ] Did you replace `<password>` with actual password?
- [ ] Is IP whitelist enabled in MongoDB Atlas? (Network Access → Allow from anywhere)
- [ ] Can you connect to MongoDB locally (test with `.env.local`)?

**Fix:** Read "MongoDB connection fails" section in `QUICK_START_RAILWAY.md`

### Socket Won't Connect in Production
- [ ] Is `SOCKET_IO_CORS_ORIGIN` set in Railway Variables?
- [ ] Does it match your Railway app URL exactly?
- [ ] Is it `https://` (not `http://`)?
- [ ] No trailing slash?
- [ ] Check Railway logs for CORS errors

**Fix:** Read "CORS error" section in `QUICK_START_RAILWAY.md`

### Socket Connects But Events Don't Work
- [ ] Are `userId` and `workspaceId` the same on all clients?
- [ ] Check browser console for errors (F12)
- [ ] Check Railway logs for socket events being received
- [ ] Are event names spelled exactly right?
- [ ] Are you in the same workspace/group?

**Fix:** Check socket.io debug logs: `localStorage.setItem('debug', 'socket.io-client:*')`

---

## 📞 If Still Stuck

1. **Check the guides:**
   - `QUICK_START_RAILWAY.md` — Step-by-step walkthrough
   - `RAILWAY_DEPLOYMENT.md` — Detailed explanations
   - `RAILWAY_ISSUES_CHECKLIST.md` — Specific issues

2. **Check logs:**
   - Browser Console (F12)
   - Railway Logs (Dashboard → Deployments → Logs)
   - Terminal output from `bun run dev`

3. **Enable debug logging:**
   ```javascript
   // In browser console
   localStorage.setItem('debug', 'socket.io-client:*');
   // Reload page
   // Check console for detailed socket.io logs
   ```

4. **Verify files exist:**
   ```bash
   # Should all exist:
   cat src/components/SocketProvider.tsx
   cat .env.example
   cat server.ts
   # Should have SocketProvider imported:
   cat src/app/providers.tsx
   ```

---

## ✅ Final Status

When all items are checked:

- ✅ Code is fixed and tested locally
- ✅ Changes committed and pushed to GitHub
- ✅ Deployed to Railway production
- ✅ All features verified in production
- ✅ Environment variables configured
- ✅ MongoDB connected
- ✅ Socket.io working
- ✅ Ready to use!

**Estimated total time:** 30-45 minutes
**Cost:** ~$5-15/month on Railway

**Congratulations! Your app is live! 🎉**

---

## 📅 Next Steps After Deployment

- [ ] Invite team members to test
- [ ] Monitor Railway dashboard for issues
- [ ] Check logs periodically
- [ ] Set up custom domain (optional)
- [ ] Add monitoring/alerts (optional)
- [ ] Plan database scaling (when you hit 512MB MongoDB limit)

---

**Deployment Checklist Complete!**

Print or save this file for future reference.
