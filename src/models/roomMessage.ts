import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IRoomMessage, IRoomMessageDocument } from '../types/models';

type RoomMessageModel = mongoose.Model<IRoomMessageDocument>;

const roomMessageSchema = new Schema<IRoomMessageDocument, RoomMessageModel>({
  message_id: {
    type: String,
    required: true,
    unique: true,
  },
  message: {
    type: String,
    required: true,
  },
  user_name: {
    type: String,
    required: true,
  },
  user_id: {
    type: String,
    required: false,
  },
  is_send_answer_to_club: {
    type: Boolean,
    required: true,
  },
  is_answerd: {
    type: Boolean,
    required: false,
  },
  gpt_answer: {
    type: String,
    required: false,
  },
});

const RoomMessage = mongoose.model<IRoomMessageDocument, RoomMessageModel>(
  'roomMessage',
  roomMessageSchema
);

export default RoomMessage;
