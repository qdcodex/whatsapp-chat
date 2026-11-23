import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { hashPassword, isHashed, publicUser, setSessionCookie, verifyPassword } from '@/lib/auth';

// Basic brute-force guard: 10 failures per username locks it for 15 minutes
const MAX_FAILURES = 10;
const LOCK_MS = 15 * 60_000;
const failures = new Map<string, { count: number; until: number }>();

async function seedSuperadmin() {
  if ((await UserModel.estimatedDocumentCount()) > 0) return;
  await UserModel.create({
    id: 'sa-1',
    username: 'superadmin',
    password: await hashPassword('admin123'),
    role: 'superadmin',
    displayName: 'Super Admin',
    createdAt: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const { username, password } = await req.json();
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return NextResponse.json({ error: 'Enter username and password' }, { status: 400 });
    }

    const key = username.toLowerCase();
    const f = failures.get(key);
    if (f && f.until > Date.now()) {
      return NextResponse.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });
    }

    await connectDB();
    await seedSuperadmin();
    const user = await UserModel.findOne({ username }).select('+password').lean().exec();

    if (!user || !(await verifyPassword(password, user.password))) {
      const previous = f && f.until <= Date.now() && f.until !== 0 ? 0 : f?.count ?? 0;
      const count = previous + 1;
      failures.set(key, { count, until: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    failures.delete(key);

    // Upgrade legacy plaintext passwords to a hash on first successful login
    if (!isHashed(user.password)) {
      await UserModel.updateOne({ id: user.id }, { password: await hashPassword(password) });
    }

    const res = NextResponse.json(publicUser(user));
    await setSessionCookie(res, user);
    return res;
  });
}
