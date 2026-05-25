import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { MessageModel } from '@/lib/models/Message';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();

  const data = await req.json();

  // Build a proper Mongoose update object
  const update: Record<string, any> = {};

  if ('deletedForEveryone' in data) {
    // "Delete for everyone" — set the flag
    update.$set = { deletedForEveryone: true };
  } else if ('deletedFor' in data) {
    // "Delete for me" — push userId into the array (avoid duplicates)
    update.$addToSet = { deletedFor: data.deletedFor };
  } else if ('status' in data) {
    // Status updates (sent/delivered/read)
    update.$set = { status: data.status };
  } else {
    // Generic field update
    update.$set = data;
  }

  const msg = await MessageModel.findOneAndUpdate(
    { id } as any,
    update,
    { new: true } as any
  )
    .lean()
    .exec();

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(msg);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await connectDB();
  await MessageModel.deleteOne({ id } as any);
  return NextResponse.json({ ok: true });
}
