import { NextRequest, NextResponse } from 'next/server';
import { sendOtp, isOtpDevMode } from '@/lib/otpProvider';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { isValidIndianMobile, normalizePhone, toIndianInternational } from '@/lib/phone';

// Each SMS costs money, so the same number can't request a new code for 30s.
const RESEND_COOLDOWN_MS = 30_000;
const lastSent = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { phone, purpose } = await req.json();
    if (typeof phone !== 'string' || !isValidIndianMobile(phone)) {
      return NextResponse.json({ error: 'Enter a valid 10-digit mobile number' }, { status: 400 });
    }

    const key = normalizePhone(phone);

    // Don't spend an SMS on a login attempt for a number with no account
    if (purpose === 'login') {
      await connectDB();
      const users = await UserModel.find({ phone: { $exists: true, $ne: '' } }, { phone: 1 }).lean().exec();
      if (!users.some((u) => u.phone && normalizePhone(u.phone) === key)) {
        return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
      }
    }
    const now = Date.now();
    const previous = lastSent.get(key);
    if (previous && now - previous < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - previous)) / 1000);
      return NextResponse.json({ error: `Please wait ${wait}s before requesting another code` }, { status: 429 });
    }

    await sendOtp(toIndianInternational(phone));
    lastSent.set(key, now);
    return NextResponse.json({ sent: true, devMode: isOtpDevMode() });
  } catch (err: any) {
    console.error('[OTP send]', err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? 'Failed to send OTP' }, { status: 500 });
  }
}
