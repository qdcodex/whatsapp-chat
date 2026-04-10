import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const WorkspaceSchema = new Schema({
  id:                 { type: String, required: true, unique: true, index: true },
  slug:               { type: String, required: true, unique: true },
  name:               { type: String, required: true },
  adminId:            { type: String, required: true },
  createdAt:          { type: Number, required: true },
  globalChatEnabled:  { type: Boolean, default: false },
  messagingEnabled:   { type: Boolean, default: true },
  autoDeleteMessages: { type: Boolean, default: false },
  autoDeleteDays:     { type: Number, default: 7 },
}, { toJSON: { transform }, toObject: { transform } });

export const WorkspaceModel = models.Workspace || model('Workspace', WorkspaceSchema);
