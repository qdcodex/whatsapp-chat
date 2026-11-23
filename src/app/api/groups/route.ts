import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';
import { UserModel } from '@/lib/models/User';
import { forbidden, newId, requireSession } from '@/lib/auth';

const makeSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + newId().slice(0, 5).toLowerCase();

export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = {};
    if (auth.role === 'superadmin') {
      if (searchParams.get('workspaceId')) filter.workspaceId = searchParams.get('workspaceId');
    } else {
      filter.workspaceId = auth.workspaceId;
    }
    if (searchParams.get('adminId')) filter.adminId = searchParams.get('adminId');
    const groups = await GroupModel.find(filter).lean().exec();
    return NextResponse.json(groups);
  });
}

// An admin's first group is free; further groups go through superadmin approval
// (group-creation-requests), matching the dashboard flow.
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();
    if (typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json({ error: 'Group name required' }, { status: 400 });
    }
    if (await GroupModel.exists({ adminId: auth.userId })) {
      return forbidden('Additional groups need super admin approval');
    }

    // Only members from this admin's workspace
    const requested: string[] = Array.isArray(data.memberIds) ? data.memberIds.filter((m: unknown) => typeof m === 'string') : [];
    const valid = requested.length
      ? (await UserModel.find({ id: { $in: requested }, workspaceId: auth.workspaceId }, { id: 1 }).lean().exec()).map((u) => u.id)
      : [];

    const id = typeof data.id === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(data.id) ? data.id : newId();
    const slug = typeof data.slug === 'string' && /^[a-z0-9-]{3,80}$/.test(data.slug) && !(await GroupModel.exists({ slug: data.slug }))
      ? data.slug
      : makeSlug(data.name);

    const group = await GroupModel.create({
      id,
      name: data.name.trim(),
      description: typeof data.description === 'string' ? data.description : undefined,
      workspaceId: auth.workspaceId,
      adminId: auth.userId,
      memberIds: valid,
      slug,
      createdAt: Date.now(),
    });
    return NextResponse.json(group.toJSON(), { status: 201 });
  });
}
