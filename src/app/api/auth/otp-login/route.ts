import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { verifyOtp } from '@/lib/otpProvider';
import { isValidIndianMobile, normalizePhone, toIndianInternational } from '@/lib/phone';
import { publicUser, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const { phone, otp } = await req.json();
    if (typeof phone !== 'string' || !isValidIndianMobile(phone) || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Enter your phone number and code' }, { status: 400 });
    }
    if (!(await verifyOtp(toIndianInternational(phone), otp))) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    await connectDB();
    const wanted = normalizePhone(phone);
    const users = await UserModel.find({ phone: { $exists: true, $ne: '' } }).lean().exec();
    const user = users.find((u) => u.phone && normalizePhone(u.phone) === wanted);
    if (!user) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
    }
    // Admin and superadmin accounts may only use username + password
    if (user.role !== 'user') {
      return NextResponse.json({ error: 'Admins sign in with username and password' }, { status: 403 });
    }

    const res = NextResponse.json(publicUser(user));
    await setSessionCookie(res, user);
    return res;
  });
}
