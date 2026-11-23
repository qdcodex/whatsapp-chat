import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { JoinRequestModel } from '@/lib/models/JoinRequest';
import { GroupModel } from '@/lib/models/Group';
import { forbidden, requireSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const existing = await JoinRequestModel.findOne({ id }).lean().exec();
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (auth.role === 'admin') {
      const group = await GroupModel.findOne({ id: existing.groupId }, { workspaceId: 1 }).lean().exec();
      if (!group || group.workspaceId !== auth.workspaceId) return forbidden();
    }
    const { status } = await req.json();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const request = await JoinRequestModel.findOneAndUpdate({ id }, { status }, { returnDocument: 'after' as const }).lean().exec();
    return NextResponse.json(request);
  });
}
