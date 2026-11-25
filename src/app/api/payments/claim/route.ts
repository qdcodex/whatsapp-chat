import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';
import { PaymentNotificationModel } from '@/lib/models/PaymentNotification';
import { UserModel } from '@/lib/models/User';
import { newId, requireSession } from '@/lib/auth';
import { formatFee } from '@/lib/subscription';

// Admin: "I've paid" — tells the superadmin, who confirms it (which records the
// payment) or rejects it. Nothing about the due date changes until confirmed.
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const { note } = await req.json().catch(() => ({}));

    const sub = await AdminSubscriptionModel.findOne({ adminId: auth.userId }).lean().exec();
    if (!sub || sub.paymentActive === false || !(sub.monthlyAmount && sub.monthlyAmount > 0)) {
      return NextResponse.json({ error: 'No payment is required right now' }, { status: 400 });
    }
    if (sub.pendingClaim) {
      return NextResponse.json({ error: 'Your previous payment is still waiting for confirmation' }, { status: 409 });
    }

    const me = await UserModel.findOne({ id: auth.userId }, { displayName: 1 }).lean().exec();
    const now = Date.now();
    const claim = {
      id: newId(),
      claimedAt: now,
      amount: sub.monthlyAmount,
      note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 200) : undefined,
    };
    const updated = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId: auth.userId },
      { $set: { pendingClaim: claim } },
      { returnDocument: 'after' as const }
    ).lean().exec();

    await PaymentNotificationModel.create({
      id: newId(),
      adminId: auth.userId,
      adminName: me?.displayName ?? '',
      workspaceId: auth.workspaceId,
      message: `${me?.displayName ?? 'An admin'} says they paid ${formatFee(claim.amount)}${claim.note ? ` (${claim.note})` : ''}. Confirm it in Payments.`,
      amount: claim.amount,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({ subscription: updated });
  });
}

// Superadmin: reject a claim that didn't arrive
export async function DELETE(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const { adminId } = await req.json();
    const updated = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId },
      { $unset: { pendingClaim: '' } },
      { returnDocument: 'after' as const }
    ).lean().exec();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ subscription: updated });
  });
}
