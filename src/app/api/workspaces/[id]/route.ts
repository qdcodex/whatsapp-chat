import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { WorkspaceModel } from '@/lib/models/Workspace';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    const ws = await WorkspaceModel.findOne({ id } as any).lean().exec();
    if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(ws);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    const data = await req.json();
    const ws = await WorkspaceModel.findOneAndUpdate({ id } as any, data as any, { new: true } as any).lean().exec();
    if (!ws) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(ws);
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    await WorkspaceModel.deleteOne({ id } as any);
    return NextResponse.json({ ok: true });
  });
}
