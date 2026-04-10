import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const filter: Record<string, unknown> = {};
  if (searchParams.get('workspaceId')) filter.workspaceId = searchParams.get('workspaceId');
  if (searchParams.get('adminId')) filter.adminId = searchParams.get('adminId');
  const groups = await GroupModel.find(filter as any).lean().exec();
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const data = await req.json();
  const group = await GroupModel.create(data);
  return NextResponse.json(group.toJSON(), { status: 201 });
}
