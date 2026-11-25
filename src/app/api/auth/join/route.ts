import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';
import { GroupModel } from '@/lib/models/Group';
import { verifyOtp } from '@/lib/otpProvider';
import { isValidIndianMobile, normalizePhone, toIndianInternational } from '@/lib/phone';
import { hashPassword, newId, publicUser, randomPassword, setSessionCookie } from '@/lib/auth';

const GROUP_MEMBER_LIMIT = 1000;

// Public join-by-link: verify the phone by OTP, then reuse or create the user
// in the group's workspace, add them to the group and log them in.
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const { groupSlug, name, phone, otp } = await req.json();
    if (typeof groupSlug !== 'string' || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Enter your name' }, { status: 400 });
    }
    if (typeof phone !== 'string' || !isValidIndianMobile(phone) || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Enter your phone number and code' }, { status: 400 });
    }

    await connectDB();
    const group = await GroupModel.findOne({ slug: groupSlug });
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    if (!(await verifyOtp(toIndianInternational(phone), otp))) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const wanted = normalizePhone(phone);
    const withPhone = await UserModel.find({ phone: { $exists: true, $ne: '' } }).lean().exec();
    const existing = withPhone.find((u) => u.phone && normalizePhone(u.phone) === wanted);

    // An admin's number can't be used to join (that would log them in by OTP)
    if (existing && existing.role !== 'user') {
      return NextResponse.json(
        { error: 'This number belongs to an admin account. Admins sign in with username and password.' },
        { status: 409 }
      );
    }
    if (existing && existing.workspaceId !== group.workspaceId) {
      return NextResponse.json(
        { error: 'This phone number is already registered with another workspace' },
        { status: 409 }
      );
    }

    let user = existing;
    if (!user) {
      const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) || 'user';
      const created = await UserModel.create({
        id: newId(),
        username: `${base}_${newId().slice(0, 6)}`,
        password: await hashPassword(randomPassword()), // they sign in with OTP
        role: 'user',
        displayName: name.trim(),
        phone: wanted,
        workspaceId: group.workspaceId,
        adminId: group.adminId,
        createdAt: Date.now(),
      });
      user = created.toObject();
    }

    if (!group.memberIds.includes(user.id)) {
      if (group.memberIds.length >= GROUP_MEMBER_LIMIT) {
        return NextResponse.json({ error: `Group has reached the ${GROUP_MEMBER_LIMIT} member limit` }, { status: 400 });
      }
      group.memberIds.push(user.id);
      await group.save();
    }

    const res = NextResponse.json({ user: publicUser(user), group: group.toJSON() });
    await setSessionCookie(res, user);
    return res;
  });
}
