'use strict';

var mongoose = require('mongoose');

var enlaceModel = function() {
    var enlaceSchema = new mongoose.Schema({
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

        supernodos: [{
            id: {
                type: String
            },
            name: {
                type: String
            },
            iface: {
                type: String
            }
        }],
    });
    return mongoose.model('Enlace', enlaceSchema);
};

module.exports = new enlaceModel();
