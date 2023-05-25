/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const mongoose = require('mongoose');

const validToken = new mongoose.Schema({
    token: {
        required: true,
        type: String
    },
    name: {
        required: false,
        type: String
    }
})

module.exports = mongoose.model('validToken', validToken)