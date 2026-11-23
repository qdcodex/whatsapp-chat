import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { WorkspaceModel } from '@/lib/models/Workspace';
import { canAccessWorkspace, forbidden, pick, requireSession } from '@/lib/auth';

// Settings a workspace's own admin may change; superadmin may also switch messaging and rename
const ADMIN_FIELDS = [
  'globalChatEnabled', 'autoDeleteMessages', 'autoDeleteDays',
  'adEnabled', 'adImageUrl', 'adTitle', 'adText', 'adLinkUrl',
];
const SUPERADMIN_FIELDS = [...ADMIN_FIELDS, 'messagingEnabled', 'name'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const ws = await WorkspaceModel.findOne({ id }).lean().exec();
    if (!ws || !canAccessWorkspace(auth, ws.slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(ws);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const ws = await WorkspaceModel.findOne({ id }).lean().exec();
    if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (auth.role === 'admin' && ws.slug !== auth.workspaceId) return forbidden();

    const body = await req.json();
    const update = pick(body, auth.role === 'superadmin' ? SUPERADMIN_FIELDS : ADMIN_FIELDS);
    const updated = await WorkspaceModel.findOneAndUpdate({ id }, update, { returnDocument: 'after' as const }).lean().exec();
    return NextResponse.json(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    await WorkspaceModel.deleteOne({ id });
    return NextResponse.json({ ok: true });
  });
}
