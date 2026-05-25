import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { JoinRequestModel } from '@/lib/models/JoinRequest';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    const data = await req.json();
    const request = await JoinRequestModel.findOneAndUpdate({ id }, data, { returnDocument: 'after' as const }).lean().exec();
    if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(request);
  });
}
