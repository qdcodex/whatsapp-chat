import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { GroupCreationRequestModel } from '@/lib/models/GroupCreationRequest';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const filter: Record<string, unknown> = {};
  if (searchParams.get('status')) filter.status = searchParams.get('status');
  if (searchParams.get('adminId')) filter.adminId = searchParams.get('adminId');
  const requests = await GroupCreationRequestModel.find(filter as any).sort({ createdAt: -1 }).lean().exec();
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const data = await req.json();
  const request = await GroupCreationRequestModel.create(data);
  return NextResponse.json(request.toJSON(), { status: 201 });
}
