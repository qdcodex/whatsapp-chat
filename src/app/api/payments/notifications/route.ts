import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';
import { forbidden, newId, pick, requireSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'user') return NextResponse.json([]);
    await connectDB();
    const filter = auth.role === 'superadmin' ? {} : { adminId: auth.userId };
    const notifications = await PaymentNotificationModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    return NextResponse.json(notifications);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();
    if (auth.role === 'admin' && data.adminId !== auth.userId) return forbidden();
    const notif = await PaymentNotificationModel.create({
      ...pick(data, ['adminId', 'adminName', 'workspaceId', 'message', 'amount']),
      id: typeof data.id === 'string' ? data.id : newId(),
      read: false,
      createdAt: Date.now(),
    });
    return NextResponse.json(notif.toJSON(), { status: 201 });
  });
}

// Mark all read / clear all are superadmin inbox actions
export async function PATCH(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    await PaymentNotificationModel.updateMany({ read: false }, { read: true });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    await PaymentNotificationModel.deleteMany({});
    return NextResponse.json({ ok: true });
  });
}
