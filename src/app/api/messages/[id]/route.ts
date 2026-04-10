import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const data = await req.json();
  const msg = await MessageModel.findOneAndUpdate({ id } as any, data as any, { new: true } as any).lean().exec();
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(msg);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  await MessageModel.deleteOne({ id } as any);
  return NextResponse.json({ ok: true });
}
