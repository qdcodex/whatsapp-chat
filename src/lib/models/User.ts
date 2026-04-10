import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const UserSchema = new Schema({
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

export const UserModel = models.User || model('User', UserSchema);
