'use strict';

var mongoose = require('mongoose');

var nodePublicInfoModel = function() {
    var nodePublicInfoSchema = mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        mainip: {
            type: String
        },
        latlng: {
            lat: Number,
            lng: Number
        },
        system: {
            type: String
        }
    });

    return mongoose.model('NodePublicInfo', nodePublicInfoSchema);
};

module.exports = new nodePublicInfoModel();
