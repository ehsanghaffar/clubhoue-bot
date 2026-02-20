import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IRoomUser, IRoomUserDocument } from '../types/models';

type RoomUserModel = mongoose.Model<IRoomUserDocument>;

const roomUserSchema = new Schema<IRoomUserDocument, RoomUserModel>({
  name: {
    type: String,
    required: true,
  },
  user_id: {
    type: Number,
    required: true,
  },
  get_welcome: {
    type: Boolean,
    required: true,
  },
  leave: {
    type: Boolean,
    required: true,
  },
});

const RoomUser = mongoose.model<IRoomUserDocument, RoomUserModel>(
  'roomUser',
  roomUserSchema
);

export default RoomUser;
