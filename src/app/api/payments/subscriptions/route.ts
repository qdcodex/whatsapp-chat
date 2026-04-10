import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { AdminSubscriptionModel } from '@/lib/models/AdminSubscription';

export async function GET() {
  await connectDB();
  const subs = await AdminSubscriptionModel.find().lean().exec();
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const data = await req.json();
  const sub = await AdminSubscriptionModel.findOneAndUpdate(
    { adminId: data.adminId } as any,
    { $setOnInsert: data } as any,
    { upsert: true, new: true }
  ).lean().exec();
  return NextResponse.json(sub, { status: 201 });
}
