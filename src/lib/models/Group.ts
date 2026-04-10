import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const GroupSchema = new Schema({
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

export const GroupModel = models.Group || model('Group', GroupSchema);
