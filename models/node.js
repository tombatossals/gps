'use strict';

var mongoose = require('mongoose');

var nodeModel = function() {
    var nodeSchema = mongoose.Schema({
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
        connectedUsers: {
            type: Number
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
        alive: {
            type: Boolean
        },
        validated: {
            type: Boolean
        },
        system: {
            type: String
        },
        routing: {
            total: Number,
            active: Number,
            inactive: Number
        },
        sysinfo: {
            model: String,
            version: String,
            poe: String,
            firmware: String,
            uptime: String
        },
        ospf: {
            routerId: String,
            dijkstras: Number,
            state: String
        }
    });

    return mongoose.model('Node', nodeSchema);
};

module.exports = new nodeModel();
