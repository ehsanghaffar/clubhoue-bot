/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
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
  user_name: {
    type: String,
    required: true
  },
  user_id: {
    type: String,
    required: false
  },
  is_send_answer_to_club: {
    type: Boolean,
    required: true
  },
  is_answerd: {
    type: Boolean,
    required: false
  },
  gpt_answer: {
    type: String,
    required: false
  }
})

module.exports = mongoose.model('roomMessage', roomMessageSchema)

