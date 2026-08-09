/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import mongoose, { Schema } from 'mongoose'
import type { IValidTokenDocument } from '../types/models.js'

type ValidTokenModel = mongoose.Model<IValidTokenDocument>

const validTokenSchema = new Schema<IValidTokenDocument, ValidTokenModel>({
  token: {
    required: true,
    type: String
  },
  name: {
    required: false,
    type: String
  }
})

const ValidToken = mongoose.model<IValidTokenDocument, ValidTokenModel>(
  'validToken',
  validTokenSchema
)

export default ValidToken
