'use strict';

var mongoose = require('mongoose');

var userModel = function() {
    var userSchema = mongoose.Schema({
        email: {
            type: String,
            required: true,
            unique: true
        },
        role: {
            type: String,
        },
        name: {
            type: String
        }
    });

    return mongoose.model('User', userSchema);
};

module.exports = new userModel();
