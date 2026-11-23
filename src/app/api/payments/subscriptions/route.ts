import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';
import { forbidden, pick, requireSession } from '@/lib/auth';

// Superadmin sees all subscriptions; an admin only their own
export async function GET(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req);
    if (auth instanceof NextResponse) return auth;
    if (auth.role === 'user') return NextResponse.json([]);
    await connectDB();
    const filter = auth.role === 'superadmin' ? {} : { adminId: auth.userId };
    const subs = await AdminSubscriptionModel.find(filter).lean().exec();
    return NextResponse.json(subs);
  });
}

// Creates the subscription record if missing (never overwrites an existing one)
export async function POST(req: NextRequest) {
  return withDB(async () => {
    const auth = await requireSession(req, ['admin', 'superadmin']);
    if (auth instanceof NextResponse) return auth;
    await connectDB();
    const data = await req.json();
    if (auth.role === 'admin' && data.adminId !== auth.userId) return forbidden();
    const fields = auth.role === 'superadmin'
      ? ['adminId', 'adminName', 'workspaceId', 'monthlyAmount', 'billingCycleDays', 'paymentActive']
      : ['adminId', 'adminName', 'workspaceId'];
    const insert = pick(data, fields);
    if (auth.role === 'admin') insert.workspaceId = auth.workspaceId;
    const sub = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId: data.adminId },
      { $setOnInsert: insert },
      { upsert: true, returnDocument: 'after' as const }
    ).lean().exec();
    return NextResponse.json(sub, { status: 201 });
  });
}
