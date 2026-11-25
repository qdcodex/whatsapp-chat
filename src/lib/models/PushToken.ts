import { Schema, model, models, type Document, type Model } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

// One row per device: an FCM token (Android app) or a Web Push subscription (browser)
interface IPushToken extends Document {
  userId: string;
  workspaceId?: string;
  platform: 'fcm' | 'web';
  token: string; // FCM token, or the Web Push endpoint URL
  keys?: { p256dh: string; auth: string }; // Web Push only
  createdAt: number;
  lastSeenAt: number;
}

const PushTokenSchema = new Schema<IPushToken>({
  userId:      { type: String, required: true, index: true },
  workspaceId: String,
  platform:    { type: String, enum: ['fcm', 'web'], required: true },
  token:       { type: String, required: true, unique: true },
  keys:        { p256dh: String, auth: String },
  createdAt:   { type: Number, required: true },
  lastSeenAt:  { type: Number, required: true },
}, { toJSON: { transform }, toObject: { transform } });

export const PushTokenModel = (models.PushToken || model<IPushToken>('PushToken', PushTokenSchema)) as Model<IPushToken>;
