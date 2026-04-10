import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const notif = await PaymentNotificationModel.findOneAndUpdate(
    { id } as any,
    { read: true } as any,
    { new: true } as any
  ).lean().exec();
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(notif);
}
