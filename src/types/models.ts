/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { type Document, type Types } from 'mongoose'

export interface IUser {
  name: string
  email: string
  password: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId
  generateAuthToken: () => string
}

export interface IValidToken {
  token: string
  name?: string
}

export interface IValidTokenDocument extends IValidToken, Document {
  _id: Types.ObjectId
}

export interface IRoomMessage {
  message_id: string
  message: string
  user_name: string
  user_id?: string
  is_send_answer_to_club: boolean
  is_answerd?: boolean
  gpt_answer?: string
}

export interface IRoomMessageDocument extends IRoomMessage, Document {
  _id: Types.ObjectId
}

export interface IRoomUser {
  name: string
  user_id: number
  get_welcome: boolean
  leave: boolean
}

export interface IRoomUserDocument extends IRoomUser, Document {
  _id: Types.ObjectId
}

export interface UserValidationResult {
  error?: {
    details: Array<{ message: string }>
  }
  value: IUser
}
