import { Schema, model, models, type Document, type Model } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

interface IWorkspace extends Document {
  id: string;
  slug: string;
  name: string;
  adminId: string;
  createdAt: number;
  globalChatEnabled?: boolean;
  messagingEnabled?: boolean;
  autoDeleteMessages?: boolean;
  autoDeleteDays?: number;
}

const WorkspaceSchema = new Schema<IWorkspace>({
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

export const WorkspaceModel = (models.Workspace || model<IWorkspace>('Workspace', WorkspaceSchema)) as Model<IWorkspace>;
