import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const PaymentNotificationSchema = new Schema({
  id:          { type: String, required: true, unique: true, index: true },
  adminId:     { type: String, required: true, index: true },
  adminName:   { type: String, required: true },
  workspaceId: { type: String, required: true },
  message:     { type: String, required: true },
  amount:      Number,
  read:        { type: Boolean, default: false },
  createdAt:   { type: Number, required: true },
}, { toJSON: { transform }, toObject: { transform } });

export const PaymentNotificationModel = models.PaymentNotification || model('PaymentNotification', PaymentNotificationSchema);
