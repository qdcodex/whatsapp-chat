import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { canAccessWorkspace, forbidden, hashPassword, pick, publicUser, requireSession } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const user = await UserModel.findOne({ id }).lean().exec();
    if (!user || !canAccessWorkspace(auth, user.workspaceId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(publicUser(user));
  });
}

// Field-level rules: role, workspaceId, adminId and id can never be changed here.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const target = await UserModel.findOne({ id }).lean().exec();
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isSelf = auth.userId === id;
    const isWorkspaceAdmin =
      auth.role === 'admin' && target.role === 'user' && target.workspaceId === auth.workspaceId;
    const isSuperadmin = auth.role === 'superadmin';

    const allowed = new Set<string>();
    if (isSelf) ['displayName', 'avatar', 'phone'].forEach((k) => allowed.add(k));
    if (isWorkspaceAdmin) allowed.add('chatEnabled');
    if (isSuperadmin) ['displayName', 'avatar', 'phone', 'chatEnabled', 'password'].forEach((k) => allowed.add(k));
    if (allowed.size === 0) return forbidden();

    const body = await req.json();
    const update: Record<string, unknown> = pick(body, [...allowed]);

    if (typeof update.displayName === 'string') update.displayName = update.displayName.trim();
    if (update.chatEnabled !== undefined) update.chatEnabled = !!update.chatEnabled;
    if (typeof update.phone === 'string' && update.phone.trim()) {
      const phone = normalizePhone(update.phone);
      const others = await UserModel.find({ id: { $ne: id }, phone: { $exists: true, $ne: '' } }, { phone: 1 }).lean().exec();
      if (others.some((u) => u.phone && normalizePhone(u.phone) === phone)) {
        return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 409 });
      }
      update.phone = phone;
    }
    if (update.password !== undefined) {
      if (typeof update.password !== 'string' || update.password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      update.password = await hashPassword(update.password);
    }

    const user = await UserModel.findOneAndUpdate({ id }, update, { returnDocument: 'after' as const }).lean().exec();
    return NextResponse.json(publicUser(user!));
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const target = await UserModel.findOne({ id }).lean().exec();
    if (!target) return NextResponse.json({ ok: true });
    if (target.role === 'superadmin' || id === auth.userId) return forbidden();
    if (auth.role === 'admin' && !(target.role === 'user' && target.workspaceId === auth.workspaceId)) {
      return forbidden();
    }
    await UserModel.deleteOne({ id });
    return NextResponse.json({ ok: true });
  });
}
