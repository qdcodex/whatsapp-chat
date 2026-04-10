import mongoose, { Schema, model, models } from 'mongoose';

const transform = (_: unknown, ret: Record<string, unknown>) => {
  delete ret._id;
  delete ret.__v;
  return ret;
};

const ReplyToSchema = new Schema({
  messageId:  String,
  text:       String,
  senderName: String,
}, { _id: false });

const ForwardedFromSchema = new Schema({
  senderName:        String,
  originalTimestamp: Number,
}, { _id: false });

const MessageSchema = new Schema({
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

export const MessageModel = models.Message || model('Message', MessageSchema);
