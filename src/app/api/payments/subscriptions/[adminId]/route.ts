import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';

export async function GET(_: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  return withDB(async () => {
    const { adminId } = await params;
    await connectDB();
    const sub = await AdminSubscriptionModel.findOne({ adminId }).lean().exec();
    if (!sub) return NextResponse.json(null);
    return NextResponse.json(sub);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ adminId: string }> }) {
  return withDB(async () => {
    const { adminId } = await params;
    await connectDB();
    const data = await req.json();
    const sub = await AdminSubscriptionModel.findOneAndUpdate(
      { adminId },
      { $set: data },
      { upsert: true, returnDocument: 'after' as const }
    ).lean().exec();
    return NextResponse.json(sub);
  });
}
