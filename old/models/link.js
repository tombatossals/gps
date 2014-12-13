'use strict';

var mongoose = require('mongoose');

var linkModel = function() {
    var linkSchema = new mongoose.Schema({
        distance: {
            type: String
        },
        saturation: {
            type: String
        },
        bandwidth: {
            type: String
        },
        network: {
            type: String
        },
        active: {
            type: Boolean
        },
        subscriptions : [{
            bandwidth: {
                type: Number
            },
            email: {
                type: String
            }
        }],
        nodes: [{
            id: {
                type: String
            },
            name: {
                type: String
            },
            iface: {
                type: String
            },
            ospf: {
                adjacency: String,
                state: String,
                stateChanges: Number
            }
        }],
    });
    return mongoose.model('Link', linkSchema);
};

module.exports = new linkModel();
