import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    const data = await req.json();

    const update: Record<string, any> = {};
    if ('deletedForEveryone' in data) {
      update.$set = { deletedForEveryone: true };
    } else if ('deletedFor' in data) {
      update.$addToSet = { deletedFor: data.deletedFor };
    } else if ('status' in data) {
      update.$set = { status: data.status };
    } else {
      update.$set = data;
    }

    const msg = await MessageModel.findOneAndUpdate({ id }, update, { returnDocument: 'after' as const }).lean().exec();
    if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(msg);
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    await MessageModel.deleteOne({ id });
    return NextResponse.json({ ok: true });
  });
}
