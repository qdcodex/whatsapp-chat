import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { WorkspaceModel } from '@/lib/models/Workspace';

export async function GET() {
  return withDB(async () => {
    await connectDB();
    const workspaces = await WorkspaceModel.find().lean().exec();
    return NextResponse.json(workspaces);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    await connectDB();
    const data = await req.json();
    const workspace = await WorkspaceModel.create(data);
    return NextResponse.json(workspace.toJSON(), { status: 201 });
  });
}
