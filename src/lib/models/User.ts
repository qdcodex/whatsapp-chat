import { Schema, model, models, type Document, type Model } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

interface IUser extends Document {
  id: string;
  username: string;
  password: string;
  role: 'superadmin' | 'admin' | 'user';
  displayName: string;
  avatar?: string;
  phone?: string;
  workspaceId?: string;
  adminId?: string;
  createdAt: number;
  chatEnabled?: boolean;
}

const UserSchema = new Schema<IUser>({
  id:              { type: String, required: true, unique: true, index: true },
  username:        { type: String, required: true, unique: true },
  password:        { type: String, required: true },
  role:            { type: String, enum: ['superadmin', 'admin', 'user'], required: true },
  displayName:     { type: String, required: true },
  avatar:          String,
  phone:           String,
  workspaceId:     String,
  adminId:         String,
  createdAt:       { type: Number, required: true },
  chatEnabled:     Boolean,
}, { toJSON: { transform }, toObject: { transform } });

export const UserModel = (models.User || model<IUser>('User', UserSchema)) as Model<IUser>;
