'use strict';

var mongoose = require("mongoose");

var supernodoModel = function() {
    var supernodoSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        email: {
            type: String
        },
        omnitikip: {
            type: String
        },
        mainip: {
            type: String
        },
        latlng: {
            lat: Number,
            lng: Number
        },
        interfaces: [ {
            name: String,
            address: String
        }],
        username: {
            type: String
        },
        password: {
            type: String
        },
        omnitik: {
            type: Boolean
        },
        validated: {
            type: Boolean
        },
        system: {
            type: String
        }
    });

    return mongoose.model("Supernodo", supernodoSchema);
}

module.exports = new supernodoModel();
