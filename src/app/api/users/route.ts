import { NextRequest, NextResponse } from 'next/server';
import { connectDB, withDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models/User';

const DEFAULT_SUPERADMIN = {
  id: 'sa-1',
  username: 'superadmin',
  password: 'admin123',
  role: 'superadmin',
  displayName: 'Super Admin',
  createdAt: Date.now(),
};

export async function GET() {
  return withDB(async () => {
    await connectDB();
    const count = await UserModel.countDocuments();
    if (count === 0) {
      await UserModel.create(DEFAULT_SUPERADMIN);
    }
    const users = await UserModel.find().lean().exec();
    return NextResponse.json(users);
  });
}

export async function POST(req: NextRequest) {
  return withDB(async () => {
    await connectDB();
    const data = await req.json();
    const user = await UserModel.create(data);
    return NextResponse.json(user.toJSON(), { status: 201 });
  });
}
