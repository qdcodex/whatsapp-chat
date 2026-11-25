import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';
import { UserModel } from '@/lib/models/User';
import { newId, requireSession } from '@/lib/auth';
import { DEFAULT_BILLING_DAYS, formatFee, nextDueAfterPayment } from '@/lib/subscription';

// Only the superadmin records a payment (directly, or by confirming an admin's
// claim). Admins can't extend their own subscription.
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const { adminId, note } = await req.json();

    const admin = await UserModel.findOne({ id: adminId, role: 'admin' }, { displayName: 1, workspaceId: 1 }).lean().exec();
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const now = Date.now();
    const existing = await AdminSubscriptionModel.findOne({ adminId }).lean().exec();
    const cycleDays = existing?.billingCycleDays ?? DEFAULT_BILLING_DAYS;
    const amount = existing?.monthlyAmount ?? 0;
    const nextDue = nextDueAfterPayment(existing, now);
    const recordNote = typeof note === 'string' && note.trim() ? note.trim() : existing?.pendingClaim?.note;

    const record = { id: newId(), paidAt: now, amount, note: recordNote };

    const sub = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId },
      {
        $set: { adminName: admin.displayName, workspaceId: admin.workspaceId, lastPaidAt: now, nextDueAt: nextDue },
        $push: { history: { $each: [record], $position: 0 } },
        $unset: { pendingClaim: '' },
        $setOnInsert: { monthlyAmount: 0, billingCycleDays: DEFAULT_BILLING_DAYS, paymentActive: true },
      },
      { upsert: true, returnDocument: 'after' as const }
    ).lean().exec();

    const notification = await PaymentNotificationModel.create({
      id: newId(),
      adminId,
      adminName: admin.displayName,
      workspaceId: admin.workspaceId,
      message: `Payment recorded for ${admin.displayName}${amount > 0 ? ` (${formatFee(amount)})` : ''}, ${cycleDays}-day cycle. Next due: ${new Date(nextDue).toLocaleDateString('en-IN')}`,
      amount,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({ subscription: sub, notification: notification.toJSON() });
  });
}
