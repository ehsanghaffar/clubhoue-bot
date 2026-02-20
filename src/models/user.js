/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
if (!jwtPrivateKey) {
  throw new Error('JWT_PRIVATE_KEY environment variable is required');
}

const userSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id }, jwtPrivateKey);
  // const token = jwt.sign({ _id: this._id }, process.env.JWTPRIVATEKEY);
  return token;
}

const User = mongoose.model('user', userSchema);

const validate = (user) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().required(),
    password: Joi.string().required()
  });
  return schema.validate(user);
}

module.exports = { User, validate }
