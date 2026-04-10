import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';

export async function POST(req: NextRequest) {
  await connectDB();
  const { ids } = await req.json();
  await MessageModel.updateMany({ id: { $in: ids }, status: { $ne: 'read' } } as any, { status: 'read' } as any);
  return NextResponse.json({ ok: true });
}
