import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';
import { UserModel } from '@/lib/models/User';
import { forbidden, requireSession } from '@/lib/auth';

const GROUP_MEMBER_LIMIT = 1000;

// The group's admin (or superadmin) manages members. Regular users of the same
// workspace may add contacts to a group they belong to, as the dashboard allows.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const { userId } = await req.json();
    const group = await GroupModel.findOne({ id });
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const sameWorkspace = auth.workspaceId === group.workspaceId;
    const allowed =
      auth.role === 'superadmin' ||
      (auth.role === 'admin' && sameWorkspace) ||
      (auth.role === 'user' && sameWorkspace && group.memberIds.includes(auth.userId));
    if (!allowed) return forbidden();

    const member = await UserModel.findOne({ id: userId }, { workspaceId: 1 }).lean().exec();
    if (!member || member.workspaceId !== group.workspaceId) {
      return NextResponse.json({ error: 'User is not in this workspace' }, { status: 400 });
    }

    if (group.memberIds.length >= GROUP_MEMBER_LIMIT)
      return NextResponse.json({ error: `Group has reached the ${GROUP_MEMBER_LIMIT} member limit` }, { status: 400 });
    if (!group.memberIds.includes(userId)) {
      group.memberIds.push(userId);
      await group.save();
    }
    return NextResponse.json(group.toJSON());
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const { userId } = await req.json();
    const existing = await GroupModel.findOne({ id }, { workspaceId: 1 }).lean().exec();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (auth.role === 'admin' && auth.workspaceId !== existing.workspaceId) return forbidden();
    const group = await GroupModel.findOneAndUpdate(
      { id },
      { $pull: { memberIds: userId } },
      { returnDocument: 'after' as const }
    ).lean().exec();
    return NextResponse.json(group);
  });
}
