import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { GroupModel } from '@/lib/models/Group';

// Minimal public info for the join-by-link page
export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  return withDB(async () => {
    const { slug } = await params;
    await connectDB();
    const group = await GroupModel.findOne({ slug }, { name: 1, description: 1, memberIds: 1 }).lean().exec();
    if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({
      name: group.name,
      description: group.description,
      memberCount: group.memberIds?.length ?? 0,
    });
  });
}
