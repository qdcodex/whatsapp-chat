import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { WorkspaceModel } from '@/lib/models/Workspace';
import { newId, pick, requireSession } from '@/lib/auth';

// Superadmin sees every workspace; everyone else only their own
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const filter = auth.role === 'superadmin' ? {} : { slug: auth.workspaceId };
    const workspaces = await WorkspaceModel.find(filter).lean().exec();
    return NextResponse.json(workspaces);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();
    if (typeof data.slug !== 'string' || !data.slug || typeof data.adminId !== 'string') {
      return NextResponse.json({ error: 'slug and adminId are required' }, { status: 400 });
    }
    const id = typeof data.id === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(data.id) ? data.id : newId();
    const workspace = await WorkspaceModel.create({
      ...pick(data, ['slug', 'name', 'adminId', 'globalChatEnabled', 'messagingEnabled', 'autoDeleteMessages', 'autoDeleteDays']),
      id,
      createdAt: Date.now(),
    });
    return NextResponse.json(workspace.toJSON(), { status: 201 });
  });
}
