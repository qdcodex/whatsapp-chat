import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { GroupCreationRequestModel } from '@/lib/models/GroupCreationRequest';
import { UserModel } from '@/lib/models/User';
import { newId, requireSession } from '@/lib/auth';

// Superadmin reviews all requests; an admin sees only their own
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'user') return NextResponse.json([]);
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = {};
    if (searchParams.get('status')) filter.status = searchParams.get('status');
    if (auth.role === 'admin') filter.adminId = auth.userId;
    else if (searchParams.get('adminId')) filter.adminId = searchParams.get('adminId');
    const requests = await GroupCreationRequestModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    return NextResponse.json(requests);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();
    if (typeof data.groupName !== 'string' || !data.groupName.trim()) {
      return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    }
    const me = await UserModel.findOne({ id: auth.userId }, { displayName: 1 }).lean().exec();
    const requested: string[] = Array.isArray(data.memberIds) ? data.memberIds.filter((m: unknown) => typeof m === 'string') : [];
    const memberIds = requested.length
      ? (await UserModel.find({ id: { $in: requested }, workspaceId: auth.workspaceId }, { id: 1 }).lean().exec()).map((u) => u.id)
      : [];
    const request = await GroupCreationRequestModel.create({
      id: typeof data.id === 'string' ? data.id : newId(),
      adminId: auth.userId,
      adminName: me?.displayName ?? '',
      workspaceId: auth.workspaceId,
      groupName: data.groupName.trim(),
      description: typeof data.description === 'string' ? data.description : undefined,
      memberIds,
      status: 'pending',
      createdAt: Date.now(),
    });
    return NextResponse.json(request.toJSON(), { status: 201 });
  });
}
