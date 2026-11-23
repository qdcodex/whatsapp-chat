import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';
import { JoinRequestModel } from '@/lib/models/JoinRequest';
import { canAccessWorkspace, forbidden, pick, requireSession, type Session } from '@/lib/auth';

const canManage = (auth: Session, workspaceId: string) =>
  auth.role === 'superadmin' || (auth.role === 'admin' && auth.workspaceId === workspaceId);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const group = await GroupModel.findOne({ id }).lean().exec();
    if (!group || !canAccessWorkspace(auth, group.workspaceId)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(group);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const group = await GroupModel.findOne({ id }).lean().exec();
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManage(auth, group.workspaceId)) return forbidden();

    const update = pick(await req.json(), ['name', 'description', 'mutedMemberIds']);
    const updated = await GroupModel.findOneAndUpdate({ id }, update, { returnDocument: 'after' as const }).lean().exec();
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const group = await GroupModel.findOne({ id }).lean().exec();
    if (!group) return NextResponse.json({ ok: true });
    if (!canManage(auth, group.workspaceId)) return forbidden();
    await GroupModel.deleteOne({ id });
    await JoinRequestModel.deleteMany({ groupId: id });
    return NextResponse.json({ ok: true });
  });
}
