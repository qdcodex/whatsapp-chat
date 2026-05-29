import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';

export async function GET() {
  return withDB(async () => {
    await connectDB();
    const notifications = await PaymentNotificationModel.find().sort({ createdAt: -1 }).lean().exec();
    return NextResponse.json(notifications);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    await connectDB();
    const data = await req.json();
    const notif = await PaymentNotificationModel.create(data);
    return NextResponse.json(notif.toJSON(), { status: 201 });
  });
}

export async function PATCH() {
  return withDB(async () => {
    await connectDB();
    await PaymentNotificationModel.updateMany({ read: false }, { read: true });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE() {
  return withDB(async () => {
    await connectDB();
    await PaymentNotificationModel.deleteMany({});
    return NextResponse.json({ ok: true });
  });
}
