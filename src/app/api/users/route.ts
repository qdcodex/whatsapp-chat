import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { forbidden, hashPassword, newId, publicUser, randomPassword, requireSession } from '@/lib/auth';
import { normalizePhone } from '@/lib/phone';

// Superadmin sees everyone; admins and users see only their own workspace
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const filter = auth.role === 'superadmin' ? {} : { workspaceId: auth.workspaceId };
    const users = await UserModel.find(filter).lean().exec();
    return NextResponse.json(users.map(publicUser));
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();

    const displayName = typeof data.displayName === 'string' ? data.displayName.trim() : '';
    const username = typeof data.username === 'string' ? data.username.trim() : '';
    if (!displayName || !username) {
      return NextResponse.json({ error: 'Name and username are required' }, { status: 400 });
    }

    // Who may create whom: superadmin creates admins (with a chosen password);
    // admins and users add regular users to their own workspace only.
    let role: 'admin' | 'user';
    let workspaceId: string | undefined;
    let adminId: string | undefined;
    let password: string;

    if (auth.role === 'superadmin') {
      role = data.role === 'admin' ? 'admin' : 'user';
      workspaceId = typeof data.workspaceId === 'string' ? data.workspaceId : undefined;
      adminId = typeof data.adminId === 'string' ? data.adminId : undefined;
      if (role === 'admin' && (typeof data.password !== 'string' || data.password.length < 6)) {
        return NextResponse.json({ error: 'Admin password must be at least 6 characters' }, { status: 400 });
      }
      password = role === 'admin' ? data.password : randomPassword();
    } else {
      if (data.role && data.role !== 'user') return forbidden();
      role = 'user';
      workspaceId = auth.workspaceId;
      if (auth.role === 'admin') {
        adminId = auth.userId;
      } else {
        const me = await UserModel.findOne({ id: auth.userId }).lean().exec();
        adminId = me?.adminId;
      }
      password = randomPassword(); // invited users sign in with phone OTP
    }

    let phone: string | undefined;
    if (typeof data.phone === 'string' && data.phone.trim()) {
      phone = normalizePhone(data.phone);
      const withPhone = await UserModel.find({ phone: { $exists: true, $ne: '' } }, { phone: 1 }).lean().exec();
      if (withPhone.some((u) => u.phone && normalizePhone(u.phone) === phone)) {
        return NextResponse.json({ error: 'A user with this phone number already exists' }, { status: 409 });
      }
    }

    // Keep the client's id when it's well-formed and unused (stores add the user optimistically)
    let id = typeof data.id === 'string' && /^[A-Za-z0-9_-]{6,40}$/.test(data.id) ? data.id : newId();
    if (await UserModel.exists({ id })) id = newId();

    const user = await UserModel.create({
      id,
      username,
      password: await hashPassword(password),
      role,
      displayName,
      phone,
      workspaceId,
      adminId,
      createdAt: Date.now(),
    });
    return NextResponse.json(publicUser(user.toObject()), { status: 201 });
  });
}
