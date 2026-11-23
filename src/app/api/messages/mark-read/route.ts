import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';
import { requireSession } from '@/lib/auth';

// Marks other people's messages in the caller's workspace as read
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const { ids } = await req.json();
    if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });
    const filter: Record<string, unknown> = {
      id: { $in: ids.filter((i: unknown) => typeof i === 'string') },
      status: { $ne: 'read' },
      senderId: { $ne: auth.userId },
    };
    if (auth.role !== 'superadmin') filter.workspaceId = auth.workspaceId;
    await MessageModel.updateMany(filter, { status: 'read' });
    return NextResponse.json({ ok: true });
  });
}
