import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';
import { forbidden, pick, requireSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { adminId } = await params;
    if (auth.role === 'admin' && adminId !== auth.userId) return forbidden();
    await connectDB();
    const sub = await AdminSubscriptionModel.findOne({ adminId }).lean().exec();
    return NextResponse.json(sub ?? null);
  });
}

// Fee, billing cycle and on/off are set by the superadmin only
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  return withDB(async () => {
    const auth = await requireSession(req, ['superadmin']);
    if (auth instanceof NextResponse) return auth;
    const { adminId } = await params;
    await connectDB();
    const update: Record<string, unknown> = pick(await req.json(), ['monthlyAmount', 'billingCycleDays', 'paymentActive', 'adminName', 'workspaceId']);

    // Billing starts as soon as a fee applies: the first payment is due right away
    // (paid in advance), with the usual grace period before messaging pauses.
    const existing = await AdminSubscriptionModel.findOne({ adminId }).lean().exec();
    const fee = (update.monthlyAmount as number | undefined) ?? existing?.monthlyAmount ?? 0;
    const active = (update.paymentActive as boolean | undefined) ?? existing?.paymentActive ?? true;
    if (fee > 0 && active && !existing?.nextDueAt) update.nextDueAt = Date.now();

    const sub = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId },
      { $set: update },
      { upsert: true, returnDocument: 'after' as const }
    ).lean().exec();
    return NextResponse.json(sub);
  });
}
