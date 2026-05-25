import { Schema, model, models, type Document } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

interface IPaymentRecord {
  id: string;
  paidAt: number;
  amount: number;
  note?: string;
}

interface IAdminSubscription extends Document {
  adminId: string;
  adminName: string;
  workspaceId: string;
  monthlyAmount?: number;
  billingCycleDays?: number;
  lastPaidAt?: number;
  nextDueAt?: number;
  history: IPaymentRecord[];
  paymentActive?: boolean;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>({
  id:     { type: String, required: true },
  paidAt: { type: Number, required: true },
  amount: { type: Number, required: true },
  note:   String,
}, { _id: false });

const AdminSubscriptionSchema = new Schema<IAdminSubscription>({
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

export const AdminSubscriptionModel = (models.AdminSubscription || model<IAdminSubscription>('AdminSubscription', AdminSubscriptionSchema)) as ReturnType<typeof model<IAdminSubscription>>;
