import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { PushTokenModel } from '@/lib/models/PushToken';
import { requireSession } from '@/lib/auth';

// Saves this device's push token for the logged-in user. A token that was
// registered by another account on the same device moves to the new user.
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const body = await req.json();

    let update: Record<string, unknown>;
    if (body.platform === 'fcm' && typeof body.token === 'string' && body.token.length > 20) {
      update = { platform: 'fcm', token: body.token, keys: undefined };
    } else if (
      body.platform === 'web' &&
      typeof body.subscription?.endpoint === 'string' &&
      body.subscription.endpoint.startsWith('https://') &&
      typeof body.subscription?.keys?.p256dh === 'string' &&
      typeof body.subscription?.keys?.auth === 'string'
    ) {
      const { endpoint, keys } = body.subscription;
      update = { platform: 'web', token: endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
    } else {
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
    }

    await connectDB();
    const now = Date.now();
    await PushTokenModel.updateOne(
      { token: update.token },
      { $set: { ...update, userId: auth.userId, workspaceId: auth.workspaceId, lastSeenAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  });
}

// Called on logout so this device stops receiving the user's notifications
export async function DELETE(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { token } = await req.json();
    if (typeof token !== 'string') return NextResponse.json({ error: 'token required' }, { status: 400 });
    await connectDB();
    await PushTokenModel.deleteOne({ token, userId: auth.userId });
    return NextResponse.json({ ok: true });
  });
}
