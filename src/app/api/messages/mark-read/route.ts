import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';

export async function POST(req: NextRequest) {
  return withDB(async () => {
    await connectDB();
    const { ids } = await req.json();
    await MessageModel.updateMany({ id: { $in: ids }, status: { $ne: 'read' } } as any, { status: 'read' } as any);
    return NextResponse.json({ ok: true });
  });
}
