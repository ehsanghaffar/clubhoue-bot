import mongoose, { Schema, Document, Types } from 'mongoose';
import type { IValidToken, IValidTokenDocument } from '../types/models';

type ValidTokenModel = mongoose.Model<IValidTokenDocument>;

const validTokenSchema = new Schema<IValidTokenDocument, ValidTokenModel>({
  token: {
    required: true,
    type: String,
  },
  name: {
    required: false,
    type: String,
  },
});

const ValidToken = mongoose.model<IValidTokenDocument, ValidTokenModel>(
  'validToken',
  validTokenSchema
);

export default ValidToken;
