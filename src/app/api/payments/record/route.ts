import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_BILLING_DAYS = 28;
const generateId = () => Math.random().toString(36).substring(2, 15);

export async function POST(req: NextRequest) {
  await connectDB();
  const { adminId, adminName, workspaceId, note } = await req.json();

  const now = Date.now();
  const existing = await AdminSubscriptionModel.findOne({ adminId } as any);
  const cycleDays = existing?.billingCycleDays ?? DEFAULT_BILLING_DAYS;
  const amount = existing?.monthlyAmount ?? 0;
  const nextDue = now + cycleDays * MS_PER_DAY;

  const record = { id: generateId(), paidAt: now, amount, note };

  const sub = await AdminSubscriptionModel.findOneAndUpdate(
    { adminId } as any,
    {
      $set:   { adminName, workspaceId, lastPaidAt: now, nextDueAt: nextDue },
      $push:  { history: { $each: [record], $position: 0 } },
      $setOnInsert: { monthlyAmount: 0, billingCycleDays: DEFAULT_BILLING_DAYS, paymentActive: true },
    } as any,
    { upsert: true, new: true }
  ).lean().exec();

  const notification = await PaymentNotificationModel.create({
    id: generateId(),
    adminId,
    adminName,
    workspaceId,
    message: `${adminName} paid their subscription${amount > 0 ? ` ($${amount})` : ''} (${cycleDays}-day cycle). Next due: ${new Date(nextDue).toLocaleDateString()}`,
    amount,
    read: false,
    createdAt: now,
  });

  return NextResponse.json({ subscription: sub, notification: notification.toJSON() });
}
