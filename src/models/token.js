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