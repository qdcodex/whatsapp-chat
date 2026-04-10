import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { JoinRequestModel } from '@/lib/models/JoinRequest';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const filter: Record<string, unknown> = {};
  if (searchParams.get('groupId')) filter.groupId = searchParams.get('groupId');
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  const requests = await JoinRequestModel.find(filter as any).sort({ createdAt: -1 }).lean().exec();
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const data = await req.json();
  const request = await JoinRequestModel.create(data);
  return NextResponse.json(request.toJSON(), { status: 201 });
}
