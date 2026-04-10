import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const PaymentRecordSchema = new Schema({
  id:     { type: String, required: true },
  paidAt: { type: Number, required: true },
  amount: { type: Number, required: true },
  note:   String,
}, { _id: false });

const AdminSubscriptionSchema = new Schema({
  adminId:          { type: String, required: true, unique: true, index: true },
  adminName:        { type: String, required: true },
  workspaceId:      { type: String, required: true },
  monthlyAmount:    { type: Number, default: 0 },
  billingCycleDays: { type: Number, default: 28 },
  lastPaidAt:       Number,
  nextDueAt:        Number,
  history:          [PaymentRecordSchema],
  paymentActive:    { type: Boolean, default: true },
}, { toJSON: { transform }, toObject: { transform } });

export const AdminSubscriptionModel = models.AdminSubscription || model('AdminSubscription', AdminSubscriptionSchema);
