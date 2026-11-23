import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { normalizePhone } from '@/lib/phone';
import { requireSession } from '@/lib/auth';

const MAX_PHONES = 5000;

// Given the phone numbers from an admin's address book, returns only the ones
// that belong to users of that admin's workspace, keyed by normalized number. Nothing about
// non-matching numbers is stored or returned.
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin']);
    if (auth instanceof NextResponse) return auth;
    const workspaceId = auth.workspaceId;
    const { phones } = await req.json();
    if (!Array.isArray(phones)) {
      return NextResponse.json({ error: 'phones must be an array' }, { status: 400 });
    }

    const wanted = new Set(
      phones
        .slice(0, MAX_PHONES)
        .filter((p): p is string => typeof p === 'string')
        .map(normalizePhone)
        .filter((p) => p.length === 10)
    );

    await connectDB();
    // Users belong to a single workspace, so only this workspace's users can be added to its groups
    const users = await UserModel.find(
      { workspaceId, role: 'user', phone: { $exists: true, $ne: '' } },
      { id: 1, displayName: 1, phone: 1 }
    )
      .lean()
      .exec();

    const matches: Record<string, { userId: string; displayName: string }> = {};
    for (const u of users) {
      const key = normalizePhone(u.phone as string);
      if (wanted.has(key)) matches[key] = { userId: u.id as string, displayName: u.displayName as string };
    }

    return NextResponse.json({ matches });
  });
}
