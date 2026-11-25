import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';
import { GroupModel } from '@/lib/models/Group';
import { UserModel } from '@/lib/models/User';
import { forbidden, newId, pick, requireSession } from '@/lib/auth';
import { notifyNewMessage } from '@/lib/push';

const NONE = { $in: [null, ''] };
const PUSH_TIMEOUT_MS = 4000;

// Superadmin: everything (optionally filtered). Admin: their workspace's
// broadcast and group messages plus their own DMs. User: broadcasts, their own
// DMs and messages of groups they belong to.
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const { searchParams } = new URL(req.url);

    const filter: Record<string, unknown> = {};
    if (searchParams.get('groupId')) filter.groupId = searchParams.get('groupId');

    if (auth.role === 'superadmin') {
      if (searchParams.get('workspaceId')) filter.workspaceId = searchParams.get('workspaceId');
      if (searchParams.get('adminId')) filter.adminId = searchParams.get('adminId');
    } else {
      filter.workspaceId = auth.workspaceId;
      const mine = [{ senderId: auth.userId }, { recipientId: auth.userId }];
      if (auth.role === 'admin') {
        filter.$or = [{ recipientId: NONE }, ...mine];
      } else {
        const myGroups = (await GroupModel.find({ workspaceId: auth.workspaceId, memberIds: auth.userId }, { id: 1 }).lean().exec()).map((g) => g.id);
        filter.$or = [
          { recipientId: NONE, groupId: NONE },
          { groupId: { $in: myGroups } },
          ...mine,
        ];
      }
    }

    const messages = await MessageModel.find(filter).sort({ timestamp: 1 }).lean().exec();
    return NextResponse.json(messages);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'user']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();

    // Sender, workspace and admin always come from the session, never the body
    const me = await UserModel.findOne({ id: auth.userId }, { adminId: 1 }).lean().exec();
    const adminId = auth.role === 'admin' ? auth.userId : me?.adminId;

    if (typeof data.groupId === 'string' && data.groupId) {
      const group = await GroupModel.findOne({ id: data.groupId }, { workspaceId: 1, adminId: 1, memberIds: 1 }).lean().exec();
      const inGroup = group && group.workspaceId === auth.workspaceId &&
        (group.adminId === auth.userId || group.memberIds?.includes(auth.userId));
      if (!inGroup) return forbidden('Not a member of this group');
    }
    if (typeof data.recipientId === 'string' && data.recipientId) {
      const recipient = await UserModel.findOne({ id: data.recipientId }, { workspaceId: 1 }).lean().exec();
      if (!recipient || recipient.workspaceId !== auth.workspaceId) return forbidden('Recipient not in your workspace');
    }

    const id = typeof data.id === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(data.id) ? data.id : newId();
    const message = await MessageModel.create({
      ...pick(data, ['recipientId', 'groupId', 'text', 'imageUrl', 'audioUrl', 'audioDuration', 'replyTo', 'forwardedFrom']),
      id,
      senderId: auth.userId,
      workspaceId: auth.workspaceId,
      adminId,
      timestamp: Date.now(),
      status: 'sent',
    });

    // Awaited (serverless hosts stop work after the response), but capped so a
    // slow push service never delays the chat by more than a few seconds
    const saved = message.toJSON();
    await Promise.race([
      notifyNewMessage(saved).catch((err) => console.warn('[push] notify failed:', err?.message ?? err)),
      new Promise((resolve) => setTimeout(resolve, PUSH_TIMEOUT_MS)),
    ]);

    return NextResponse.json(saved, { status: 201 });
  });
}
