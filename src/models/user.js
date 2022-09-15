const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const jwtPrivateKey = 'secretkey'

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
