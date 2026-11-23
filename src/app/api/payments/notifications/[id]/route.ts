import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';
import { requireSession } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { id } = await params;
    await connectDB();
    const notif = await PaymentNotificationModel.findOneAndUpdate(
      { id },
      { read: true },
      { returnDocument: 'after' as const }
    ).lean().exec();
    if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(notif);
  });
}
