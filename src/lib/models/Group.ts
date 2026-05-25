import { Schema, model, models, type Document, type Model } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

interface IGroup extends Document {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  adminId: string;
  memberIds: string[];
  mutedMemberIds?: string[];
  slug: string;
  createdAt: number;
}

const GroupSchema = new Schema<IGroup>({
  id:             { type: String, required: true, unique: true, index: true },
  name:           { type: String, required: true },
  description:    String,
  workspaceId:    { type: String, required: true, index: true },
  adminId:        { type: String, required: true, index: true },
  memberIds:      [String],
  mutedMemberIds: [String],
  slug:           { type: String, required: true, unique: true },
  createdAt:      { type: Number, required: true },
}, { toJSON: { transform }, toObject: { transform } });

export const GroupModel = (models.Group || model<IGroup>('Group', GroupSchema)) as Model<IGroup>;
