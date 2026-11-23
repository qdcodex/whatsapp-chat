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
    const update = pick(await req.json(), ['monthlyAmount', 'billingCycleDays', 'paymentActive', 'adminName', 'workspaceId']);
    const sub = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId },
      { $set: update },
      { upsert: true, returnDocument: 'after' as const }
    ).lean().exec();
    return NextResponse.json(sub);
  });
}
