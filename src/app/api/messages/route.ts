import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';

export async function GET(req: NextRequest) {
  return withDB(async () => {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filter: Record<string, unknown> = {};
    if (searchParams.get('workspaceId')) filter.workspaceId = searchParams.get('workspaceId');
    if (searchParams.get('groupId')) filter.groupId = searchParams.get('groupId');
    if (searchParams.get('adminId')) filter.adminId = searchParams.get('adminId');
    const messages = await MessageModel.find(filter as any).sort({ timestamp: 1 }).lean().exec();
    return NextResponse.json(messages);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    await connectDB();
    const data = await req.json();
    const message = await MessageModel.create(data);
    return NextResponse.json(message.toJSON(), { status: 201 });
  });
}
