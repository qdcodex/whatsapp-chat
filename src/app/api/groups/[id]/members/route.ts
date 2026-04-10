import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';

const GROUP_MEMBER_LIMIT = 1000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const { userId } = await req.json();
  const group = await GroupModel.findOne({ id } as any);
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (group.memberIds.length >= GROUP_MEMBER_LIMIT)
    return NextResponse.json({ error: `Group has reached the ${GROUP_MEMBER_LIMIT} member limit` }, { status: 400 });
  if (!group.memberIds.includes(userId)) {
    group.memberIds.push(userId);
    await group.save();
  }
  return NextResponse.json(group.toJSON());
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const { userId } = await req.json();
  const group = await GroupModel.findOneAndUpdate(
    { id } as any,
    { $pull: { memberIds: userId } } as any,
    { new: true } as any
  ).lean().exec();
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(group);
}
