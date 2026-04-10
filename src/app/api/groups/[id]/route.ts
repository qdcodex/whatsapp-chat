import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';
import { JoinRequestModel } from '@/lib/models/JoinRequest';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const group = await GroupModel.findOne({ id } as any).lean().exec();
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(group);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const data = await req.json();
  const group = await GroupModel.findOneAndUpdate({ id } as any, data as any, { new: true } as any).lean().exec();
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(group);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  await GroupModel.deleteOne({ id } as any);
  await JoinRequestModel.deleteMany({ groupId: id } as any);
  return NextResponse.json({ ok: true });
}
