import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { requireSession } from '@/lib/auth';

// Online status without a real-time server (works on Vercel): open apps check
// in here every ~20s, and fetch who else in their workspace checked in recently.
const RECENT_MS = 2 * 60_000;

// Check in: "I'm online now"
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    await UserModel.updateOne({ id: auth.userId }, { $set: { lastSeenAt: Date.now() } });
    return NextResponse.json({ ok: true });
  });
}

// Last check-in times of people in the caller's workspace who were seen recently.
// serverNow lets the browser correct for its own clock being off.
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const now = Date.now();
    const filter: Record<string, unknown> = { lastSeenAt: { $gt: now - RECENT_MS } };
    if (auth.role !== 'superadmin') filter.workspaceId = auth.workspaceId;
    const users = await UserModel.find(filter, { id: 1, lastSeenAt: 1 }).lean().exec();
    const lastSeen: Record<string, number> = {};
    for (const u of users) lastSeen[u.id] = u.lastSeenAt as number;
    return NextResponse.json({ serverNow: now, lastSeen });
  });
}
