const { boolean } = require('joi');
const mongoose = require('mongoose');

const roomMessageSchema = new mongoose.Schema({
  message_id: {
    type: String,
    required: true,
    unique: true
  },
  message: {
    type: String,
    required: true
  },
  owner: {
    type: String,
    required: true
  },
  sended: {
    type: Boolean,
    required: true
  },
  gpt_answer: {
    type: String,
    required: false
  }
})

module.exports = mongoose.model('roomMessage', roomMessageSchema)

