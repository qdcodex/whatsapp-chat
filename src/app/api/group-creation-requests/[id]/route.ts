import { NextRequest, NextResponse } from "next/server";
import { connectDB, withDB } from "@/lib/mongodb";
import { GroupCreationRequestModel } from "@/lib/models/GroupCreationRequest";
import { GroupModel } from "@/lib/models/Group";

const generateId = () => Math.random().toString(36).substring(2, 15);
const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
  "-" +
  generateId().substring(0, 5);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withDB(async () => {
    const { id } = await params;
    await connectDB();
    const { status } = await req.json();

    const gcr = await GroupCreationRequestModel.findOne({ id });
    if (!gcr || gcr.status !== "pending")
      return NextResponse.json({ error: "Not found or already processed" }, { status: 404 });

    gcr.status = status;
    await gcr.save();

    if (status === "approved") {
      const group = await GroupModel.create({
        id: generateId(),
        name: gcr.groupName,
        description: gcr.description,
        workspaceId: gcr.workspaceId,
        adminId: gcr.adminId,
        memberIds: gcr.memberIds,
        slug: generateSlug(gcr.groupName),
        createdAt: Date.now(),
      });
      return NextResponse.json({ request: gcr.toJSON(), group: group.toJSON() });
    }

    return NextResponse.json({ request: gcr.toJSON() });
  });
}
