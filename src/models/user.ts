import mongoose, { Schema, Document, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import type { IUser, IUserDocument, UserValidationResult } from '../types/models';

const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
if (!jwtPrivateKey) {
  throw new Error('JWT_PRIVATE_KEY environment variable is required');
}

interface UserModel extends mongoose.Model<IUserDocument> {
  validateUser(user: unknown): UserValidationResult;
}

const userSchema = new Schema<IUserDocument, UserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

userSchema.methods.generateAuthToken = function (this: IUserDocument): string {
  const token = jwt.sign({ _id: this._id.toString() }, jwtPrivateKey as string);
  return token;
};

const validate = (user: unknown): UserValidationResult => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  return schema.validate(user) as UserValidationResult;
};

const User = mongoose.model<IUserDocument, UserModel>('user', userSchema);

export { User, validate };
