/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
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