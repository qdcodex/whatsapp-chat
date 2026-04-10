import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { JoinRequestModel } from '@/lib/models/JoinRequest';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();
  const data = await req.json();
  const request = await JoinRequestModel.findOneAndUpdate({ id } as any, data as any, { new: true } as any).lean().exec();
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(request);
}
