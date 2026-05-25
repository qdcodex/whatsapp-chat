import { Schema, model, models, type Document } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

interface IJoinRequest extends Document {
  id: string;
  groupId: string;
  name: string;
  phone?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

const JoinRequestSchema = new Schema<IJoinRequest>({
  id:        { type: String, required: true, unique: true, index: true },
  groupId:   { type: String, required: true, index: true },
  name:      { type: String, required: true },
  phone:     String,
  message:   String,
  status:    { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Number, required: true },
}, { toJSON: { transform }, toObject: { transform } });

export const JoinRequestModel = (models.JoinRequest || model<IJoinRequest>('JoinRequest', JoinRequestSchema)) as ReturnType<typeof model<IJoinRequest>>;
