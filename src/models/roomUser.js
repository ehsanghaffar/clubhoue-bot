const mongoose = require('mongoose');

const roomUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  user_id: {
    type: Number,
    required: true
  },
  get_welcome: {
    type: Boolean,
    required: true
  },
  leave: {
    type: Boolean,
    required: true
  }
})

module.exports = mongoose.model('roomUser', roomUserSchema)