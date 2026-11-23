import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { JoinRequestModel } from '@/lib/models/JoinRequest';
import { GroupModel } from '@/lib/models/Group';
import { forbidden, newId, pick, requireSession } from '@/lib/auth';

// Join requests are an admin tool: admins see those for their workspace's groups
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'user') return NextResponse.json([]);
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = {};
    if (searchParams.get('status')) filter.status = searchParams.get('status');
    if (auth.role === 'admin') {
      const groupIds = (await GroupModel.find({ workspaceId: auth.workspaceId }, { id: 1 }).lean().exec()).map((g) => g.id);
      const wanted = searchParams.get('groupId');
      filter.groupId = wanted ? (groupIds.includes(wanted) ? wanted : '__none__') : { $in: groupIds };
    } else if (searchParams.get('groupId')) {
      filter.groupId = searchParams.get('groupId');
    }
    const requests = await JoinRequestModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    return NextResponse.json(requests);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();
    const group = await GroupModel.findOne({ id: data.groupId }, { workspaceId: 1 }).lean().exec();
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    if (auth.role === 'admin' && group.workspaceId !== auth.workspaceId) return forbidden();
    const request = await JoinRequestModel.create({
      ...pick(data, ['groupId', 'name', 'phone', 'message']),
      id: typeof data.id === 'string' ? data.id : newId(),
      status: 'pending',
      createdAt: Date.now(),
    });
    return NextResponse.json(request.toJSON(), { status: 201 });
  });
}
