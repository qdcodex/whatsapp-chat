import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const GroupCreationRequestSchema = new Schema({
  id:          { type: String, required: true, unique: true, index: true },
  adminId:     { type: String, required: true, index: true },
  adminName:   { type: String, required: true },
  workspaceId: { type: String, required: true },
  groupName:   { type: String, required: true },
  description: String,
  memberIds:   [String],
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt:   { type: Number, required: true },
}, { toJSON: { transform }, toObject: { transform } });

export const GroupCreationRequestModel = models.GroupCreationRequest || model('GroupCreationRequest', GroupCreationRequestSchema);
