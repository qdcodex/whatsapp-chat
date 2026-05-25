import { Schema, model, models, type Document } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

interface IReplyTo {
  messageId?: string;
  text?: string;
  senderName?: string;
}

interface IForwardedFrom {
  senderName?: string;
  originalTimestamp?: number;
}

interface IMessage extends Document {
  id: string;
  adminId: string;
  workspaceId: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read';
  replyTo?: IReplyTo;
  forwardedFrom?: IForwardedFrom;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
}

const ReplyToSchema = new Schema<IReplyTo>({
  messageId:  String,
  text:       String,
  senderName: String,
}, { _id: false });

const ForwardedFromSchema = new Schema<IForwardedFrom>({
  senderName:        String,
  originalTimestamp: Number,
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  id:                { type: String, required: true, unique: true, index: true },
  adminId:           { type: String, required: true, index: true },
  workspaceId:       { type: String, required: true, index: true },
  senderId:          { type: String, required: true },
  recipientId:       String,
  groupId:           String,
  text:              String,
  imageUrl:          String,
  audioUrl:          String,
  audioDuration:     Number,
  timestamp:         { type: Number, required: true, index: true },
  status:            { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  replyTo:           ReplyToSchema,
  forwardedFrom:     ForwardedFromSchema,
  deletedFor:        [String],
  deletedForEveryone:{ type: Boolean, default: false },
}, { toJSON: { transform }, toObject: { transform } });

export const MessageModel = (models.Message || model<IMessage>('Message', MessageSchema)) as ReturnType<typeof model<IMessage>>;
