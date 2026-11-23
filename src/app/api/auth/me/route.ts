import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { clearSessionCookie, getSession, publicUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  return withDB(async () => {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    await connectDB();
    const user = await UserModel.findOne({ id: session.userId }).lean().exec();
    if (!user) {
      // Account was deleted: drop the stale cookie
      const res = NextResponse.json({ error: 'Not logged in' }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }
    return NextResponse.json(publicUser(user));
  });
}
