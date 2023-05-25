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
  owner: {
    type: String,
    required: true
  },
  owner_username: {
    type: String,
    required: false
  },
  sended: {
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

