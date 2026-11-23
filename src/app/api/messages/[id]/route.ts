import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';
import { canAccessWorkspace, forbidden, requireSession, type Session } from '@/lib/auth';

// Sender, the workspace admin, or superadmin may remove a message for everyone
const canModerate = (auth: Session, msg: { senderId: string; workspaceId: string }) =>
  msg.senderId === auth.userId ||
  auth.role === 'superadmin' ||
  (auth.role === 'admin' && auth.workspaceId === msg.workspaceId);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const existing = await MessageModel.findOne({ id }).lean().exec();
    if (!existing || !canAccessWorkspace(auth, existing.workspaceId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = await req.json();

    let update: Record<string, unknown>;
    if ('deletedForEveryone' in data) {
      if (!canModerate(auth, existing)) return forbidden();
      update = { $set: { deletedForEveryone: true } };
    } else if ('deletedFor' in data) {
      // "Delete for me" only ever hides it for the caller
      update = { $addToSet: { deletedFor: auth.userId } };
    } else if ('status' in data && (data.status === 'delivered' || data.status === 'read')) {
      update = { $set: { status: data.status } };
    } else {
      return NextResponse.json({ error: 'Unsupported update' }, { status: 400 });
    }

    const msg = await MessageModel.findOneAndUpdate({ id }, update, { returnDocument: 'after' as const }).lean().exec();
    return NextResponse.json(msg);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const existing = await MessageModel.findOne({ id }).lean().exec();
    if (!existing) return NextResponse.json({ ok: true });
    if (!canModerate(auth, existing)) return forbidden();
    await MessageModel.deleteOne({ id });
    return NextResponse.json({ ok: true });
  });
}
